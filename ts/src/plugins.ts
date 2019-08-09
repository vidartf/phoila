// Copyright (c) Vidar Tonaas Fauske
// Distributed under the terms of the Modified BSD License.

/*

This module contains code for opening a new voila view.

*/

import { JupyterFrontEnd, ILayoutRestorer } from '@jupyterlab/application';
import {
  DOMUtils,
  ICommandPalette,
  InputDialog,
  WidgetTracker
} from '@jupyterlab/apputils';
import { IRenderMimeRegistry } from "@jupyterlab/rendermime";

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

import { WidgetRegistry } from './registry';
import { VoilaView } from './widget';


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


const voilaViewPlugin = {
  id: 'phoila:voila-view',
  requires: [IRenderMimeRegistry],
  optional: [ICommandPalette, ILayoutRestorer],
  provides: TVoilaTracker,
  activate: (
    app: JupyterFrontEnd,
    rendermime: IRenderMimeRegistry,
    palette: ICommandPalette | null,
    restorer: ILayoutRestorer | null
  ) => {
    const { commands, shell } = app;
    const tracker = new WidgetTracker<VoilaView>({namespace: 'phoila'});
    commands.addCommand(
      'phoila:open-new', {
        label: 'Open New Voila View',
        execute: args => {
          const path = args['path'];
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
          void ppromise.then((nbPath) => {
            // Open voila widget
            const view = new VoilaView(nbPath, WIDGET_REGISTRY, rendermime);
            view.id = DOMUtils.createDomID();
            view.title.label = nbPath;
            shell.add(view);
            tracker.add(view);
          });
        }
      }
    );
    if (restorer) {
      restorer.restore(tracker, {
        command: 'phoila:open-new',
        args: view => ({
          path: view.notebookPath,
        }),
        name: (view) => view.notebookPath,
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

export default [voilaViewPlugin, phoilaWidgetManagerPlugin, standardWidgetManagerPlugin];
