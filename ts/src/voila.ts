import { Kernel, ServerConnection } from '@jupyterlab/services'
import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { ReadonlyJSONValue } from '@phosphor/coreutils';

import {
  parseJSON,
  splitStream,
  streamAsyncIterator,
  textDecode
} from './stream-helpers';

export async function connectKernel(
  kernelId: string,
  baseUrl?: string
): Promise<Kernel.IKernel> {
  kernelId = kernelId;
  baseUrl = baseUrl || PageConfig.getBaseUrl();
  const connectionInfo = ServerConnection.makeSettings({ baseUrl });

  let model = await Kernel.findById(kernelId, connectionInfo);
  let kernel = await Kernel.connectTo(model, connectionInfo);
  return kernel;
}


/**
 * Async generator for streaming JSON values from Voila.
 *
 * @param path - The notebook path to pass to Voila
 * @param baseUrl - Optional base URL for the request
 */
export async function* requestVoila(path: string, baseUrl?: string): AsyncIterableIterator<ReadonlyJSONValue> {
  baseUrl = baseUrl || PageConfig.getBaseUrl();
  const settings = ServerConnection.makeSettings({ baseUrl });
  const response = await ServerConnection.makeRequest(
    URLExt.join(baseUrl, 'voila', 'render', path), {}, settings);

  if (!response.ok) {
    throw new Error(`${response.status} (${response.statusText})`);
  }
  if (!response.body) {
    throw new Error(`Missing response body (${response.url})`);
  }
  const dataStream = parseJSON(splitStream(textDecode(response.body), '\n'));

  for await (const data of streamAsyncIterator(dataStream)) {
    yield data;
  }
}
