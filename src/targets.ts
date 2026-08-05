import * as vscodelc from 'vscode-languageclient/node';
import * as vscode from 'vscode';
import { NeocmakeContext } from './extension';
import * as path from 'path';
import { Version } from './util';
import * as childProcess from 'node:child_process';
const TargetMethod = 'neocmake/cmake_targets';

const TargetRequestType = new vscodelc.RequestType0<CMakeTargets | null, void>(TargetMethod);

const TargetVersion = new Version(0, 11, 0);

export type Target = {
  build_type: string;
  name: string;
  info: TargetInfo;
};

export type TargetInfo = {
  artifacts: Artifact[];
  type: string;
  [key: string]: unknown;
};

export type Artifact = {
  path: string;
  [key: string]: unknown;
};

export type CMakeTargets = {
  [key: string]: Target;
};

export function activate(context: NeocmakeContext) {
  context.onDidFinish(async () => {
    const clientVersion = context.client.initializeResult?.serverInfo?.version;
    if (clientVersion != undefined && Version.parse(clientVersion)?.bigger(TargetVersion)) {
      const feature = new TargetFeature(context);
      context.client.registerFeature(feature);
      await feature.refresh();
    }
  });
}

class TargetFeature implements vscodelc.StaticFeature {
  adapter: TargetsProvider;
  constructor(private context: NeocmakeContext) {
    const adapter = new TargetsProvider();
    const runChannel = vscode.window.createOutputChannel('Neocmake run');
    const buildChannel = vscode.window.createOutputChannel('Neocmake build');
    const tree = vscode.window.createTreeView('neocmakelsp.cmakeTargets', {
      treeDataProvider: adapter,
    });
    context.subscriptions.push(
      tree,
      adapter.onDidChangeTreeData(_ => {
        vscode.commands.executeCommand('setContext', 'neocmakelsp.cmakeTargets.hasData', true);
        // @ts-ignore
        tree.reveal(null);
      }),
      vscode.commands.registerCommand('neocmakelsp.cmakeTargets.refreshEntry', async () => {
        await this.refresh();
      }),
      vscode.commands.registerCommand('neocmakelsp.cmakeTargets.build', async (target: Target) => {
        const len = vscode.workspace.workspaceFolders?.length;
        if (len == undefined || len < 1) {
          return;
        }
        if (target.info.artifacts.length == 0) {
          return;
        }
        buildChannel.show(true);
        const forder = vscode.workspace.workspaceFolders![0];
        const folder = forder.uri.fsPath;
        const target_name = target.name;
        const child = childProcess.exec(`cmake --build build --target ${target_name}`, {
          cwd: folder,
        });
        const stdout = (async () => {
          if (child.stdout == null) {
            return;
          }
          for await (const chunk of child.stdout) {
            buildChannel.appendLine(chunk);
          }
        })();
        const stderr = (async () => {
          if (child.stderr == null) {
            return;
          }
          for await (const chunk of child.stderr) {
            buildChannel.appendLine(chunk);
          }
        })();
        await Promise.all([stderr, stdout]);
      }),
      vscode.commands.registerCommand('neocmakelsp.cmakeTargets.run', async (target: Target) => {
        const len = vscode.workspace.workspaceFolders?.length;
        if (len == undefined || len < 1) {
          return;
        }
        if (target.info.artifacts.length == 0) {
          return;
        }
        runChannel.show(true);
        const forder = vscode.workspace.workspaceFolders![0];
        const folder = forder.uri.fsPath;
        const target_path = target.info.artifacts[0].path;
        const bin_path = path.join(folder, 'build', target_path);
        const child = childProcess.spawn(bin_path, []);
        const stdout = (async () => {
          for await (const chunk of child.stdout) {
            runChannel.appendLine(chunk);
          }
        })();
        const stderr = (async () => {
          for await (const chunk of child.stderr) {
            runChannel.appendLine(chunk);
          }
        })();
        await Promise.all([stderr, stdout]);
      }),

      vscode.commands.registerTextEditorCommand(
        'neocmakelsp.cmakeTargets',
        async (_editor, _edit) => {
          await this.refresh();
        }
      )
    );
    this.adapter = adapter;
  }
  async refresh() {
    const item = await this.context.client.sendRequest(TargetRequestType);
    this.adapter.setTargets(item);
  }
  initialize(
    _capabilities: vscodelc.ServerCapabilities,
    _documentSelector: vscodelc.DocumentSelector | undefined
  ): void {}
  fillClientCapabilities(_capabilities: vscodelc.ClientCapabilities): void {}
  clear(): void {}
  getState(): vscodelc.FeatureState {
    return { kind: 'static' };
  }
}

export class TargetsProvider implements vscode.TreeDataProvider<Target> {
  targets: CMakeTargets | null = null;

  private _onDidChangeTreeData = new vscode.EventEmitter<Target | null>();
  readonly onDidChangeTreeData: vscode.Event<Target | null> = this._onDidChangeTreeData.event;
  setTargets(targets: CMakeTargets | null) {
    this.targets = targets;
    this._onDidChangeTreeData.fire(null);
  }
  getChildren(element?: Target | undefined): Target[] {
    if (element != undefined || this.targets == undefined) {
      return [];
    }
    return Object.values(this.targets);
  }

  getTreeItem(element: Target): TargetItem {
    return new TargetItem(element);
  }

  getParent(_element: Target): Target | undefined {
    return undefined;
  }
}

class TargetItem extends vscode.TreeItem {
  constructor(
    public readonly element: Target,
    public readonly collapsibleState?: vscode.TreeItemCollapsibleState
  ) {
    super(element.name, collapsibleState);
    this.tooltip = `${element.name}-${element.build_type}`;
    if (element.info.type == 'EXECUTABLE') {
      this.contextValue = 'executable';
    } else {
      this.contextValue = 'library';
    }
  }
}
