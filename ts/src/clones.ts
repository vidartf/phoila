
import { SimplifiedOutputArea } from '@jupyterlab/outputarea';
import { UUID } from "@phosphor/coreutils";
import { Panel } from "@phosphor/widgets";

import { VoilaSession } from './session';





function flatten<T>(nested: ReadonlyArray<ReadonlyArray<T>>): ReadonlyArray<T> {
  return nested.reduce<T[]>((res, sub) => {
    res.splice(res.length, 0, ...sub);
    return res;
  }, []);
}

/**
 * A widget hosting a cloned output area.
 */
export class ClonedOutputArea extends Panel {
  constructor(options: ClonedOutputArea.IOptions) {
    super();
    this._session = options.session;
    this._index = options.index !== undefined ? options.index : -1;
    this.id = `LinkedOutputView-${UUID.uuid4()}`;
    this.title.label = 'Output View';
    this.title.icon = 'jp-VoilaIcon';
    this.title.caption = `For Notebook: ${this._session.notebookPath}`;
    this.addClass('jp-LinkedOutputView');

    // Wait for the notebook to be loaded before
    // cloning the output area.
    void this._session.populated.then(() => {
      const oa = flatten(this._session.outputModels)[this._index];
      if (!oa) {
        this.dispose();
        return;
      }
      const clone = new SimplifiedOutputArea({
        model: oa,
        rendermime: this._session.rendermime
      });
      this.addWidget(clone);
    });
  }

  /**
   * The index of the cell in the notebook.
   */
  get index(): number {
    return this._index;
  }

  /**
   * The path of the notebook for the cloned output area.
   */
  get notebookPath(): string {
    return this._session.notebookPath;
  }

  private _session: VoilaSession;
  private _index: number;
}

/**
 * ClonedOutputArea statics.
 */
export namespace ClonedOutputArea {
  export interface IOptions {
    /**
     * The voila view associated with the cloned output area.
     */
    session: VoilaSession;

    /**
     * The index of the output area for when the notebook is loaded.
     */
    index: number;
  }
}