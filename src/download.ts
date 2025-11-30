import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as stream from 'node:stream';
import * as unzipper from "unzipper";

import path from "path";
import { promisify } from "util";
import * as tar from "tar";
import * as Github from "./github"

type DownloadProgress = vscode.Progress<{ message?: string, increment?: number }>;

async function download(progress: DownloadProgress,
  token: vscode.CancellationToken,
  url: string,
  storagePath: string,
  untarFile: string,
  file_type: Github.FILE_TYPE,
  targetFile: string,
  abort: AbortController) {
  token.onCancellationRequested(() => abort.abort());
  const response = await fetch(url, { signal: abort.signal });
  if (!response.ok) {
    throw new Error(`failed to download ${url}`);
  }

  const totalSize = parseInt(response.headers.get('content-length'), 10); // Get total size in bytes
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
        progress.report({ message: `${percent}%`, increment: (chunk.length / totalSize) * 100 });
      } else {
        progress.report({ message: `neocmakelsp downloaded finished`, increment: 100 });
      }
      callback(null, chunk);
    },
  });
  const out = fs.createWriteStream(untarFile);
  await promisify(stream.pipeline)(response.body, progressStream, out).catch(e => {
    fs.unlink(untarFile, (_) => null);
    throw e;
  });
  if (file_type == "tar") {
    await tar.x({ file: untarFile, C: storagePath });
  } else {
    const directory = await unzipper.Open.file(untarFile);
    if (directory.files.length == 0) {
      throw new Error("No file");
    }
    directory.files[0].stream().pipe(fs.createWriteStream(targetFile)).on('error', (e) => {
      fs.unlink(untarFile, (_) => null);
      throw e;
    })
      .on('finish', () => {

        fs.unlink(untarFile, (_) => null);
      });
  }
}

export async function install(assert_info: Github.AssetInfo, abort: AbortController, storagePath: string): Promise<string | undefined> {
  if (await promisify(fs.exists)(storagePath)) {
    const neocmakeExecutableName = assert_info.runtime;
    const exePath = path.join(storagePath, neocmakeExecutableName);
    if (await Github.isLatestRelease(exePath, abort)) {
      return exePath;
    }
  }
  let assert = assert_info.asset;
  const downloadPath = path.join(storagePath, assert.name);
  const neocmakelspPath = path.join(storagePath, assert_info.runtime);
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Downloading new neocmakelsp",
        cancellable: true
      },
      async (progress, token) => {

        await download(progress, token, assert.browser_download_url, storagePath, downloadPath, assert_info.type, neocmakelspPath, abort);
      })

  } catch (_) {
    return undefined
  }

  await fs.promises.chmod(neocmakelspPath, 0o755);
  await fs.promises.rm(downloadPath);
  return neocmakelspPath
}
