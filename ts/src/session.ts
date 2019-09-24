

import { IRenderMimeRegistry } from "@jupyterlab/rendermime";
import { WidgetRenderer } from '@jupyter-widgets/jupyterlab-manager';

import {  PromiseDelegate, ReadonlyJSONValue } from "@phosphor/coreutils";
import { IObservableDisposable } from '@phosphor/disposable';
import { ISignal, Signal } from '@phosphor/signaling';

import { WidgetRegistry } from './registry';
import { ReplayableGenerator } from './replaygen';
import { connectKernel, requestVoila } from './voila';
import { WidgetManager } from './widget-manager';
import { OutputAreaModel } from "@jupyterlab/outputarea";

import { ClonedOutputArea } from './clones';


const WIDGET_VIEW_MIMETYPE = 'application/vnd.jupyter.widget-view+json';


export class VoilaSession implements IObservableDisposable {
  /**
   *
   */
  constructor(
    notebookPath: string,
    registry: WidgetRegistry,
    rendermime: IRenderMimeRegistry,
  ) {
    this.notebookPath = notebookPath;
    this._entryGen = new ReplayableGenerator(
      this.entriesFromPath(notebookPath));
    this.rendermime = rendermime.clone();
    this.registry = registry;
  }

  /**
   * Test whether the handler is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose the resources held by the handler.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._entryGen = null!;
    for (const c of this._outputClones) {
      c.dispose();
    }
    this._outputClones.clear();
    for (const child of this._outputModels) {
      for (const m of child) {
        m.dispose();
      }
    }
    this._outputModels = [];
    this._disposed.emit(undefined);
    Signal.clearData(this);
  }

  get entries(): AsyncIterableIterator<VoilaSession.EntryData> {
    return this._entryGen.elements();
  }

  get connected(): Promise<WidgetManager> {
    return this._connected.promise;
  }

  get populated(): Promise<void> {
    return this._populated.promise;
  }

  /**
   * A signal emitted when the object is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  get cloneRemoved(): ISignal<this, undefined> {
    return this._cloneRemoved;
  }

  get hasClones(): boolean {
    return this._outputClones.size !== 0;
  }

  cloneOutput(index: number): ClonedOutputArea {
    const clone = new ClonedOutputArea({
      session: this,
      index
    });
    // Dispose clone when view is disposed
    this.disposed.connect(() => {
      clone.dispose();
    });
    this._outputClones.add(clone);
    clone.disposed.connect((sender) => {
      this._outputClones.delete(sender);
      this._cloneRemoved.emit(undefined);
    });
    return clone;
  }


  readonly notebookPath: string;
  readonly rendermime: IRenderMimeRegistry;

  get outputModels(): ReadonlyArray<ReadonlyArray<OutputAreaModel>> {
    return this._outputModels;
  }

  protected async* entriesFromPath(path: string) {
    const gen = requestVoila(path);
    try {
      yield* this.entriesFromGenerator(gen);
    } finally {
      this._populated.resolve();
    }
  }

  protected async* entriesFromGenerator(generator: AsyncIterableIterator<ReadonlyJSONValue>) {
    for await (const entry of generator) {
      if (VoilaSession.isHeader(entry)) {
        // await?
        this.processHeader(entry);
      }
      if (VoilaSession.validateEntry(entry)) {
        const rootNode = document.createElement('div');
        rootNode.innerHTML = entry.source;
        const outputs = rootNode.querySelectorAll(
          'script[type="application/x.voila-lab-output+json"]'
        );
        const models = [];
        for (let i = 0; i != outputs.length; ++i) {
          const node = outputs[i] as HTMLScriptElement;
          const model = new OutputAreaModel();
          const data = JSON.parse(node.innerText);
          model.fromJSON(data.outputs);
          model.trusted = true;
          models.push(model);
        }
        this._outputModels.push(models);
        yield entry;
      }
    }
  }

  protected readonly registry: WidgetRegistry;

  protected async processHeader(header: VoilaSession.HeaderData): Promise<void> {
    const { kernelId } = header;
    const kernel = await connectKernel(kernelId);
    const wManager = new WidgetManager(kernel, this.rendermime);
    this.registry.data.forEach(data => wManager.register(data));


    // Replace the placeholder widget renderer with one bound to this widget
    // manager.
    this.rendermime.removeMimeType(WIDGET_VIEW_MIMETYPE);
    this.rendermime.addFactory(
      {
      safe: false,
      mimeTypes: [WIDGET_VIEW_MIMETYPE],
        createRenderer: (options) => new WidgetRenderer(
          options, wManager as any)
      }, 0);

    this._connected.resolve(wManager);
  }

  private _isDisposed = false;
  private _entryGen: ReplayableGenerator<VoilaSession.EntryData>;
  private _outputModels: OutputAreaModel[][] = [];
  private _connected = new PromiseDelegate<WidgetManager>();
  private _populated = new PromiseDelegate<void>();
  private _disposed = new Signal<this, undefined>(this);


  private _cloneRemoved = new Signal<this, undefined>(this);
  private _outputClones = new Set<ClonedOutputArea>();
}

export namespace VoilaSession {

  export type HeaderData = { kernelId: string };

  export type EntryData = { source: string };

  export function validateEntry(entry: ReadonlyJSONValue): entry is EntryData {
    return (
      entry !== null && entry !== undefined
      && Object.keys(entry).indexOf('source') !== -1
      && typeof (entry as any).source === 'string'
    );
  }

  export function isHeader(entry: ReadonlyJSONValue): entry is HeaderData {
    return (
      entry !== null && entry !== undefined
      && Object.keys(entry).indexOf('kernelId') !== -1
      && typeof (entry as any).kernelId === 'string'
    )
  }
}


