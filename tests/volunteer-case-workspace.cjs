const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const component = fs.readFileSync(
  path.join(__dirname, "..", "components", "admin", "VolunteerCaseWorkspace.tsx"),
  "utf8",
);

test("workspace renders only the selected tab panel", () => {
  assert.match(component, /const activePanel = Children\.toArray\(children\)\.find/);
  assert.match(component, /child\.props\["data-case-section"\] === activeId/);
  assert.match(component, /role="tabpanel"/);
  assert.match(component, /\{activePanel\}/);
  assert.doesNotMatch(component, /querySelectorAll/);
  assert.doesNotMatch(component, /window\.history/);
});

test("workspace navigation exposes accessible selected-tab state", () => {
  assert.match(component, /role="tablist"/);
  assert.match(component, /role="tab"/);
  assert.match(component, /aria-selected=\{selected\}/);
  assert.match(component, /scrollIntoView/);
});
