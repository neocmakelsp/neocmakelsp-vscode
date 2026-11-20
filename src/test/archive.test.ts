import * as assert from 'assert';
import { afterEach, describe, test } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { extractArchive } from '../archive';

// zip containing a single file: neocmakelsp.exe -> "fake-binary"
const ZIP_BASE64 =
  'UEsDBBQAAAAAAPSydF2FI7ZyCwAAAAsAAAAPAAAAbmVvY21ha2Vsc3AuZXhlZmFrZS1iaW5hcnlQSwECFAAU' +
  'AAAAAAD0snRdhSO2cgsAAAALAAAADwAAAAAAAAAAAAAAgAEAAAAAbmVvY21ha2Vsc3AuZXhlUEsFBgAAAAAB' +
  'AAEAPQAAADgAAAAAAA==';

describe('Archive Test', () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir !== undefined) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  async function writeFixture(): Promise<string> {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'neocmakelsp-archive-'));
    const archivePath = path.join(tempDir, 'neocmakelsp.zip');
    await fs.promises.writeFile(archivePath, Buffer.from(ZIP_BASE64, 'base64'));
    return archivePath;
  }

  test('waits for the zip entry to be written', async () => {
    const archivePath = await writeFixture();
    const target = await extractArchive(archivePath, tempDir!, 'zip', 'neocmakelsp.exe');

    assert.equal(target, path.join(tempDir!, 'neocmakelsp.exe'));
    assert.equal(await fs.promises.readFile(target, 'utf8'), 'fake-binary');
    await fs.promises.rm(archivePath);
  });

  test('rejects an archive without the runtime', async () => {
    const archivePath = await writeFixture();

    await assert.rejects(
      () => extractArchive(archivePath, tempDir!, 'zip', 'neocmakelsp'),
      /Archive does not contain neocmakelsp/
    );
  });
});
