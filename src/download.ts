import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as stream from 'node:stream';

import path from 'node:path';
import { promisify } from 'node:util';
import { extractArchive } from './archive';
import * as Github from './github';

type DownloadProgress = vscode.Progress<{ message?: string; increment?: number }>;

async function download(
  progress: DownloadProgress,
  token: vscode.CancellationToken,
  url: string,
  storagePath: string,
  untarFile: string,
  file_type: Github.FILE_TYPE,
  runtime: Github.RUNTIME_NAME,
  abort: AbortController
) {
  token.onCancellationRequested(() => abort.abort());
  const response = await fetch(url, { signal: abort.signal });
  if (!response.ok) {
    throw new Error(`failed to download ${url}`);
  }

  const totalSize = parseInt(response.headers.get('content-length')!, 10); // Get total size in bytes
  if (!totalSize) {
    vscode.window.showErrorMessage('No content-length header, cannot track progress');
  }

  let downloadedSize = 0;
  // Create a transform stream to track progress
  const progressStream = new stream.Transform({
    transform(chunk, _, callback) {
      downloadedSize += chunk.length;
      if (totalSize) {
        const percent = ((downloadedSize / totalSize) * 100).toFixed(2);
        progress.report({
          message: `${percent}%`,
          increment: (chunk.length / totalSize) * 100,
        });
      } else {
        progress.report({
          message: `neocmakelsp downloaded finished`,
          increment: 100,
        });
      }
      callback(null, chunk);
    },
  });
  const out = fs.createWriteStream(untarFile);
  await promisify(stream.pipeline)(response.body!, progressStream, out).catch(e => {
    fs.unlink(untarFile, _ => null);
    throw e;
  });
  await extractArchive(untarFile, storagePath, file_type, runtime);
}

export async function install(
  assert_info: Github.AssetInfo,
  abort: AbortController,
  storagePath: string
): Promise<string> {
  if (await promisify(fs.exists)(storagePath)) {
    const neocmakeExecutableName = assert_info.runtime;
    const exePath = path.join(storagePath, neocmakeExecutableName);
    if (await Github.isLatestRelease(exePath, abort)) {
      return exePath;
    }
  }
  const assert = assert_info.asset;
  const downloadPath = path.join(storagePath, assert.name);
  const neocmakelspPath = path.join(storagePath, assert_info.runtime);
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Downloading new neocmakelsp',
      cancellable: true,
    },
    async (progress, token) => {
      try {
        await download(
          progress,
          token,
          assert.browser_download_url,
          storagePath,
          downloadPath,
          assert_info.type,
          assert_info.runtime,
          abort
        );
      } finally {
        await fs.promises.rm(downloadPath, { force: true }).catch(() => undefined);
      }
    }
  );

  await fs.promises.chmod(neocmakelspPath, 0o755);
  return neocmakelspPath;
}
