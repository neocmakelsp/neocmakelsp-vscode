import { workspace, ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from 'vscode-languageclient/node';
import { installLatestNeocmakeLsp } from './download';

import { CMakeDebugAdapterDescriptorFactory, getDebuggerPipeName } from "./debug"

import * as vscode from "vscode"
import * as os from 'node:os'
import { get } from './config';
import { SourceFileNode } from './outlines';

const arch = os.arch();

let client: LanguageClient;

function setup(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory("cmake", new CMakeDebugAdapterDescriptorFactory)
  );
  vscode.commands.registerCommand('neocmakelsp.runDebugger', async (uri: vscode.Uri) => {
    vscode.window.showInformationMessage(`hey`);
    vscode.window.showInformationMessage(`${vscode.window.activeTextEditor.document.uri}`);
    return vscode.debug.startDebugging(undefined, {
      name: "CMake debugger",
      request: "launch",
      type: "cmake",
      scriptPath: vscode.window.activeTextEditor.document.uri.fsPath,
      pipeName: getDebuggerPipeName()
    });
  })
  vscode.commands.registerCommand('neocmakelsp.outline.runDebugger', async (what: SourceFileNode) => {
    return vscode.commands.executeCommand("neocmakelsp.runDebugger", what.sourcePath)
  })
}

export async function activate(context: ExtensionContext) {
  setup(context);
  let neocmakelspExecutable = undefined;

  const tcp = get<boolean>("tcp");

  const localtarget = get<boolean>("localtarget");

  let ncCommand = "nc";
  if (arch == "win32") {
    ncCommand = "ncat";
  }
  if (tcp === true) {
    neocmakelspExecutable = {
      command: ncCommand,
      args: ['localhost', '9257']
    }
  } else {
    let realPath = get<string>("path");
    if (localtarget !== true) {
      const exPath = context.extensionPath;

      let path = await installLatestNeocmakeLsp(exPath);
      if (path !== undefined) {
        realPath = path;
      }
    }
    // The server is implemented in node
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    neocmakelspExecutable = {
      command: realPath,
      args: ['--stdio'],
    };
  }
  const serverOptions: ServerOptions = {
    run: neocmakelspExecutable,
    debug: neocmakelspExecutable
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ scheme: 'file', language: 'cmake' }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/CMakeCache.txt')
    },
    initializationOptions: {
      semantic_token: true
    }
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    'neocmakelsp',
    'neocmakelsp',
    serverOptions,
    clientOptions
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
