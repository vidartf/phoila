

import { MainAreaWidget } from '@jupyterlab/apputils';
import { OutputArea, OutputAreaModel } from '@jupyterlab/outputarea';
import { IRenderMimeRegistry } from "@jupyterlab/rendermime";
import { WidgetRenderer } from '@jupyter-widgets/jupyterlab-manager';

import { each, iter, toArray, ArrayExt } from '@phosphor/algorithm';
import { MimeData, PromiseDelegate } from "@phosphor/coreutils";
import { ElementExt } from '@phosphor/domutils';
import { Drag } from '@phosphor/dragdrop';
import { Message, MessageLoop } from '@phosphor/messaging';
import { Widget, Layout, PanelLayout } from "@phosphor/widgets";

import { VoilaSession } from './session';
import { Signal, ISignal } from '@phosphor/signaling';
import { ClonedOutputArea } from './clones';


const VOILA_VIEW_CLASS = 'voila-viewWidget';

export const VOLIA_MAINAREA_CLASS = 'voila-mainAreaWidget';

/**
 * The factory MIME type supported by phosphor dock panels.
 */
const FACTORY_MIME = 'application/vnd.phosphor.widget-factory';

/**
 * The threshold in pixels to start a drag event.
 */
const DRAG_THRESHOLD = 5;


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

  /**
   * Insert OutputArea for each voila output script tag in node source.
   *
   * Takes the unknown source in `node` and replaces all script tags
   * with the type "application/x.voila-lab-output+json" with a full
   * lab OutputArea.
   *
   * @param rendermime 
   */
  insertOutputAreas(
    rendermime: IRenderMimeRegistry,
    outputAreaModels: ReadonlyArray<OutputAreaModel>
  ): void {
    const rootNode = this.node;
    const outputs = rootNode.querySelectorAll(
      'script[type="application/x.voila-lab-output+json"]'
    );
    for (let i = 0; i != outputs.length; ++i) {
      const node = outputs[i] as HTMLScriptElement;
      try {
        const model = outputAreaModels[i];
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
  constructor(session: VoilaSession) {
    super();
    this.layout = new PanelLayout();
    this.addClass(VOILA_VIEW_CLASS);
    this.session = session;
    this.populateFromSession();
  }

  async populateFromSession() {
    try {
      this.session.connected.then((wManager) => {
        each(this.layout, (widget) => {
          for (const renderer of (widget as VoilaOutputWidget).renderers()) {
            renderer.manager = wManager as any;
          }
        });
      });
      for await (const entry of this.session.entries) {
        this.addEntry(entry);
      }
    } catch (reason) {
      const textnode = document.createTextNode(reason);
      this.node.appendChild(textnode);
      this._populated.reject(reason);
    }
    this._populated.resolve();
  }

  addEntry(entry: VoilaSession.EntryData): void {
    const view = new VoilaOutputWidget();
    view.node.innerHTML = entry.source;
    this.layout.addWidget(view);
    view.insertOutputAreas(
      this.session.rendermime,
      this.session.outputModels[this.layout.widgets.length - 1]
    );
  }

  get allowDrag(): boolean {
    return this._allowDrag;
  }

  set allowDrag(value: boolean) {
    this._allowDrag = value;
  }

  get connected(): Promise<void> {
    return this._connected.promise;
  }

  get populated(): Promise<void> {
    return this._populated.promise;
  }

  get cloned(): ISignal<this, MainAreaWidget<ClonedOutputArea>> {
    return this._cloned;
  }

  /**
   * Handle the DOM events for the directory listing.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the panel's DOM node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'mousedown':
        this._evtMousedown(event as MouseEvent);
        break;
      case 'mouseup':
        this._evtMouseup(event as MouseEvent);
        break;
      case 'mousemove':
        this._evtMousemove(event as MouseEvent);
        break;
      default:
        break;
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    let node = this.node;
    node.addEventListener('mousedown', this);
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    let node = this.node;
    node.removeEventListener('mousedown', this);
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);
  }

  get outputAreas() {
    const items = [];
    for (const ow of toArray(this.layout)) {
      for (const oa of toArray((ow as VoilaOutputWidget).layout)) {
        items.push(oa);
      }
    }
    return items;
  }

  private get _items() {
    return this.outputAreas.map(o => o.node);
  }

  /**
   * Handle the `'mousedown'` event for the widget.
   */
  private _evtMousedown(event: MouseEvent): void {
    // Left mouse press for drag start.
    if (event.button === 0 && this._allowDrag) {
      const items = this._items;
      let index = hitTestNodes(items, event.clientX, event.clientY);
      if (index === -1) {
        return;
      }
      let subtracts = [].slice.call(
        items[index].querySelectorAll('.jp-OutputArea-output'));
      if (hitTestNodes(subtracts, event.clientX, event.clientY) !== -1) {
        return;
      }

      this._dragData = {
        pressX: event.clientX,
        pressY: event.clientY,
        index: index
      };
      document.addEventListener('mouseup', this, true);
      document.addEventListener('mousemove', this, true);
    }
  }

  /**
   * Handle the `'mouseup'` event for the widget.
   */
  private _evtMouseup(event: MouseEvent): void {
    // Remove the drag listeners if necessary.
    if (event.button !== 0 || !this._drag) {
      document.removeEventListener('mousemove', this, true);
      document.removeEventListener('mouseup', this, true);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle the `'mousemove'` event for the widget.
   */
  private _evtMousemove(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Bail if we are the one dragging.
    if (this._drag || !this._dragData) {
      return;
    }

    // Check for a drag initialization.
    let data = this._dragData;
    let dx = Math.abs(event.clientX - data.pressX);
    let dy = Math.abs(event.clientY - data.pressY);
    if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
      return;
    }

    this._startDrag(data.index, event.clientX, event.clientY);
  }

  /**
   * Start a drag event.
   */
  private _startDrag(index: number, clientX: number, clientY: number): void {
    let source = this.outputAreas[index];

    if (!source) {
      return;
    }

    // Create the drag image.
    //let dragImage = this._items[index];
    let dragImage = document.createElement('div');

    // Set up the drag event.
    this._drag = new Drag({
      dragImage,
      mimeData: new MimeData(),
      supportedActions: 'copy',
      proposedAction: 'copy'
    });

    this._drag.mimeData.setData(FACTORY_MIME, () => {
      if (!source) {
        return;
      }
      const clone = this.session.cloneOutput(index);
      const wrapper = new MainAreaWidget({
        content: clone
      });
      wrapper.addClass(VOLIA_MAINAREA_CLASS);
      this._cloned.emit(wrapper);
      return wrapper;
    });

    // Start the drag and remove the mousemove and mouseup listeners.
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);

    void this._drag.start(clientX, clientY).then(action => {
      this._drag = null;
    });
  }


  layout: PanelLayout;
  readonly session: VoilaSession;

  private _allowDrag = false;

  private _drag: Drag | null = null;
  private _dragData: {
    pressX: number;
    pressY: number;
    index: number;
  } | null = null;

  private _connected = new PromiseDelegate<void>();
  private _populated = new PromiseDelegate<void>();
  private _cloned = new Signal<this, MainAreaWidget<ClonedOutputArea>>(this);
}

function hitTestNodes(
  nodes: HTMLElement[],
  x: number,
  y: number
): number {
  return ArrayExt.findFirstIndex(nodes, node =>
    ElementExt.hitTest(node, x, y)
  );
}
