import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import mongoose from 'mongoose';
import User from '../model/User.js';
import Branch from '../model/Branch.js';

const SOURCE_PATH = process.env.LEGACY_USER_FILE || 'D:\\users.json';

function asString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function normalizeKey(value) {
  return asString(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function safeEmpId(raw) {
  const value = asString(raw);
  if (!value) return '';
  return value.toUpperCase().replace(/\s+/g, '');
}

function safeUsername(row) {
  return asString(row.name || row.username || row.role || row.job_tittle || row.job_title || row.emp_code || row.empID, 'Unknown User');
}

function safeDesignation(row) {
  return asString(
    row.role || row.job_tittle || row.job_title || row.dept || row.designation,
    'Staff'
  );
}

async function loadBranches() {
  return Branch.find({ isActive: true }).select('_id locCode workingBranch').lean();
}

function resolveBranch(rawStore, branches) {
  const input = asString(rawStore);
  const inputKey = normalizeKey(input);
  if (!inputKey) return null;

  const direct = branches.find((b) =>
    normalizeKey(b.workingBranch) === inputKey ||
    normalizeKey(b.locCode) === inputKey ||
    String(b.locCode) === input
  );
  if (direct) return direct;

  const aliasRules = [
    ['edappally', 'edappally'],
    ['edappal', 'edappal'],
    ['perinthalmanna', 'perinthalmanna'],
    ['kottakkal', 'kottakkal'],
    ['kochi', 'kochi'],
    ['calicut', 'calicut'],
    ['trivandrum', 'trivandrum'],
    ['kottayam', 'kottayam'],
    ['perumbavoor', 'perumbavoor'],
    ['thrissur', 'thrissur'],
    ['chavakkad', 'chavakkad'],
    ['kozhikode', 'kozhikode'],
    ['vatakara', 'vatakara'],
    ['manjery', 'manjery'],
    ['palakkad', 'palakkad'],
    ['kalpetta', 'kalpetta'],
    ['kannur', 'kannur'],
  ];

  for (const [needle, location] of aliasRules) {
    if (!inputKey.includes(needle)) continue;
    const match = branches.find((b) => normalizeKey(b.workingBranch).includes(location));
    if (match) return match;
  }

  return null;
}

function buildLocCode(row, branch) {
  if (branch?.locCode) return branch.locCode;
  const raw = asString(row.store_name);
  if (!raw) return 'All';
  return row.district ? asString(row.district).toUpperCase() : 'All';
}

function buildWorkingBranch(row, branch) {
  if (branch?.workingBranch) return branch.workingBranch;
  if (row.store_name) return asString(row.store_name);
  return 'No Store';
}

function buildUserDoc(row, branch) {
  const empID = safeEmpId(row.emp_code || row.empID || row.id);
  const email = asString(row.email, `${empID || `user${row.id}`}@legacy.local`).toLowerCase();

  return {
    username: safeUsername(row),
    email,
    password: '',
    phoneNumber: asString(row.contact_no),
    locCode: buildLocCode(row, branch),
    empID: empID || `LEGACY_${asString(row.id, '0')}`,
    designation: safeDesignation(row),
    workingBranch: buildWorkingBranch(row, branch),
    source: 'external-sync',
  };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const raw = fs.readFileSync(SOURCE_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const table = parsed.find((entry) => entry?.type === 'table' && Array.isArray(entry?.data));
  if (!table) throw new Error(`No table data found in ${SOURCE_PATH}`);

  const branches = await loadBranches();
  const rows = table.data.filter((row) => row && (row.emp_code || row.id || row.email));

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const empID = safeEmpId(row.emp_code || row.empID || row.id);
    const email = asString(row.email, '').toLowerCase();
    if (!empID && !email) {
      skipped += 1;
      continue;
    }

    const branch = resolveBranch(row.store_name, branches);
    const payload = buildUserDoc(row, branch);

    let existing = null;
    if (empID) existing = await User.findOne({ empID });
    if (!existing && email) existing = await User.findOne({ email });

    if (existing) {
      existing.username = payload.username;
      existing.email = payload.email;
      existing.phoneNumber = payload.phoneNumber;
      existing.locCode = payload.locCode;
      existing.designation = payload.designation;
      existing.workingBranch = payload.workingBranch;
      existing.source = 'external-sync';
      await existing.save();
      updated += 1;
    } else {
      await User.create(payload);
      created += 1;
    }
  }

  console.log(`Legacy user import complete. created=${created}, updated=${updated}, skipped=${skipped}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Legacy user import failed:', error);
  process.exit(1);
});
