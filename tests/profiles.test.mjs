import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import CONSTANTS from "../scripts/constants.js";

const hooks = new Map();
globalThis.window = {};
globalThis.Hooks = { once: (key, fn) => hooks.set(key, fn), call() {} };
class ApplicationV2 { render() { return this; } }
globalThis.foundry = { utils: { deepClone: value => Array.isArray(value) ? value.map(item => structuredClone(item)) : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, { ...item }])) }, applications: { api: { ApplicationV2, HandlebarsApplicationMixin: cls => cls } } };
const registry = new Map();
const saved = new Map();
let Menu;
let failKey;
globalThis.game = { i18n: { localize: key => key }, settings: {
 settings: registry,
 register(module, key, definition) { registry.set(`${module}.${key}`, definition); saved.set(`${module}.${key}`, definition.default); },
 registerMenu(module, key, definition) { Menu = definition.type; assert.equal(definition.restricted, false); },
 get(module, key) { return saved.get(`${module}.${key}`); },
 async set(module, key, value) {
  if (`${module}.${key}` === failKey) throw new Error("Simulated storage failure");
  await new Promise(resolve => setImmediate(resolve));
  saved.set(`${module}.${key}`, value);
 }
} };
await import("../scripts/main.js");
hooks.get("init")();
for (const settings of CONSTANTS.BASE_SETTINGS) for (const key of Object.keys(settings.core)) registry.set(`core.${key}`, { scope: "client" });
const form = value => ({ querySelector: () => ({ getAttribute: () => String(value) }) });

test("all profiles persist their original graphics settings before completion", async () => {
 for (let level = 0; level < 3; level++) {
  await Menu.myFormHandler(null, form(level), null);
  for (const [key, value] of Object.entries(CONSTANTS.BASE_SETTINGS[level].core)) assert.equal(saved.get(`core.${key}`), value);
  assert.equal(saved.get("anti-lagger.potatoLevel"), level);
  assert.equal(saved.get("anti-lagger.hasBeenPrompted"), true);
 }
 assert.throws(() => { window.AntiLagger.quality = 0.5; });
});

test("removed and world settings are skipped", async () => {
 window.AntiLagger.addSetting(1, "core", "removed", true);
 window.AntiLagger.addSetting(1, "core", "worldOnly", true);
 registry.set("core.worldOnly", { scope: "world" });
 await Menu.myFormHandler(null, form(1), null);
 assert.equal(saved.has("core.removed"), false);
 assert.equal(saved.has("core.worldOnly"), false);
});

test("failed write does not mark prompt complete or persist chosen profile", async () => {
 saved.set("anti-lagger.hasBeenPrompted", false);
 const previous = saved.get("anti-lagger.potatoLevel");
 failKey = "core.maxFPS";
 await assert.rejects(Menu.myFormHandler(null, form(0), null), /Failed to save/);
 assert.equal(saved.get("anti-lagger.hasBeenPrompted"), false);
 assert.equal(saved.get("anti-lagger.potatoLevel"), previous);
 failKey = undefined;
});

test("manifest, translations and template paths agree", () => {
 const manifest = JSON.parse(fs.readFileSync(new URL("../module.json", import.meta.url)));
 assert.equal(manifest.id, "anti-lagger");
 assert.equal(manifest.compatibility.verified, "14.365");
 for (const lang of manifest.languages) {
  const data = JSON.parse(fs.readFileSync(new URL(`../${lang.path}`, import.meta.url)));
  assert.equal(data["AntiLagger.BadTitle"], "Lagger");
  assert.equal(data["AntiLagger.MediumTitle"], "Normal");
  assert.equal(data["AntiLagger.GoodTitle"], "Lagger not needed");
 }
 const template = fs.readFileSync(new URL("../templates/potato-template.hbs", import.meta.url), "utf8");
 assert.equal(template.includes("modules/potato-or-not/"), false);
 assert.equal(template.includes('type="submit"'), true);
});
