// Copyright (c) Vidar Tonaas Fauske
// Distributed under the terms of the Modified BSD License.

/*

This module contains code for opening a new voila view.

*/

import { JupyterFrontEnd } from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';

import {
  IRenderMimeRegistry
} from '@jupyterlab/rendermime';

import { WidgetRenderer } from '@jupyter-widgets/jupyterlab-manager';

import * as base from '@jupyter-widgets/base';

export { connectKernel } from './kernel';

import { WidgetManager } from './widget-manager';

import { TPhoilaWidgetRegistry, TVoilaTracker } from './tokens';


const WIDGET_VIEW_MIMETYPE = 'application/vnd.jupyter.widget-view+json';



const voilaViewPlugin = {
  id: 'phoila:voila-view',
  requires: [],
  optional: [ICommandPalette],
  provides: TVoilaTracker,
  activate: (app: JupyterFrontEnd, palette: ICommandPalette | null) => {
    const {commands} = app;
    commands.addCommand(
      'phoila:open-new', {
        execute: args => {
          const path = args['path'];
          if (!path) {
            throw new Error('Phoila: No path given to open');
          }

          // Open voila widget
        }
      }
    );

    if (palette) {
      palette.addItem({
        command: 'phoila:open-new',
        category: 'Voila',
      });
    }
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

    const wManager = new WidgetManager(kernel, rendermime);

    // Add a placeholder widget renderer.
    rendermime.addFactory({
      safe: false,
      mimeTypes: [WIDGET_VIEW_MIMETYPE],
      createRenderer: options => new WidgetRenderer(options, wManager)
    }, 0);

    wManager.restored.connect(() => {
      managerPromise.resolve(wManager);
    });

    return {
      registerWidget(data) {
        wManager.register(data);
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
