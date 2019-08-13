

import { OutputArea, OutputAreaModel } from '@jupyterlab/outputarea';
import { IRenderMimeRegistry } from "@jupyterlab/rendermime";
import { WidgetRenderer } from '@jupyter-widgets/jupyterlab-manager';

import { each, iter, toArray } from '@phosphor/algorithm';
import { ReadonlyJSONValue } from "@phosphor/coreutils";
import { MessageLoop } from '@phosphor/messaging';
import { Widget, Layout, PanelLayout } from "@phosphor/widgets";

import { WidgetRegistry } from './registry';
import { connectKernel, requestVoila } from './voila';
import { WidgetManager } from './widget-manager';


const WIDGET_VIEW_MIMETYPE = 'application/vnd.jupyter.widget-view+json';

const VOILA_VIEW_CLASS = 'voila-viewWidget';


class ReplaceLayout<T extends Widget> extends Layout {
  replaceNode(target: HTMLElement, widget: T) {
    this._widgets.push(widget);

    // Send a `'before-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
    }

    // Insert the widget's node before the sibling.
    target.parentElement!.insertBefore(widget.node, target);

    // Send an `'after-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
    }
  }

  removeWidget(widget: T): void {
    this._widgets.splice(this._widgets.indexOf(widget), 1);

    // Send a `'before-detach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
    }

    // Remove the widget's node from the parent.
    widget.node.remove();

    // Send an `'after-detach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
    }

    if (this.parent) {
      // Post a fit request for the parent widget.
      this.parent.fit();
    }
  }

  iter() {
    return iter(this._widgets);
  }

  _widgets: T[] = [];
}

export class VoilaOutputWidget extends Widget {
  constructor(options?: Widget.IOptions) {
    super(options);
    this.layout = new ReplaceLayout();
  }

  replaceWidgetOutputs(rendermime: IRenderMimeRegistry) {
    const rootNode = this.node;
    const outputs = rootNode.querySelectorAll(
      'script[type="application/x.voila-lab-output+json"]'
    );
    for (let i = 0; i != outputs.length; ++i) {
      const node = outputs[i] as HTMLScriptElement;
      try {
        const model = new OutputAreaModel();
        const data = JSON.parse(node.innerText);
        model.fromJSON(data.outputs);
        model.trusted = true;
        const view = new OutputArea({
          model,
          rendermime: rendermime
        });
        this.layout.replaceNode(node, view);
      } catch (error) {
        console.error(error);
        // Each widget view tag rendering is wrapped with a try-catch statement.
        //
        // This fixes issues with widget models that are explicitely "closed"
        // but are still referred to in a previous cell output.
        // Without the try-catch statement, this error interupts the loop and
        // prevents the rendering of further cells.
        //
        // This workaround may not be necessary anymore with templates that make use
        // of progressive rendering.
      }
    }
  }

  *renderers() {
    for (const outputArea of toArray(this.layout)) {
      for (const codecell of outputArea.widgets) {
        for (const output of toArray(codecell.children())) {
          if (output instanceof WidgetRenderer) {
            yield output;
          }
        }
      }
    }
  }

  layout: ReplaceLayout<OutputArea>;
}


export class VoilaView extends Widget {
  /**
   *
   */
  constructor(
    notebookPath: string,
    registry: WidgetRegistry,
    rendermime: IRenderMimeRegistry
  ) {
    super();
    this.layout = new PanelLayout();
    this.notebookPath = notebookPath;
    this.populateFromPath(notebookPath);
    this.rendermime = rendermime.clone();
    this.registry = registry;
    this.addClass(VOILA_VIEW_CLASS);
  }

  async populateFromPath(path: string) {
    const gen = requestVoila(path);
    return this.populateFromGenerator(gen);
  }

  async populateFromGenerator(generator: AsyncIterableIterator<ReadonlyJSONValue>) {
    for await (const entry of generator) {
      if (VoilaView.isHeader(entry)) {
        // await?
        this.processHeader(entry);
      }
      if (VoilaView.validateEntry(entry)) {
        this.addEntry(entry);
      }
    }
  }

  async processHeader(header: VoilaView.HeaderData): Promise<void> {
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
    each(this.layout, (widget) => {
      for (const renderer of (widget as VoilaOutputWidget).renderers()) {
        renderer.manager = wManager as any;
      }
    });
  }

  addEntry(entry: VoilaView.EntryData): void {
    const view = new VoilaOutputWidget();
    view.node.innerHTML = entry.source;
    this.layout.addWidget(view);
    view.replaceWidgetOutputs(this.rendermime);
  }

  layout: PanelLayout;
  readonly notebookPath: string;
  readonly rendermime: IRenderMimeRegistry;
  protected readonly registry: WidgetRegistry;
}

export namespace VoilaView {

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
