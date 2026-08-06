import assert from "node:assert/strict";
import test from "node:test";

import { openDeveloperConsole, readEnabledDecision } from "../src/devtools_rollout.ts";

test("reads the flags.is_enabled response envelope data", () => {
  assert.equal(readEnabledDecision({ key: "developer_console", value: true, enabled: true }), true);
});

test("keeps the standard toolbar outside the developer-tools cohort", async () => {
  const tool = await openDeveloperConsole(async () => false);
  assert.equal(tool, "standard-toolbar");
});

test("opens the developer console for an enabled decision", async () => {
  const tool = await openDeveloperConsole(async () => true);
  assert.equal(tool, "developer-console");
});
