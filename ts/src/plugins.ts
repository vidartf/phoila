// Copyright (c) Vidar Tonaas Fauske
// Distributed under the terms of the Modified BSD License.

/*

This module contains code for opening a new voila view.

*/

import { JupyterFrontEnd, ILayoutRestorer } from '@jupyterlab/application';
import { ICommandPalette, WidgetTracker } from '@jupyterlab/apputils';
import { IRenderMimeRegistry } from "@jupyterlab/rendermime";

import * as base from '@jupyter-widgets/base';
import { WidgetRenderer } from '@jupyter-widgets/jupyterlab-manager';

import { TPhoilaWidgetRegistry, TVoilaTracker } from './tokens';

import { WidgetRegistry } from './registry';
import { VoilaView } from './widget';


const WIDGET_VIEW_MIMETYPE = 'application/vnd.jupyter.widget-view+json';


const WIDGET_REGISTRY = new WidgetRegistry();

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
        execute: args => {
          const path = args['path'];
          if (!path) {
            throw new Error('Phoila: No path given to open');
          } else if (typeof path !== 'string') {
            throw new Error('Phoila: Path not a string')
          }

          // Open voila widget
          const view = new VoilaView(path, WIDGET_REGISTRY, rendermime);
          shell.add(view);
          tracker.add(view);
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
