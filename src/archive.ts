import * as fs from 'node:fs';
import * as path from 'node:path';
import * as stream from 'node:stream';
import { promisify } from 'node:util';

import * as tar from 'tar';
import * as unzipper from 'unzipper';

const pipeline = promisify(stream.pipeline);

export async function extractArchive(
  archivePath: string,
  storagePath: string,
  fileType: 'zip' | 'tar',
  runtime: string
): Promise<string> {
  if (fileType === 'tar') {
    await tar.x({ file: archivePath, C: storagePath });
  } else {
    const directory = await unzipper.Open.file(archivePath);
    const entry = directory.files.find(
      file => file.type === 'File' && path.basename(file.path) === runtime
    );
    if (entry === undefined) {
      throw new Error(`Archive does not contain ${runtime}`);
    }
    await pipeline(entry.stream(), fs.createWriteStream(path.join(storagePath, runtime)));
  }

  const targetFile = path.join(storagePath, runtime);
  const stats = await fs.promises.stat(targetFile).catch(() => undefined);
  if (stats === undefined || stats.size === 0) {
    throw new Error(`Archive did not extract ${runtime}`);
  }
  return targetFile;
}
