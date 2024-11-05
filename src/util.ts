export function substitute<T>(val: T): T {
  if (typeof val === 'string') {
    val = val.replace(/\$\{(.*?)\}/g, (match, name) => {
      // If there's no replacement available, keep the placeholder.
      return replacement(name) ?? match;
    }) as unknown as T;
  } else if (Array.isArray(val))
    val = val.map((x) => substitute(x)) as unknown as T;
  else if (typeof val === 'object') {
    // Substitute values but not keys, so we don't deal with collisions.
    const result = {} as { [k: string]: any };
    for (let [k, v] of Object.entries(val))
      result[k] = substitute(v);
    val = result as T;
  }
  return val;
}

function replacement(name: string): string | undefined {
  const envPrefix = 'env:';
  if (name.startsWith(envPrefix))
    return process.env[name.substring(envPrefix.length)] ?? '';
  const vscode = require("vscode");
  const configPrefix = 'config:';
  if (name.startsWith(configPrefix)) {
    const config = vscode.workspace.getConfiguration().get(
        name.substring(configPrefix.length));
    return (typeof config === 'string') ? config : undefined;
  }
  return undefined;
}

export function version_is_latest(tag_version: string, local_version: string): boolean {
  const tag_v_list = tag_version.split('.');
  const latest_v_list = local_version.split('.');

  const max_count = 3;
  for (let index = 0; index < max_count; index++) {
    if (tag_v_list[index] > latest_v_list[index]) {
      return false
    }
  }
  return true
}
