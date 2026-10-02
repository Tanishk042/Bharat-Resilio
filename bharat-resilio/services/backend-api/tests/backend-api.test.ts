import { test } from "node:test";
import assert from "node:assert/strict";
import { Store, WSEventMap, type WsChannel } from "../src/server";
import { PassThrough } from "node:stream";

const uniq = (s: string) => `/tmp/${s}-${process.pid}-${Date.now()}.json`;

test("Store: incident corroboration pending -> verified", () => {
  const store = new Store(uniq("oracle-inc"), uniq("oracle-users"));
  const a = store.submit({ incident_id: "i1", hazard_type: "flood", location: "Sector A", severity: 7 });
  assert.equal(a.status, "pending");
  assert.equal(a.corroborations, 0);

  const b = store.submit({ incident_id: "i2", hazard_type: "flood", location: "Sector A", severity: 8 });
  assert.equal(b.status, "verified");
  assert.equal(b.corroborations, 1);

  assert.equal(store.list("verified").length, 1);
  assert.equal(store.get("i1")!.severity, 7);
});

test("Store: auth register/login/otp flow", () => {
  const store = new Store(uniq("oracle-inc2"), uniq("oracle-users2"));
  const user = store.register({ role: "civilian", name: "T", email: "t@e.com", password: "pw" });
  assert.equal(user.email, "t@e.com");
  assert.ok(store.verifyLogin("t@e.com", "pw"));

  const otpRes = store.requestOtp("t@e.com");
  assert.ok(otpRes);
  assert.ok(store.verifyOtp("t@e.com", otpRes.otp));
  assert.equal(store.verifyLogin("t@e.com", "wrong"), null);
});

test("WSEventMap: only subscribed channels receive frames", () => {
  const map = new WSEventMap();
  const a = new PassThrough();
  const b = new PassThrough();
  const frames: string[] = [];
  const framesB: string[] = [];
  a.on("data", (c: Buffer) => frames.push(c.toString("utf8")));
  b.on("data", (c: Buffer) => framesB.push(c.toString("utf8")));

  map.add(a as never, ["incidents"] as WsChannel[]);
  map.add(b as never, ["alerts"] as WsChannel[]);

  map.emit("incidents", { id: 1 });
  map.emit("alerts", { id: 2 });

  assert.equal(frames.length, 1);
  assert.equal(framesB.length, 1);
});