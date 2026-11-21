import * as assert from 'assert';
import { describe, test } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { DEBUG_TYPE } from '../debugType';

type DebugConfiguration = { type?: string };
type DebuggerContribution = {
  type: string;
  initialConfigurations?: DebugConfiguration[];
  configurationSnippets?: Array<{ body?: DebugConfiguration }>;
};
type CommandContribution = { command: string; when?: string };
type PackageManifest = {
  activationEvents?: string[];
  contributes: {
    debuggers: DebuggerContribution[];
    commands?: CommandContribution[];
    menus?: { commandPalette?: CommandContribution[] };
  };
};

function readManifest(): PackageManifest {
  const manifestPath = path.resolve(__dirname, '..', '..', 'package.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as PackageManifest;
}

describe('Debugger Manifest Test', () => {
  test('uses a debugger type that cannot collide with CMake Tools', () => {
    const manifest = readManifest();
    assert.strictEqual(manifest.contributes.debuggers.length, 1);
    const debuggerContribution = manifest.contributes.debuggers[0];
    assert.strictEqual(debuggerContribution.type, DEBUG_TYPE);
    assert.notStrictEqual(debuggerContribution.type, 'cmake');

    for (const configuration of debuggerContribution.initialConfigurations ?? []) {
      assert.strictEqual(configuration.type, DEBUG_TYPE);
    }
    for (const snippet of debuggerContribution.configurationSnippets ?? []) {
      assert.strictEqual(snippet.body?.type, DEBUG_TYPE);
    }
    assert.ok(manifest.activationEvents?.includes(`onDebugResolve:${DEBUG_TYPE}`));
  });

  test('shows debug commands only when the setting is enabled', () => {
    const manifest = readManifest();
    const debugCommands = (manifest.contributes.commands ?? []).filter(command =>
      command.command.includes('Debugger')
    );
    assert.strictEqual(debugCommands.length, 4);

    const debugPaletteEntries = (manifest.contributes.menus?.commandPalette ?? []).filter(command =>
      command.command.includes('Debugger')
    );
    assert.strictEqual(debugPaletteEntries.length, debugCommands.length);
    for (const command of debugCommands) {
      const entry = debugPaletteEntries.find(entry => entry.command === command.command);
      assert.ok(entry, `${command.command} should have a command palette entry`);
      assert.strictEqual(entry.when, 'config.neocmakelsp.debug');
    }
  });
});
