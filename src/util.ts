import process from 'node:process';
export function substitute<T>(val: T): T {
  if (typeof val === 'string') {
    val = val.replace(/\$\{(.*?)\}/g, (match, name) => {
      // If there's no replacement available, keep the placeholder.
      return replacement(name) ?? match;
    }) as unknown as T;
  } else if (Array.isArray(val)) {
    val = val.map(x => substitute(x)) as unknown as T;
  } else if (typeof val === 'object') {
    // Substitute values but not keys, so we don't deal with collisions.
    // deno-lint-ignore no-explicit-any
    const result = {} as { [k: string]: any };
    for (const [k, v] of Object.entries(val as object)) {
      result[k] = substitute(v);
    }
    val = result as T;
  }
  return val;
}

function replacement(name: string): string | undefined {
  const envPrefix = 'env:';
  if (name.startsWith(envPrefix)) {
    return process.env[name.substring(envPrefix.length)] ?? '';
  }
  const vscode = require('vscode');
  const configPrefix = 'config:';
  if (name.startsWith(configPrefix)) {
    const config = vscode.workspace.getConfiguration().get(name.substring(configPrefix.length));
    return typeof config === 'string' ? config : undefined;
  }
  return undefined;
}

export class Version {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;

  static parse(version: string): Version | undefined {
    const version_list = version.split('.');
    if (version_list.length == 0) {
      return;
    }
    const major = parseInt(version_list[0]);
    if (Number.isNaN(major)) {
      return;
    }
    let minor = 0;
    let patch = 0;
    if (version_list.length >= 2) {
      minor = parseInt(version_list[1]);
      if (Number.isNaN(minor)) {
        return;
      }
    }
    if (version_list.length >= 3) {
      patch = parseInt(version_list[2]);
      if (Number.isNaN(patch)) {
        return;
      }
    }
    return new Version(major, minor, patch);
  }

  constructor(major: number, minor: number, patch: number) {
    this.major = major;
    this.minor = minor;
    this.patch = patch;
  }

  bigger(other: Version): boolean {
    if (this.major > other.major) {
      return true;
    } else if (this.major < other.major) {
      return false;
    }
    if (this.minor > other.minor) {
      return true;
    } else if (this.minor < other.minor) {
      return false;
    }
    if (this.patch > other.patch) {
      return true;
    }
    return false;
  }
  smaller(other: Version): boolean {
    if (this.major < other.major) {
      return true;
    } else if (this.major > other.major) {
      return false;
    }
    if (this.minor < other.minor) {
      return true;
    } else if (this.minor > other.minor) {
      return false;
    }
    if (this.patch < other.patch) {
      return true;
    }
    return false;
  }

  equal(other: Version): boolean {
    return this.patch == other.patch && this.minor == other.minor && this.major == other.major;
  }
}
