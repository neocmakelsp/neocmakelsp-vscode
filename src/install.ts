import * as os from 'node:os';

import * as Github from "./github";
import * as Download from "./download";

import * as vscode from 'vscode';

const ARM_64 = "arm64"
const X_64 = "x64"

type TARGET_ASSERT = "neocmakelsp-x86_64-unknown-linux-gnu.tar.gz"
  | "neocmakelsp-aarch64-unknown-linux-gnu.tar.gz"
  | "neocmakelsp-x86_64-pc-windows-msvc.zip"
  | "neocmakelsp-aarch64-pc-windows-msvc.zip"
  | "neocmakelsp-universal-apple-darwin.tar.gz"


type LocalAssertInfo = {
  file: TARGET_ASSERT,
  runtime: Github.RUNTIME_NAME,
  type: Github.FILE_TYPE
}

function targetInfo(): LocalAssertInfo | undefined {
  const arch = os.arch()
  switch (os.platform()) {
    case "win32":
      if (arch == X_64) {
        return {
          file: "neocmakelsp-x86_64-pc-windows-msvc.zip",
          runtime: "neocmakelsp.exe",
          type: "zip"
        }
      } else if (arch == ARM_64) {
        return {
          file: "neocmakelsp-aarch64-pc-windows-msvc.zip",
          runtime: "neocmakelsp.exe",
          type: "zip"
        }
      }
    case "darwin":
      return {
        file: "neocmakelsp-universal-apple-darwin.tar.gz",
        runtime: "neocmakelsp",
        type: "tar"
      }
    case "linux":
      if (arch == X_64) {
        return {
          file: "neocmakelsp-x86_64-unknown-linux-gnu.tar.gz",
          runtime: "neocmakelsp",
          type: "tar"
        }
      } else if (arch == ARM_64) {
        return {
          file: "neocmakelsp-aarch64-unknown-linux-gnu.tar.gz",
          runtime: "neocmakelsp",
          type: "tar"
        }
      }
    default:
      return undefined;
  }
}



function getGithubAssert(asserts: Github.Asset[]): Github.AssetInfo | undefined {
  const target = targetInfo();
  if (target === undefined) {
    return undefined;
  }
  let asset = asserts.find(assert => assert.name === target.file);
  if (!asset) {
    return;
  }
  return { asset, runtime: target.runtime, type: target.type }
}

export async function installLatestNeocmakeLsp(path: string) {
  const timeoutController = new AbortController();
  try {
    const latestRe = await Github.latestRelease(timeoutController);
    const assert = getGithubAssert(latestRe.assets);
    if (assert === undefined) {
      vscode.window.showErrorMessage("Your platform is not supported");
      return undefined;
    }
    return await Download.install(assert, timeoutController, path);
  } catch (e) {
    vscode.window.showErrorMessage(`${e}`);
    return undefined;
  }
}
