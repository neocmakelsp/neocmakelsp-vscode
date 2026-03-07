import { substitute, version_is_latest } from "./util.ts";
import { assertEquals } from "@std/assert";
Deno.test("substitute", () => {
  Deno.env.set("TestEnv", "/tmp");
  const path_result = substitute<string>("${env:TestEnv}/bin/neocmakelsp");
  assertEquals(path_result, "/tmp/bin/neocmakelsp");
  const path_result_normal = substitute<string>("/usr/bin/neocmakelsp");
  assertEquals(path_result_normal, "/usr/bin/neocmakelsp");
});

Deno.test("version latest check", () => {
  assertEquals(true, version_is_latest("1.1.1.2", "1.1.1"));
  assertEquals(false, version_is_latest("1.1.1", "1.0.1"));
});
