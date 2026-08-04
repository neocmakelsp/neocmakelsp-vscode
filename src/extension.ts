import { type ExtensionContext, workspace } from "vscode";
import * as vscode from "vscode";
import * as targets from "./targets"

import * as os from "node:os";

import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
} from "vscode-languageclient/node";
import { get } from "./config";
import {
  CMakeDebugAdapterDescriptorFactory,
  getDebuggerPipeName,
} from "./debug";
import type { SourceFileNode } from "./outlines";
import { installLatestNeocmakeLsp } from "./install";

const platform = os.platform();

function setupDebug(subscriptions: vscode.Disposable[]) {
  subscriptions.push(
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

export class NeocmakeContext implements vscode.Disposable {
  subscriptions: vscode.Disposable[];
  client: LanguageClient;

  static async create(
    context: ExtensionContext
  ): Promise<NeocmakeContext> {
    const subscriptions: vscode.Disposable[] = []
    if (get<boolean>("debug")) {
      setupDebug(subscriptions);
    }

    let neocmakelspExecutable = undefined;

    const tcp = get<boolean>("tcp");

    const localtarget = get<boolean>("localtarget");
    const lsp_snippets = get<boolean>("lsp_snippets");

    let ncCommand = "nc";
    if (platform === "win32") {
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
    const client = new LanguageClient(
      "neocmakelsp",
      "neocmakelsp",
      serverOptions,
      clientOptions,
    );
    return new NeocmakeContext(subscriptions, client)
  }

  private constructor(subscriptions: vscode.Disposable[], client: LanguageClient) {
    this.subscriptions = subscriptions;
    this.client = client;
    this.startClient();
  }

  async startClient() {
    targets.activate(this);
    this.client.start()
  }

  dispose() {
    this.subscriptions.forEach((d) => { d.dispose(); });
    if (this.client) {
      this.client.stop();
    }
    this.subscriptions = [];
  }
}

export async function activate(context: ExtensionContext) {
  return await NeocmakeContext.create(context)
}
