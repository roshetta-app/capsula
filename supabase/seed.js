#!/usr/bin/env node
/**
 * Capsula — Phase 1.2 Seed Script
 * Seeds 138 drugs from drugs.json into Supabase:
 *   generics → formulations → brands
 * Then stamps app_metadata.drugs_updated_at.
 *
 * Usage:
 *   node supabase/seed.js
 *
 * Requires: @supabase/supabase-js, dotenv
 *   npm install @supabase/supabase-js dotenv
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// ─── Bootstrap ───────────────────────────────────────────────────────────────

config(); // load .env

const SUPABASE_URL     = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY      = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const drugsRaw  = JSON.parse(readFileSync(join(__dirname, '../src/data/drugs.json'), 'utf8'));
const drugs     = drugsRaw.drugs;

console.log(`\n🌱  Capsula seed — ${drugs.length} drugs to process\n`);

// ─── Mapping tables ──────────────────────────────────────────────────────────

const CATEGORY_MAP = {
  'antibiotic':            'antibiotic',
  'antifungal':            'antifungal',
  'antiviral':             'antiviral',
  'analgesic-nsaid':       'analgesic-nsaid',
  'antipyretic':           'analgesic-nsaid',
  'cardiovascular':        'cardiovascular',
  'antihypertensive':      'cardiovascular',
  'respiratory':           'respiratory',
  'antihistamine':         'respiratory',
  'gastrointestinal':      'gastrointestinal',
  'proton-pump-inhibitor': 'gastrointestinal',
  'antispasmodic':         'gastrointestinal',
  'antidiabetic':          'endocrine-metabolic',
  'steroid':               'endocrine-metabolic',
  'ophthalmic-otic':       'ophthalmic-otic',
  'topical':               'dermatological',
  'gynecological':         'obstetric-gynecological',
  'antiparasitic':         'antiparasitic',
  'vitamins-minerals':     'vitamins-minerals',
  'emergency':             'other',
};

/** Normalise free-text route → DRUG_ROUTES values */
function mapRoute(route) {
  if (!route) return 'oral';
  const l = route.toLowerCase();
  if (l === 'oral')                                            return 'oral';
  if (l.includes('inhal') || l.includes('nebul'))             return 'inhaled';
  if (l === 'rectal')                                          return 'rectal';
  if (l.includes('ophthalm') || l.includes('otic'))           return 'ocular';
  if (l === 'vaginal' || l === 'vaginal (topical)')            return 'other';
  if (l.includes('topical') || l.includes('oral gel') ||
      l.includes('oral) / oral'))                              return 'topical';
  if (l.startsWith('sc'))                                      return 'im';  // SubCut → IM bucket
  if (l.includes('iv') && l.includes('im'))                   return 'iv';
  if (l.startsWith('iv'))                                      return 'iv';
  if (l.startsWith('im'))                                      return 'im';
  return 'other';
}

/** Build a stable slug from genericName */
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extract concentration string from genericName.
 * e.g. "Amoxicillin 500mg" → "500mg"
 *      "Amoxicillin 500mg + Clavulanic acid 125mg" → "500mg/125mg"
 *      "Paracetamol" → ""
 */
function extractConcentration(name) {
  // Match numbers (with optional commas e.g. 1,200,000) + unit
  const matches = name.match(/[\d,]+(?:\.\d+)?(?:\s*(?:mg|g|mcg|iu|iu\/ml|mg\/ml|ml|%|unit))/gi);
  if (!matches) return '';
  // Normalise: remove spaces between number and unit, strip commas from display
  return matches.map(m => m.replace(/\s+/, '').replace(/,/g, '')).join('/');
}

// ─── Build generics map (deduplicate by genericName base) ────────────────────
// Each drug in drugs.json is already one generic+concentration pair.
// We treat each unique genericName as its own generic row since concentrations
// are part of the name (e.g. "Amoxicillin 500mg" vs "Amoxicillin 875mg+125mg").

function buildGenericRows(drugs) {
  const seen  = new Map(); // slug → generic row
  const order = [];        // preserve insertion order

  for (const d of drugs) {
    const slug = toSlug(d.genericName);
    if (!seen.has(slug)) {
      seen.set(slug, {
        slug,
        name_en:  d.genericName,
        name_ar:  d.arabicName,
        category: CATEGORY_MAP[d.category] || 'other',
        class:    d.class || null,
        uses:     d.uses    || [],
        warnings: d.warnings || [],
        doses: d.dose ? buildTextbookDoses(d.dose) : [],
      });
      order.push(slug);
    }
  }

  return order.map(s => seen.get(s));
}

/**
 * Build generics.doses (textbook reference):
 * [{ group: "Adult", instruction: "..." }, { group: "Child", instruction: "..." }]
 */
function buildTextbookDoses(dose) {
  const rows = [];
  if (dose.adult) {
    let instruction = dose.adult;
    if (dose.duration) instruction += ` — ${dose.duration}`;
    if (dose.notes)    instruction += `. ${dose.notes}`;
    rows.push({ group: 'Adult', instruction });
  }
  if (dose.pediatric && dose.pediatric !== 'See formulation') {
    rows.push({ group: 'Child', instruction: dose.pediatric });
  }
  return rows;
}

/**
 * Build formulations.doses (practical, patient-oriented):
 * One entry per adult dose line — stripped of notes which live on generic.
 */
function buildPracticalDoses(dose, form) {
  const rows = [];
  if (dose.adult) {
    rows.push({ group: 'Adult', instruction: dose.adult });
  }
  if (dose.pediatric && dose.pediatric !== 'See formulation') {
    rows.push({ group: 'Child', instruction: dose.pediatric });
  }
  return rows;
}

// ─── Seed functions ──────────────────────────────────────────────────────────

async function clearExisting() {
  console.log('🗑   Clearing existing seed data …');
  // Delete in reverse FK order
  await supabase.from('brands').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('formulations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('generics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('   ✓ Cleared\n');
}

async function insertGenerics(genericRows) {
  console.log(`📦  Inserting ${genericRows.length} generics …`);
  const { data, error } = await supabase
    .from('generics')
    .insert(genericRows)
    .select('id, slug');

  if (error) {
    console.error('❌  generics insert failed:', error.message);
    throw error;
  }

  // Build slug → id map
  const slugToId = {};
  for (const row of data) slugToId[row.slug] = row.id;
  console.log(`   ✓ ${data.length} generics inserted\n`);
  return slugToId;
}

async function insertFormulationsAndBrands(drugs, slugToId) {
  let formulationCount = 0;
  let brandCount       = 0;

  console.log('💊  Inserting formulations + brands …');

  for (const d of drugs) {
    const genericId = slugToId[toSlug(d.genericName)];
    if (!genericId) {
      console.warn(`   ⚠  No generic id for "${d.genericName}" — skipping`);
      continue;
    }

    const route        = mapRoute(d.dose?.route);
    const concentration = extractConcentration(d.genericName);
    const forms        = d.forms?.length ? d.forms : ['tablet'];

    for (const form of forms) {
      // Insert one formulation per form
      const formulationRow = {
        generic_id:    genericId,
        concentration: concentration || 'standard',
        form,
        route,
        doses: buildPracticalDoses(d.dose || {}, form),
      };

      const { data: fData, error: fErr } = await supabase
        .from('formulations')
        .insert(formulationRow)
        .select('id')
        .single();

      if (fErr) {
        console.error(`   ❌  formulation insert failed for "${d.genericName}" [${form}]:`, fErr.message);
        continue;
      }

      formulationCount++;
      const formulationId = fData.id;

      // Insert brands for this formulation
      const brandNames = d.brandNames || [];
      if (brandNames.length === 0) continue;

      const brandRows = brandNames.map(name => ({
        formulation_id: formulationId,
        name,
        name_ar:       null,          // drugs.json has no Arabic brand names
        manufacturer:  null,
        in_stock:      d.inStock ?? true,
        is_available:  true,
      }));

      const { data: bData, error: bErr } = await supabase
        .from('brands')
        .insert(brandRows)
        .select('id');

      if (bErr) {
        console.error(`   ❌  brands insert failed for "${d.genericName}":`, bErr.message);
        continue;
      }

      brandCount += bData.length;
    }
  }

  console.log(`   ✓ ${formulationCount} formulations inserted`);
  console.log(`   ✓ ${brandCount} brands inserted\n`);
  return { formulationCount, brandCount };
}

async function stampMetadata() {
  console.log('🕐  Stamping app_metadata.drugs_updated_at …');
  const { error } = await supabase
    .from('app_metadata')
    .update({ drugs_updated_at: new Date().toISOString() })
    .eq('id', 1);

  if (error) {
    console.error('   ❌  app_metadata update failed:', error.message);
    throw error;
  }
  console.log('   ✓ Stamped\n');
}

async function verifyCounts() {
  console.log('🔍  Verifying counts …');
  const [g, f, b] = await Promise.all([
    supabase.from('generics').select('*', { count: 'exact', head: true }),
    supabase.from('formulations').select('*', { count: 'exact', head: true }),
    supabase.from('brands').select('*', { count: 'exact', head: true }),
  ]);
  console.log(`   generics:     ${g.count}`);
  console.log(`   formulations: ${f.count}`);
  console.log(`   brands:       ${b.count}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await clearExisting();

    const genericRows = buildGenericRows(drugs);
    const slugToId    = await insertGenerics(genericRows);

    await insertFormulationsAndBrands(drugs, slugToId);
    await stampMetadata();
    await verifyCounts();

    console.log('\n✅  Seed complete!\n');
  } catch (err) {
    console.error('\n❌  Seed failed:', err.message || err);
    process.exit(1);
  }
}

main();
