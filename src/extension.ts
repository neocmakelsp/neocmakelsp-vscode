import { type ExtensionContext, workspace } from 'vscode';
import * as vscode from 'vscode';
import * as targets from './targets';

import * as os from 'node:os';

import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
} from 'vscode-languageclient/node';
import { get } from './config';
import { CMakeDebugAdapterDescriptorFactory, getDebuggerPipeName } from './debug';
import { DEBUG_TYPE } from './debugType';
import type { SourceFileNode } from './outlines';
import { installLatestNeocmakeLsp } from './install';

const platform = os.platform();

function setupDebug(subscriptions: vscode.Disposable[]) {
  subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(
      DEBUG_TYPE,
      new CMakeDebugAdapterDescriptorFactory()
    )
  );

  subscriptions.push(
    vscode.commands.registerCommand('neocmakelsp.runScriptDebugger', (scriptPath?: string) => {
      const path = scriptPath ?? vscode.window.activeTextEditor?.document.uri.fsPath;
      if (path === undefined) {
        void vscode.window.showErrorMessage(
          'Open a CMake script or select one in the Outline view before starting the debugger.'
        );
        return false;
      }
      return vscode.debug.startDebugging(undefined, {
        name: 'neocmakelsp CMake script',
        request: 'launch',
        type: DEBUG_TYPE,
        cmakeDebugType: 'script',
        scriptPath: path,
        pipeName: getDebuggerPipeName(),
      });
    })
  );

  subscriptions.push(
    vscode.commands.registerCommand(
      'neocmakelsp.outline.runScriptDebugger',
      (what?: SourceFileNode) => {
        return vscode.commands.executeCommand(
          'neocmakelsp.runScriptDebugger',
          what?.sourcePath.fsPath
        );
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerCommand('neocmakelsp.runConfigureDebugger', () => {
      return vscode.debug.startDebugging(undefined, {
        name: 'neocmakelsp CMake configure',
        request: 'launch',
        type: DEBUG_TYPE,
        pipeName: getDebuggerPipeName(),
        cmakeDebugType: 'configure',
      });
    })
  );

  subscriptions.push(
    vscode.commands.registerCommand('neocmakelsp.outline.runConfigureDebugger', () => {
      return vscode.commands.executeCommand('neocmakelsp.runConfigureDebugger');
    })
  );
}

export class NeocmakeContext implements vscode.Disposable {
  subscriptions: vscode.Disposable[];
  client: LanguageClient;

  private _onDidFinish = new vscode.EventEmitter<void>();
  readonly onDidFinish: vscode.Event<void> = this._onDidFinish.event;
  static async create(context: ExtensionContext): Promise<NeocmakeContext> {
    const subscriptions: vscode.Disposable[] = [];
    setupDebug(subscriptions);

    let neocmakelspExecutable = undefined;

    const tcp = get<boolean>('tcp');

    const localtarget = get<boolean>('localtarget');
    const lsp_snippets = get<boolean>('lsp_snippets');

    let ncCommand = 'nc';
    if (platform === 'win32') {
      ncCommand = 'ncat';
    }
    if (tcp === true) {
      neocmakelspExecutable = {
        command: ncCommand,
        args: ['localhost', '9257'],
      };
    } else {
      let realPath = get<string>('path');
      if (localtarget !== true) {
        const exPath = context.extensionPath;

        const path = await installLatestNeocmakeLsp(exPath);
        if (path === undefined) {
          throw new Error(
            'Failed to install neocmakelsp. Set "neocmakelsp.localtarget": true and "neocmakelsp.path" to a local neocmakelsp executable.'
          );
        }
        realPath = path;
      }
      // The server is implemented in node
      // If the extension is launched in debug mode then the debug server options are used
      // Otherwise the run options are used
      neocmakelspExecutable = {
        command: realPath!,
        args: ['stdio'],
      };
    }
    const serverOptions: ServerOptions = {
      run: neocmakelspExecutable!,
      debug: neocmakelspExecutable!,
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
      // Register the server for plain text documents
      documentSelector: [{ scheme: 'file', language: 'cmake' }],
      synchronize: {
        // Notify the server about file changes to '.clientrc files contained in the workspace
        fileEvents: workspace.createFileSystemWatcher('**/CMakeCache.txt'),
      },
      initializationOptions: {
        semantic_token: true,
        use_snippets: lsp_snippets,
      },
    };

    // Create the language client and start the client.
    const client = new LanguageClient('neocmakelsp', 'neocmakelsp', serverOptions, clientOptions);
    return new NeocmakeContext(subscriptions, client);
  }

  private constructor(subscriptions: vscode.Disposable[], client: LanguageClient) {
    this.subscriptions = subscriptions;
    this.client = client;
    this.startClient();
  }

  async startClient() {
    targets.activate(this);
    await this.client.start();
    this._onDidFinish.fire();
  }

  dispose() {
    this.subscriptions.forEach(d => {
      d.dispose();
    });
    if (this.client) {
      this.client.stop();
    }
    this.subscriptions = [];
  }
}

export async function activate(context: ExtensionContext) {
  return await NeocmakeContext.create(context);
}
