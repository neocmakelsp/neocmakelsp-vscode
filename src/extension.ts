import { type ExtensionContext, workspace } from "vscode";
import * as vscode from "vscode";

import * as os from "node:os";

import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
} from "vscode-languageclient/node";
import { get } from "./config.ts";
import {
  CMakeDebugAdapterDescriptorFactory,
  getDebuggerPipeName,
} from "./debug.ts";
import type { SourceFileNode } from "./outlines.ts";
import { installLatestNeocmakeLsp } from "./install.ts";
let client: LanguageClient | undefined;

const platform = os.platform();
export function add(a: number, b: number): number {
  return a + b;
}
function setupDebug(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(
      "cmake",
      new CMakeDebugAdapterDescriptorFactory(),
    ),
  );
  vscode.commands.registerCommand("neocmakelsp.runScriptDebugger", () => {
    return vscode.debug.startDebugging(undefined, {
      name: "CMake debugger",
      request: "launch",
      type: "cmake",
      cmakeDebugType: "script",
      scriptPath: vscode.window.activeTextEditor!.document.uri.fsPath,
      pipeName: getDebuggerPipeName(),
    });
  });
  vscode.commands.registerCommand(
    "neocmakelsp.outline.runScriptDebugger",
    (what: SourceFileNode) => {
      return vscode.commands.executeCommand(
        "neocmakelsp.runScriptDebugger",
        what.sourcePath,
      );
    },
  ),
    vscode.commands.registerCommand(
      "neocmakelsp.runConfigureDebugger",
      () => {
        return vscode.debug.startDebugging(undefined, {
          name: "CMake debugger",
          request: "launch",
          type: "cmake",
          pipeName: getDebuggerPipeName(),
          cmakeDebugType: "configure",
        });
      },
    );
  vscode.commands.registerCommand(
    "neocmakelsp.outline.runConfigureDebugger",
    (what: SourceFileNode) => {
      return vscode.commands.executeCommand(
        "neocmakelsp.runConfigureDebugger",
        what.sourcePath,
      );
    },
  );
}
export async function activate(context: ExtensionContext) {
  if (get<boolean>("debug")) {
    setupDebug(context);
  }

  let neocmakelspExecutable = undefined;

  const tcp = get<boolean>("tcp");

  const localtarget = get<boolean>("localtarget");
  const lsp_snippets = get<boolean>("lsp_snippets");

  let ncCommand = "nc";
  if (platform == "win32") {
    ncCommand = "ncat";
  }
  if (tcp === true) {
    neocmakelspExecutable = {
      command: ncCommand,
      args: ["localhost", "9257"],
    };
  } else {
    let realPath = get<string>("path");
    if (localtarget !== true) {
      const exPath = context.extensionPath;

      const path = await installLatestNeocmakeLsp(exPath);
      if (path !== undefined) {
        realPath = path;
      }
    }
    // The server is implemented in node
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    neocmakelspExecutable = {
      command: realPath!,
      args: ["stdio"],
    };
  }
  const serverOptions: ServerOptions = {
    run: neocmakelspExecutable!,
    debug: neocmakelspExecutable!,
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ scheme: "file", language: "cmake" }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher("**/CMakeCache.txt"),
    },
    initializationOptions: {
      semantic_token: true,
      use_snippets: lsp_snippets,
    },
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    "neocmakelsp",
    "neocmakelsp",
    serverOptions,
    clientOptions,
  );

  // Start the client. This will also launch the server
  client.start();
}

export async function deactivate(): Promise<void> {
  if (!client) {
    return undefined;
  }
  await client.stop();

  client = undefined;
}
