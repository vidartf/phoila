


export async function* streamAsyncIterator<T>(stream: ReadableStream<T>): AsyncIterableIterator<T> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
    if (done) {
      return;
    }
    yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

export function textDecode(input: ReadableStream<Uint8Array>, label?: string, options?: TextDecoderOptions) {
  const decoder = new TextDecoder(label, options);
  const reader = input.getReader();

  return new ReadableStream<string>({
    async start(controller) {
      while (true) {
        const { done, value } = await reader.read();

        // When no more data needs to be consumed, break the reading
        if (done) {
          break;
        }

        controller.enqueue(decoder.decode(value));
      }

      // Close the stream
      controller.close();
      reader.releaseLock();
    }
  });
}

/*

The following two functions have been adapted from
https://github.com/deanhume/streams under the following license:

MIT License

Copyright (c) 2019 Dean

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

/**
 * Split the stream
 * @param {*} splitOn 
 */
export function splitStream(input: ReadableStream<string>, splitOn: string) {
  let buffer = '';
  const reader = input.getReader();

  return new ReadableStream<string>({
    async start(controller) {
      while (true) {
        const { done, value } = await reader.read();

        // When no more data needs to be consumed, break the reading
        if (done) {
          break;
        }

        buffer += value;
        const parts = buffer.split(splitOn);
        parts.slice(0, -1).forEach(part => controller.enqueue(part));
        buffer = parts[parts.length - 1];
      }

      // Close the stream
      controller.close();
      reader.releaseLock();
    }
  });
}


/**
 * Parse the NDJSON results
 */
export function parseJSON(input: ReadableStream<string>) {
  const reader = input.getReader();

  return new ReadableStream<string>({
    async start(controller) {
      while (true) {
        const { done, value } = await reader.read();

        // When no more data needs to be consumed, break the reading
        if (done) {
          break;
        }

        if (value.trim().length > 0) {
          controller.enqueue(JSON.parse(value));
        }
      }

      // Close the stream
      controller.close();
      reader.releaseLock();
    }
  });
}
