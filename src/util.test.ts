import * as assert from 'node:assert';
import { substitute } from "./util";
test("substitute", () => {
  process.env.TestEnv = "/tmp";
  const path_result = substitute<string>("${env:TestEnv}/bin/neocmakelsp");
  assert.equal(path_result, "/tmp/bin/neocmakelsp");
  const path_result_normal = substitute<string>("/usr/bin/neocmakelsp");
  assert.equal(path_result_normal, "/usr/bin/neocmakelsp")
})
