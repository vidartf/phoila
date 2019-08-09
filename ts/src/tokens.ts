// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetRegistryData } from '@jupyter-widgets/base';

import { IWidgetTracker } from '@jupyterlab/apputils';

import { Token } from '@phosphor/coreutils';

// type-only import:
import { VoilaView } from './widget';

/**
 * A runtime interface token for a widget registry.
 */
export
const TPhoilaWidgetRegistry = new Token<TPhoilaWidgetRegistry>('jupyter.extensions.phoilaWidgetRegistry');

/**
 * A registry of Jupyter Widgets.
 *
 * This is used by widget managers that support an external registry.
 */
export
interface TPhoilaWidgetRegistry {
  /**
   * Register a widget module.
   */
  registerWidget(data: IWidgetRegistryData): void;
}



/**
 * A class that tracks voila widgets.
 */
export interface TVoilaTracker extends IWidgetTracker<VoilaView> {}

/* tslint:disable */
/**
 * The voila widget tracker token.
 */
export const TVoilaTracker = new Token<TVoilaTracker>(
  'phoila:IVoilaTracker'
);