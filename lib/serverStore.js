import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = path.join('/tmp', 'blue-lifeline-demo-store.json');

function nowIso() {
  return new Date().toISOString();
}

export function readStore() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return { records: [], events: [], reports: [] };
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (_err) {
    return { records: [], events: [], reports: [] };
  }
}

export function writeStore(store) {
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2));
}

export function addSensorRecord(type, payload, metadata) {
  const store = readStore();
  const record = {
    id: crypto.randomUUID(),
    type,
    data: payload,
    metadata,
    createdAt: nowIso()
  };
  store.records.push(record);
  writeStore(store);
  return record;
}

export function listSensorRecords() {
  return readStore().records;
}

export function addAuditEvent(event) {
  const store = readStore();
  const persisted = {
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    ...event
  };
  store.events.push(persisted);
  writeStore(store);
  return persisted;
}

export function listAuditEvents() {
  return readStore().events;
}

export function saveReport(report) {
  const store = readStore();
  const persisted = {
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    ...report
  };
  store.reports.push(persisted);
  writeStore(store);
  return persisted;
}

export function listReports() {
  return readStore().reports;
}
