import * as vscode from "vscode"
import { v4 as uuidv4 } from "uuid";

import fs from "node:fs"
import * as proc from "node:child_process";
export enum DebugOrigin {
  originatedFromLaunchConfiguration = "launchConfiguration",
  originatedFromCommand = "command"
}


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

function executeScriptWithDebugger(scriptPath: string, scriptArgs: string[], _scriptEnv: Map<string, string>, pipeName: String): proc.ChildProcess {
  const concreteArgs: string[] = ["-P", scriptPath];
  concreteArgs.push(...scriptArgs);
  concreteArgs.push("--debugger");
  concreteArgs.push("--debugger-pipe");
  concreteArgs.push(`${pipeName}`);

  const child = proc.spawn("cmake", concreteArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
  return child
}

export class CMakeDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
  async createDebugAdapterDescriptor(session: vscode.DebugSession, _executable: vscode.DebugAdapterExecutable | undefined): Promise<vscode.ProviderResult<vscode.DebugAdapterDescriptor>> {
    const pipeName =
      session.configuration.pipeName ?? getDebuggerPipeName();
    session.configuration.fromCommand ? DebugOrigin.originatedFromCommand : DebugOrigin.originatedFromLaunchConfiguration;
    const script = session.configuration.scriptPath;
    if (!fs.existsSync(script)) {
      throw new Error(`cmake.debug.scriptPath.does.not.exist, The script path, \"${script}\", could not be found.1`);
    }
    const args: string[] = session.configuration.scriptArgs ?? [];
    const env = new Map<string, string>(session.configuration.scriptEnv?.map((e: { name: string; value: string }) => [e.name, e.value])) ?? new Map();

    executeScriptWithDebugger(script, args, env, pipeName);
    // TODO: fix it?
    while (!fs.existsSync(pipeName)) {

    }

    return new vscode.DebugAdapterNamedPipeServer(pipeName);
  }
}
