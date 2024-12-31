import * as vscode from "vscode"
import { v4 as uuidv4 } from "uuid";

import fs from "node:fs"
import * as proc from "node:child_process";
export enum DebugOrigin {
  originatedFromLaunchConfiguration = "launchConfiguration",
  originatedFromCommand = "command"
}

type CMakeDebugType = "script" | "configure";

export function determineShell(command: string): string | boolean {
  if (command.endsWith('.cmd') || command.endsWith('.bat')) {
    return 'cmd';
  }

  if (command.endsWith('.ps1')) {
    return 'powershell';
  }

  return false;
}

export function getDebuggerPipeName(): string {
  if (process.platform === 'win32') {
    return `\\\\.\\\\pipe\\\\cmake-debugger-pipe\\\\${uuidv4()}`;
  } else {
    return `/tmp/cmake-debugger-pipe-${uuidv4()}`;
  }
}

function initDebugger(debugType: CMakeDebugType, scriptPath?: string): string[] {
  switch (debugType) {
    case "script":
      return ["-P", scriptPath!]
    default:
      return ["-B", "build"]
  }
}

function executeScriptWithDebugger(debugType: CMakeDebugType, scriptPath: string | undefined, scriptArgs: string[], _scriptEnv: Map<string, string>, pipeName: String): proc.ChildProcess {
  const concreteArgs: string[] = initDebugger(debugType, scriptPath);
  concreteArgs.push(...scriptArgs);
  concreteArgs.push("--debugger");
  concreteArgs.push("--debugger-pipe");
  concreteArgs.push(`${pipeName}`);

  const child = proc.spawn("cmake", concreteArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
  return child
}
async function waitForFile(filePath: string, timeout: number, interval = 100): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkFile = () => {
      // Check if the file exists
      if (fs.existsSync(filePath)) {
        resolve();
        return;
      }

      // Check if we've exceeded the timeout
      if (Date.now() - startTime >= timeout) {
        reject(new Error(`Timeout: File "${filePath}" was not created within ${timeout}ms.`));
        return;
      }

      // Check again after the interval
      setTimeout(checkFile, interval);
    };

    // Start checking
    checkFile();
  });
}

export class CMakeDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
  async createDebugAdapterDescriptor(session: vscode.DebugSession, _executable: vscode.DebugAdapterExecutable | undefined): Promise<vscode.ProviderResult<vscode.DebugAdapterDescriptor>> {
    const pipeName =
      session.configuration.pipeName ?? getDebuggerPipeName();
    session.configuration.fromCommand ? DebugOrigin.originatedFromCommand : DebugOrigin.originatedFromLaunchConfiguration;
    const script = session.configuration.scriptPath;
    if (script != undefined && !fs.existsSync(script)) {
      throw new Error(`cmake.debug.scriptPath.does.not.exist, The script path, \"${script}\", could not be found.1`);
    }
    const args: string[] = session.configuration.scriptArgs ?? [];
    const env = new Map<string, string>(session.configuration.scriptEnv?.map((e: { name: string; value: string }) => [e.name, e.value])) ?? new Map();

    const cmakeDebugType: CMakeDebugType = session.configuration.cmakeDebugType;

    executeScriptWithDebugger(cmakeDebugType, script, args, env, pipeName);
    // TODO: fix it?
    await waitForFile(pipeName, 1000)

    return new vscode.DebugAdapterNamedPipeServer(pipeName);
  }
}
