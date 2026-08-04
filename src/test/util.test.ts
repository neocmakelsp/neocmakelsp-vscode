import * as assert from 'assert';
import { describe, test } from '@jest/globals';
import { substitute, version_is_latest } from "../util";

describe('Extension Test Suite', () => {
  test("substitute", () => {
    process.env['TestEnv'] = "/tmp";
    const path_result = substitute<string>("${env:TestEnv}/bin/neocmakelsp");
    assert.equal(path_result, "/tmp/bin/neocmakelsp");
    const path_result_normal = substitute<string>("/usr/bin/neocmakelsp");
    assert.equal(path_result_normal, "/usr/bin/neocmakelsp");

  });
  test("version latest check", () => {
    assert.equal(true, version_is_latest("1.1.1.2", "1.1.1"));
    assert.equal(false, version_is_latest("1.1.1", "1.0.1"));
  });
});
