/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { workspace, ExtensionContext } from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(_context: ExtensionContext) {
  // The server is implemented in node
  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const neocmakelspExcutable = {
    command: "neocmakelsp",
    args: ['--stdio'],
  };
  const serverOptions: ServerOptions = {
    run: neocmakelspExcutable,
    debug: neocmakelspExcutable
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ scheme: 'file', language: 'cmake' }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/CMakeCache.txt')
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

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
