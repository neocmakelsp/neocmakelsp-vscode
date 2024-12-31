import * as vscode from "vscode"
export type SourceFileNode = {
  folder?: vscode.WorkspaceFolder,
  sourcePath: vscode.Uri,
  language?: string
}
