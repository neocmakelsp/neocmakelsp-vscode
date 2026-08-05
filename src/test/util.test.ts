import * as assert from 'assert';
import { describe, test } from '@jest/globals';
import { substitute, Version } from '../util';

describe('Extension Test Suite', () => {
  test('substitute', () => {
    process.env['TestEnv'] = '/tmp';
    const path_result = substitute<string>('${env:TestEnv}/bin/neocmakelsp');
    assert.equal(path_result, '/tmp/bin/neocmakelsp');
    const path_result_normal = substitute<string>('/usr/bin/neocmakelsp');
    assert.equal(path_result_normal, '/usr/bin/neocmakelsp');
  });
});

describe('Version Test', () => {
  test('Can parse', () => {
    assert.ok(Version.parse('1.1.1')!);
    assert.ok(Version.parse('0.1.1')!);
    assert.ok(Version.parse('0.0.1')!);
    assert.ok(Version.parse('1.0.1')!);
    assert.ok(Version.parse('1.0')!);
    assert.ok(Version.parse('1')!);
    assert.ok(Version.parse('1.2.3.4')!);
    assert.equal(Version.parse('abc'), undefined);
    assert.equal(Version.parse('abc.1.2'), undefined);
  });

  test('Big or smaller', () => {
    assert.equal(Version.parse('1.2.3')?.bigger(Version.parse('1.2.0')!), true);
    assert.equal(Version.parse('1.3.3')?.bigger(Version.parse('1.2.3')!), true);
    assert.equal(Version.parse('2.2.3')?.bigger(Version.parse('1.2.3')!), true);
    assert.equal(Version.parse('1.2.3')?.equal(Version.parse('1.2.3')!), true);
    assert.equal(Version.parse('1.2.3')?.equal(new Version(1, 2, 3)), true);
    assert.equal(Version.parse('0.2.3')?.smaller(new Version(1, 2, 3)), true);
    assert.equal(Version.parse('1.1.3')?.smaller(new Version(1, 2, 3)), true);
    assert.equal(Version.parse('1.2.2')?.smaller(new Version(1, 2, 3)), true);
  });
});
