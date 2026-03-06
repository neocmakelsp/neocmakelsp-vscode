import { workspace } from "vscode";
import { substitute } from "./util.ts";

export function get<T>(key: string): T | undefined {
  return substitute(workspace.getConfiguration("neocmakelsp").get<T>(key))!;
}
