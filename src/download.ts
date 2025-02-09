import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as stream from 'node:stream';
import * as os from 'node:os';

import path from "path";
import { promisify } from "util";

import * as Github from "./github"

type DownloadProgress = vscode.Progress<{ message?: string, increment?: number }>;

async function download(progress: DownloadProgress,
  token: vscode.CancellationToken,
  url: string,
  dest: string,
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
  const out = fs.createWriteStream(dest);
  await promisify(stream.pipeline)(response.body, progressStream, out).catch(e => {
    fs.unlink(dest, (_) => null);
    throw e;
  });
}

export async function install(assert: Github.Asset, abort: AbortController, storagePath: string): Promise<string | undefined> {
  if (await promisify(fs.exists)(storagePath)) {
    const neocmakeExecutableName = executableName();
    const exePath = path.join(storagePath, neocmakeExecutableName);
    if (await Github.isLatestRelease(exePath, abort)) {
      return exePath;
    }
  }
  const neocmakelspPath = path.join(storagePath, assert.name);
  const neocmakelspFinallyPath = path.join(storagePath, executableName());
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Downloading new neocmakelsp",
        cancellable: true
      },
      async (progress, token) => {

        await download(progress, token, assert.browser_download_url, neocmakelspPath, abort);
      })

  } catch (_) {
    return undefined
  }

  await fs.promises.chmod(neocmakelspPath, 0o755);
  await fs.promises.rename(neocmakelspPath, neocmakelspFinallyPath)
  return neocmakelspFinallyPath
}

function executableName(): string {
  return os.platform() == 'win32' ? 'neocmakelsp.exe' : 'neocmakelsp';
}
