
import { streamAsyncIterator } from './stream-helpers';

/**
 * A multiple times replayable generator.
 *
 * Allows the elements of an async generator to be consumed by multiple
 * subscribers, that can connect at any point (before, during or after
 * element generation).
 */
export class ReplayableGenerator<T> {
  constructor(generator: AsyncIterableIterator<T>) {
    this._generator = generator
    this._mainLoop();
  }

  async _mainLoop() {
    // Await new element
    // On new element:
    // - Add to history
    // - Yield to all child gens
    for await (const element of this._generator) {
      this._history.push(element);
      for (const child of this._children) {
        child.enqueue(element);
      }
    }
  }

  elements(): AsyncIterableIterator<T> {
    const that = this;
    const stream = new ReadableStream<T>({
      start(controller) {
        that._children.push(controller)
      }
    });
    return streamAsyncIterator(stream);
  }

  private _generator: AsyncIterableIterator<T>;
  private _history: T[] = [];
  private _children: ReadableStreamDefaultController<T>[] = [];
}
