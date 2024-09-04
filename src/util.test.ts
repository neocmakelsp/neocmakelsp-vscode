import * as assert from 'node:assert';
import { substitute } from "./util";
test("substitute", () => {
  process.env.TestEnv = "/tmp";
  const path_result = substitute<string>("${env:TestEnv}/bin/neocmakelsp");
  assert.equal(path_result, "/tmp/bin/neocmakelsp")
})
