import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Walkin from '../model/Walkin.js';

const SOURCE_PATH = process.env.LEGACY_WALKIN_FILE || 'D:\\DB-data.json';

const STATUS_MAP = new Map([
  ['return', 'Return'],
  ['rentout', 'Rentout'],
  ['booked', 'Booked'],
  ['booking & rentout', 'Booking & Rentout'],
  ['loss', 'Loss'],
  ['trial', 'Trial'],
  ['enquiry', 'Enquiry'],
  ['reissue', 'Reissue'],
  ['revisit booking', 'Revisit Booking'],
  ['revisit loss', 'Revisit Loss'],
  ['new walkin', 'New Walkin'],
  ['other', 'Other'],
]);

function asString(value, fallback = '-') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim();
}

function normalizeStatus(value) {
  const raw = asString(value, 'New Walkin');
  return STATUS_MAP.get(raw.toLowerCase()) || raw;
}

function parseDateOnly(value) {
  if (!value) return new Date().toISOString().split('T')[0];
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return new Date().toISOString().split('T')[0];
}

function parseCreatedAt(value) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function loadLegacyRows() {
  const raw = fs.readFileSync(SOURCE_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const table = parsed.find((entry) => entry?.type === 'table' && Array.isArray(entry?.data));
  if (!table) {
    throw new Error(`No table data found in ${SOURCE_PATH}`);
  }
  return table.data;
}

function mapRow(row) {
  const createdAt = parseCreatedAt(row.created_at);
  const functionDate = parseDateOnly(row.f_date);
  const visitDate = createdAt ? createdAt.toISOString().split('T')[0] : functionDate;
  const repeatCount = Number.parseInt(row.repeat_count, 10);

  return {
    date: visitDate,
    customerName: asString(row.name, 'Unknown'),
    contact: asString(row.contact, ''),
    functionDate,
    store: asString(row.store_name, '-'),
    staff: asString(row.created_by || row.manager_name, 'None'),
    managerName: asString(row.manager_name, '-'),
    category: asString(row.cat, '-'),
    subCategory: asString(row.sub, '-'),
    remarks: asString(row.remark, '-'),
    repeatCount: Number.isFinite(repeatCount) && repeatCount > 0 ? repeatCount : 1,
    status: normalizeStatus(row.walk_status),
    legacyMeta: {
      sourceTable: 'w',
      original: row,
    },
    ...(createdAt ? { createdAt, updatedAt: createdAt } : {}),
  };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const rows = loadLegacyRows();
  const docs = rows
    .filter((row) => row?.contact && row?.name)
    .map(mapRow);

  if (process.argv.includes('--dry-run')) {
    console.log(`Dry run: ${docs.length} walk-in rows mapped from ${rows.length} legacy rows.`);
    console.log(JSON.stringify(docs.slice(0, 3), null, 2));
    await mongoose.disconnect();
    return;
  }

  const result = await Walkin.insertMany(docs, { ordered: false });
  console.log(`Imported ${result.length} legacy walk-in records.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Legacy walk-in import failed:', error);
  process.exit(1);
});
