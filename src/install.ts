import * as os from 'node:os';

import * as Github from "./github";
import * as Download from "./download";

import * as vscode from 'vscode';

const ARM_64 = "arm64"
const X_64 = "x64"

type TARGET_ASSERT = "neocmakelsp-x86_64-apple-darwin"
  | "neocmakelsp-aarch64-apple-darwin"
  | "neocmakelsp-x86_64-pc-windows-msvc.exe"
  | "neocmakelsp-x86_64-unknown-linux-gnu"
  | "neocmakelsp-aarch64-unknown-linux-gnu"
  | undefined

function targetName(): TARGET_ASSERT {
  const arch = os.arch()
  switch (os.platform()) {
    case "win32":
      return "neocmakelsp-x86_64-pc-windows-msvc.exe"
    case "darwin":
      if (arch == X_64) {
        return "neocmakelsp-x86_64-apple-darwin";
      } else {
        return "neocmakelsp-aarch64-apple-darwin";
      }
    case "linux":
      if (arch == ARM_64) {
        return "neocmakelsp-aarch64-unknown-linux-gnu"
      } else if (arch == X_64) {
        return "neocmakelsp-x86_64-unknown-linux-gnu"
      }
    default:
      return undefined;
  }
}

function getGithubAssert(asserts: Github.Asset[]) {
  const target = targetName();
  if (target === undefined) {
    return undefined;
  }
  return asserts.find(assert => assert.name === target);
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
