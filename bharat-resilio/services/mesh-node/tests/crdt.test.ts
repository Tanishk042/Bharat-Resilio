import assert from "node:assert/strict";

import { MeshState } from "../src/crdt";

function incidentState(state: MeshState) {
  return {
    incidents: state.incidentsSnapshot(),
    registry: state.registrySnapshot(),
    lamport: state.currentLamport()
  };
}

export function runCrdtTests(): void {
  const left = new MeshState("left");
  const right = new MeshState("right");

  left.upsertIncident({
    id: "incident-a",
    kind: "flood",
    location: "sector-1",
    severity: 4,
    description: "water rise",
    reporterNodeId: "left"
  });
  right.upsertIncident({
    id: "incident-b",
    kind: "fire",
    location: "sector-2",
    severity: 6,
    description: "warehouse ignition",
    reporterNodeId: "right"
  });

  const leftThenRight = new MeshState("merge-1");
  leftThenRight.mergeState(incidentState(left));
  leftThenRight.mergeState(incidentState(right));

  const rightThenLeft = new MeshState("merge-2");
  rightThenLeft.mergeState(incidentState(right));
  rightThenLeft.mergeState(incidentState(left));

  assert.deepEqual(
    leftThenRight.incidentsSnapshot(),
    rightThenLeft.incidentsSnapshot(),
    "merge must be commutative"
  );

  const one = new MeshState("one");
  const two = new MeshState("two");
  const three = new MeshState("three");

  one.upsertIncident({
    id: "incident-1",
    kind: "storm",
    location: "alpha",
    severity: 5,
    description: "heavy winds",
    reporterNodeId: "one"
  });
  two.upsertIncident({
    id: "incident-2",
    kind: "quake",
    location: "beta",
    severity: 7,
    description: "aftershock",
    reporterNodeId: "two"
  });
  three.upsertIncident({
    id: "incident-3",
    kind: "landslide",
    location: "gamma",
    severity: 8,
    description: "road blocked",
    reporterNodeId: "three"
  });

  const groupedLeft = new MeshState("assoc-left");
  groupedLeft.mergeState(incidentState(one));
  groupedLeft.mergeState(incidentState(two));
  groupedLeft.mergeState(incidentState(three));

  const groupedRight = new MeshState("assoc-right");
  groupedRight.mergeState(incidentState(two));
  groupedRight.mergeState(incidentState(three));
  groupedRight.mergeState(incidentState(one));

  assert.deepEqual(
    groupedLeft.incidentsSnapshot(),
    groupedRight.incidentsSnapshot(),
    "merge must be associative"
  );

  const idempotent = new MeshState("idempotent");
  idempotent.mergeState(incidentState(left));
  const once = idempotent.incidentsSnapshot();
  idempotent.mergeState(incidentState(left));

  assert.deepEqual(idempotent.incidentsSnapshot(), once, "merge must be idempotent");
}
