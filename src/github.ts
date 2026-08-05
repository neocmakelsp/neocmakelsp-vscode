import which from 'which';
import * as childProcess from 'node:child_process';
import { Version } from './util';

const githubReleaseURL = 'https://api.github.com/repos/Decodetalkers/neocmakelsp/releases/latest';

export interface Release {
  name: string;
  tag_name: string;
  assets: Array<Asset>;
}

export interface Asset {
  name: string;
  browser_download_url: string;
}
export type RUNTIME_NAME = 'neocmakelsp' | 'neocmakelsp.exe';
export type FILE_TYPE = 'zip' | 'tar';
export type AssetInfo = {
  asset: Asset;
  runtime: RUNTIME_NAME;
  type: FILE_TYPE;
};

export async function isLatestRelease(path: string, abort: AbortController) {
  const latestReleaseInfo = await latestRelease(abort);

  const localVersionStr = await getNeocmakeVersion(path);
  if (!localVersionStr) {
    return false;
  }
  const tagVersionStr = latestReleaseInfo.tag_name.substring(1);
  const localVersion = Version.parse(localVersionStr);
  if (!localVersion) {
    // NOTE: if local version is illegal
    // Emm, what happened now
    return false;
  }
  const tagVersion = Version.parse(tagVersionStr);
  if (!tagVersion) {
    // NOTE: if tagVersion is illegal, then do not download it
    return true;
  }
  // NOTE: we need to make sure at least they are equal
  return !localVersion.smaller(tagVersion);
}

export async function latestRelease(timeoutController: AbortController) {
  const timeout = setTimeout(() => {
    timeoutController.abort();
  }, 5000);
  try {
    const response = await fetch(githubReleaseURL, {
      signal: timeoutController.signal,
    });
    if (!response.ok) {
      console.log(response.url, response.status, response.statusText);
      throw new Error(`Can't fetch release: ${response.statusText}`);
    }
    return (await response.json()) as Release;
  } catch (e) {
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getNeocmakeLspPath(path: string) {
  try {
    return await which(path);
  } catch (_) {
    return undefined;
  }
}

export async function getNeocmakeVersion(path: string) {
  if ((await getNeocmakeLspPath(path)) === undefined) {
    return undefined;
  }
  const output = await run(path, ['--version']);

  const version = output.split(' ')[1].trimEnd();
  return version;
}

async function run(command: string, flags: string[]): Promise<string> {
  const child = childProcess.spawn(command, flags, {
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  let output = '';
  for await (const chunk of child.stdout) {
    output += chunk;
  }
  return output;
}
