// Copyright (c) Vidar Tonaas Fauske
// Distributed under the terms of the Modified BSD License.

/*

This module contains code for opening a new voila view.

*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer,
  IRouter
} from '@jupyterlab/application';

import {
  DOMUtils,
  ICommandPalette,
  InputDialog,
  MainAreaWidget,
  WidgetTracker,
  IWindowResolver
} from '@jupyterlab/apputils';

import * as apputilsExtension from '@jupyterlab/apputils-extension';

import { IStateDB, URLExt } from '@jupyterlab/coreutils';
import { ILatexTypesetter, IRenderMimeRegistry } from "@jupyterlab/rendermime";

import * as base from '@jupyter-widgets/base';

// We import only the version from the specific module in controls so that the
// controls code can be split and dynamically loaded in webpack.
import {
  JUPYTER_CONTROLS_VERSION
} from '@jupyter-widgets/controls/lib/version';

import {
  OutputModel, OutputView, OUTPUT_WIDGET_VERSION
} from './output';

import { WidgetRenderer } from '@jupyter-widgets/jupyterlab-manager';

import { TPhoilaWidgetRegistry, TVoilaTracker } from './tokens';

import { ClonedOutputArea } from './clones';
import { WidgetRegistry } from './registry';
import { VoilaView, VOLIA_MAINAREA_CLASS } from './widget';

import "../style/index.css";
import { VoilaSession } from './session';


const originalResolver = apputilsExtension.default.find(
  v => v.provides === IWindowResolver)!;


const WIDGET_VIEW_MIMETYPE = 'application/vnd.jupyter.widget-view+json';


const WIDGET_REGISTRY = new WidgetRegistry();

WIDGET_REGISTRY.register({
  name: '@jupyter-widgets/base',
  version: base.JUPYTER_WIDGETS_VERSION,
  exports: {
    WidgetModel: base.WidgetModel,
    WidgetView: base.WidgetView,
    DOMWidgetView: base.DOMWidgetView,
    DOMWidgetModel: base.DOMWidgetModel,
    LayoutModel: base.LayoutModel,
    LayoutView: base.LayoutView,
    StyleModel: base.StyleModel,
    StyleView: base.StyleView
  }
});

WIDGET_REGISTRY.register({
  name: '@jupyter-widgets/controls',
  version: JUPYTER_CONTROLS_VERSION,
  exports: () => {
    return new Promise((resolve, reject) => {
      (require as any).ensure(['@jupyter-widgets/controls'], (require: NodeRequire) => {
        resolve(require('@jupyter-widgets/controls'));
      },
      (err: any) => {
        reject(err);
      },
      '@jupyter-widgets/controls'
      );
    });
  }
});

WIDGET_REGISTRY.register({
  name: '@jupyter-widgets/output',
  version: OUTPUT_WIDGET_VERSION,
  exports: {OutputModel, OutputView}
});


const voilaViewPlugin: JupyterFrontEndPlugin<TVoilaTracker> = {
  id: 'phoila:voila-view',
  requires: [IRenderMimeRegistry],
  optional: [ICommandPalette, ILayoutRestorer, ILatexTypesetter],
  provides: TVoilaTracker,
  activate: (
    app: JupyterFrontEnd,
    rendermime: IRenderMimeRegistry,
    palette: ICommandPalette | null,
    restorer: ILayoutRestorer | null,
    typesetter: ILatexTypesetter | null
  ) => {
    // Workaround for https://github.com/jupyter-widgets/ipywidgets/issues/2253
    if (typesetter) {
      typesetter.typeset(document.createElement('div'));
    }
    const { commands, shell } = app;
    const sessions: {[key: string]: VoilaSession} = {};
    const tracker = new WidgetTracker<MainAreaWidget<VoilaView>>({namespace: 'phoila-views'});
    const cloneTracker = new WidgetTracker<MainAreaWidget<ClonedOutputArea>>({namespace: 'phoila-clones'});
    commands.addCommand(
      'phoila:open-new', {
        label: 'Open New Voila View',
        execute: async (args) => {
          const path = args['path'];
          const editable = args['editable'] as boolean | undefined || true;
          let ppromise: Promise<string>;
          if (!path || typeof path !== 'string') {
            ppromise = InputDialog.getText({
              title: 'Input notebook path to open',
              placeholder: 'Notebook path'
            }).then((result) => {
              if (result.button.accept && result.value) {
                return result.value;
              }
              throw new Error('No valid path');
            })
          } else {
            ppromise = Promise.resolve(path);
          }
          const nbPath = await ppromise;
          let session: VoilaSession;
          if (!sessions[nbPath]) {
            session = new VoilaSession(nbPath, WIDGET_REGISTRY, rendermime);
            sessions[nbPath] = session;
          } else {
            session = sessions[nbPath];
          }
          const existing = tracker.find(w => w.content.session === session);
          if (existing) {
            existing.activate();
            return;
          }
          // Open voila widget
          const view = new VoilaView(session);
          view.allowDrag = editable;
          view.id = DOMUtils.createDomID();
          view.title.label = nbPath;
          view.title.closable = true;
          view.title.iconClass = 'jp-VoilaIcon';
          view.cloned.connect((_, clone) => {
            cloneTracker.add(clone);
          });
          const w = new MainAreaWidget({
            content: view,
            // Uncomment to await full execution before revealing:
            // reveal: Promise.all([view.populated, view.connected])
          });
          w.addClass(VOLIA_MAINAREA_CLASS);
          tracker.add(w);
          shell.add(w);
        }
      }
    );

    commands.addCommand(
      'phoila:clone-output', {
        execute: args => {
          const nbPath = args['notebookPath'] as string
          let session = sessions[nbPath];
          if (!session) {
            session = new VoilaSession(nbPath, WIDGET_REGISTRY, rendermime);
            sessions[nbPath] = session;
          }
          const clone = new ClonedOutputArea({
            session,
            index: args['index'] as number
          });

          const widget = new MainAreaWidget({
            content: clone,
            reveal: session.populated,
          });
          widget.addClass(VOLIA_MAINAREA_CLASS);

          // Add the cloned output to the output widget tracker.
          cloneTracker.add(widget);
          shell.add(widget);
        }
      }
    )
    if (restorer) {
      void restorer.restore(tracker, {
        command: 'phoila:open-new',
        args: view => ({
          path: view.content.session.notebookPath,
        }),
        name: (view) => view.content.session.notebookPath,
        when: app.serviceManager.ready
      });
      void restorer.restore(cloneTracker, {
        command: 'phoila:clone-output',
        args: widget => ({
          notebookPath: widget.content.notebookPath,
          index: widget.content.index,
        }),
        name: widget => `${widget.content.notebookPath}:${widget.content.index}`,
        when: tracker.restored // After the notebook widgets (but not contents).
      });
    }

    if (palette) {
      palette.addItem({
        command: 'phoila:open-new',
        category: 'Voila',
      });
    }

    return tracker;
  },
  autoStart: true
};


const singlePattern = /^\/phoila\/single\/([^?]+)/

const magicKey = 'phoila-single-workspace';

const hideSidebarTabCss = `.p-Widget.p-TabBar.jp-SideBar.jp-mod-left {
  display: none;
  min-width: 0;
}`;


class CustomResolver implements IWindowResolver {
  readonly name = magicKey;
}

/**
 * Ensure we use our custom workspace name for single mode.
 */
const resolver: JupyterFrontEndPlugin<IWindowResolver> = {
  id: 'phoila:resolver',
  autoStart: true,
  provides: IWindowResolver,
  requires: [JupyterFrontEnd.IPaths, IRouter],
  activate: async (
    _: JupyterFrontEnd,
    paths: JupyterFrontEnd.IPaths,
    router: IRouter
  ) => {
    singlePattern
    const parsed = URLExt.parse(window.location.href);
    const path = parsed.pathname!.replace(paths.urls.base, '/');
    if (singlePattern.test(path)) {
      return new CustomResolver();
    }
    return originalResolver.activate(_, paths, router);
  }
};


const singleModePlugin: JupyterFrontEndPlugin<void> = {
  id: 'phoila:single-mode',
  requires: [IRouter, TVoilaTracker],
  optional: [IStateDB],
  activate: (
    app: JupyterFrontEnd,
    router: IRouter
  ) => {
    const { commands } = app;

    commands.addCommand('phoila:open-single', {
      execute: async (args) => {
        const match = (args as IRouter.ILocation).path.match(singlePattern);
        try {
          let path = decodeURI(match![1]);
            await commands.execute('phoila:open-new', { path, editable: false });
        } catch (error) {
          console.warn('Single notebook routing failed.', error);
        }
        commands.execute('application:set-mode', { mode: 'single-document' });
        const style = document.createElement('style');
        document.head.appendChild(style);
        (style.sheet as CSSStyleSheet).insertRule(hideSidebarTabCss);
      }
    });

    router.register({
      command: 'phoila:open-single',
      pattern: singlePattern,
    });
  },
  autoStart: true
}


/**
 * The widget manager provider.
 */
const phoilaWidgetManagerPlugin = {
  id: 'phoila:extended-widget-manager-plugin',
  requires: [IRenderMimeRegistry],
  provides: TPhoilaWidgetRegistry,
  activate: (app: JupyterFrontEnd, rendermime: IRenderMimeRegistry) => {

    // Add a placeholder widget renderer.
    rendermime.addFactory({
      safe: false,
      mimeTypes: [WIDGET_VIEW_MIMETYPE],
      createRenderer: options => new WidgetRenderer(options)
    }, 0);

    return {
      registerWidget(data: base.IWidgetRegistryData) {
        WIDGET_REGISTRY.register(data);
      }
    };
  },
  autoStart: true
};

/**
 * The widget manager provider.
 */
const standardWidgetManagerPlugin = {
  id: 'phoila:widget-manager-plugin',
  requires: [TPhoilaWidgetRegistry],
  provides: base.IJupyterWidgetRegistry,
  activate: (app: JupyterFrontEnd, registry: TPhoilaWidgetRegistry) => {
    return registry;
  },
  autoStart: true
};

export default [
  voilaViewPlugin,
  singleModePlugin,
  resolver,
  phoilaWidgetManagerPlugin,
  standardWidgetManagerPlugin
];
