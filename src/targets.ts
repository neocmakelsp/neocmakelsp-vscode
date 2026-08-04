import * as vscodelc from 'vscode-languageclient/node';
import * as vscode from 'vscode';
import { NeocmakeContext } from './extension';

const TargetMethod = "neocmake/cmake_targets";

const TargetRequestType = new vscodelc.RequestType0<CMakeTargets | null, void>(TargetMethod)

export type Target = {
  build_type: string,
  name: string,
  info: TargetInfo
}

export type TargetInfo = {
  artifacts: [Artifact],
  type: string,
  [key: string]: unknown
}

export type Artifact = {
  path: string,
  [key: string]: unknown
}

export type CMakeTargets = {
  [key: string]: Target
}

export function activate(context: NeocmakeContext) {
  const feature = new TargetFeature(context);
  context.client.registerFeature(feature);
}

class TargetFeature implements vscodelc.StaticFeature {
  constructor(private context: NeocmakeContext) {
    const adapter = new TargetsProvider();
    const tree = vscode.window.createTreeView("neocmakelsp.cmakeTargets", { treeDataProvider: adapter });
    context.subscriptions.push(tree,
      adapter.onDidChangeTreeData((_) => {
        vscode.commands.executeCommand('setContext', 'neocmakelsp.cmakeTargets.hasData', true)
        // @ts-ignore
        tree.reveal(null)
      }),
      vscode.commands.registerTextEditorCommand("neocmakelsp.cmakeTargets", async (_editor, _edit) => {
        const item = await this.context.client.sendRequest(TargetRequestType);
        adapter.setTargets(item);
      })
    )
  }
  initialize(_capabilities: vscodelc.ServerCapabilities, _documentSelector: vscodelc.DocumentSelector | undefined): void {

  }
  fillClientCapabilities(_capabilities: vscodelc.ClientCapabilities): void {

  }
  clear(): void {

  }
  getState(): vscodelc.FeatureState {
    return { kind: "static" }
  }
}

export class TargetsProvider implements vscode.TreeDataProvider<Target> {
  targets: CMakeTargets | null = null;

  private _onDidChangeTreeData = new vscode.EventEmitter<Target | null>();
  readonly onDidChangeTreeData: vscode.Event<Target | null> = this._onDidChangeTreeData.event;
  setTargets(targets: CMakeTargets | null) {
    this.targets = targets;
    this._onDidChangeTreeData.fire(null)
  }
  getChildren(element?: Target | undefined): Target[] {
    if (element != undefined || this.targets == undefined) {
      return []
    }
    return Object.values(this.targets);
  }
  getTreeItem(element: Target): vscode.TreeItem {
    return new vscode.TreeItem(element.name)
  }

  getParent(_element: Target): Target | undefined {
    return undefined
  }
}
