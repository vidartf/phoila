
import { IDisposable } from '@phosphor/disposable';
import { ISignal, Signal } from '@phosphor/signaling';

import * as base from '@jupyter-widgets/base';

export class WidgetRegistry implements IDisposable {
  /**
   *
   */
  constructor() {
    this._registered = new Signal(this);
  }

  get registered(): ISignal<this, base.IWidgetRegistryData> {
    return this._registered;
  }

  register(data: base.IWidgetRegistryData): void {
    this._data.push(data);
    this._registered.emit(data);
  }

  get data(): ReadonlyArray<base.IWidgetRegistryData> {
    return this._data;
  }

  dispose() {
    // Do nothing if the widget is already disposed.
    if (this.isDisposed) {
      return;
    }

    this._disposed = true;
    this._data = [];

    // Clear the extra data associated with the widget.
    Signal.clearData(this);
  }

  /**
   * Test whether the widget has been disposed.
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  private _registered: Signal<this, base.IWidgetRegistryData>;
  private _data: base.IWidgetRegistryData[] = [];
  private _disposed: boolean = false;
}
