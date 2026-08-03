import * as assert from 'assert';
import { substitute, version_is_latest } from "../util";
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test("substitute", () => {
    process.env['TestEn'] = "/tmp";
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