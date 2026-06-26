#!/usr/bin/env node
/**
 * OKT (Obat Keras Tertentu) Decision Engine
 * -------------------------------------------------
 * Determines whether a specific Obat Keras can be dispensed
 * by a pharmacist without a doctor's prescription in Indonesia.
 *
 * Legal basis:
 *   - UU 17/2023 Pasal 320(5): "Obat keras tertentu dapat diserahkan
 *     oleh apoteker tanpa resep"
 *   - PP 28/2024 Pasal 922(2): OKT criteria:
 *     (a) Self-medication (swamedikasi)
 *     (b) Chronic disease refill (resep ulangan)
 *     (c) Topical (obat topikal)
 *
 * Usage:
 *   node okt-engine.js evaluate <drug_name> [context]
 *
 *   context: "self_medication" | "chronic_refill" | "topical" | "auto"
 *
 * Examples:
 *   node okt-engine.js evaluate Amoxicillin
 *   node okt-engine.js evaluate Omeprazole self_medication
 *   node okt-engine.js evaluate Amlodipine chronic_refill
 */

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────
// Load databases
// ─────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'database.json');
const RULES_PATH = path.join(__dirname, 'okt-rules.json');

let _db = null, _rules = null;

function loadDB() {
  if (!_db) _db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  return _db;
}

function loadRules() {
  if (!_rules) _rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf-8'));
  return _rules;
}

// ─────────────────────────────────────────────────────────
// Drug attribute profiles for evaluation
// ─────────────────────────────────────────────────────────
const DRUG_PROFILES = {
  // Self-medication candidates
  omeprazole: {
    is_nti: false, requires_tdm: false, abuse_potential: 'none',
    is_specialist_only: false, route: 'oral', self_admin: true,
    requires_diagnosis: false, pregnancy_category: 'C',
    typical_duration: '7-14 days', has_generic: true,
    okt_pillars: ['self_medication'], max_self_medication_qty: 10, max_self_medication_days: 7
  },
  ranitidine: {
    is_nti: false, requires_tdm: false, abuse_potential: 'none',
    is_specialist_only: false, route: 'oral', self_admin: true,
    requires_diagnosis: false, pregnancy_category: 'B',
    typical_duration: '7-14 days', has_generic: true,
    okt_pillars: ['self_medication'], max_self_medication_qty: 10, max_self_medication_days: 7
  },
  'mefenamic acid': {
    is_nti: false, requires_tdm: false, abuse_potential: 'none',
    is_specialist_only: false, route: 'oral', self_admin: true,
    requires_diagnosis: false, pregnancy_category: 'C',
    typical_duration: '3-7 days', has_generic: true,
    okt_pillars: ['self_medication'], max_self_medication_qty: 12, max_self_medication_days: 5
  },
  salbutamol: {
    is_nti: false, requires_tdm: false, abuse_potential: 'low',
    is_specialist_only: false, route: 'inhaled', self_admin: true,
    requires_diagnosis: true, pregnancy_category: 'C',
    typical_duration: 'as needed', has_generic: true,
    okt_pillars: ['self_medication'],
    note: 'Mild intermittent asthma only; requires pharmacist ability to assess severity',
    restrictions: { max_device: '1 inhaler', counseling_required: true }
  },

  // Chronic refill candidates
  amlodipine: {
    is_nti: false, requires_tdm: false, abuse_potential: 'none',
    is_specialist_only: false, route: 'oral', self_admin: true,
    requires_diagnosis: true, pregnancy_category: 'C',
    typical_duration: 'chronic (lifelong)', has_generic: true,
    okt_pillars: ['chronic_refill'],
    restrictions: { previous_prescription_required: true, max_duration_days: 30, requires_bp_monitoring: true }
  },
  captopril: {
    is_nti: false, requires_tdm: false, abuse_potential: 'none',
    is_specialist_only: false, route: 'oral', self_admin: true,
    requires_diagnosis: true, pregnancy_category: 'D',
    typical_duration: 'chronic (lifelong)', has_generic: true,
    okt_pillars: ['chronic_refill'],
    restrictions: { previous_prescription_required: true, max_duration_days: 30,
      requires_bp_monitoring: true, pregnancy_warning: true }
  },
  metformin: {
    is_nti: false, requires_tdm: false, abuse_potential: 'none',
    is_specialist_only: false, route: 'oral', self_admin: true,
    requires_diagnosis: true, pregnancy_category: 'B',
    typical_duration: 'chronic (lifelong)', has_generic: true,
    okt_pillars: ['chronic_refill'],
    restrictions: { previous_prescription_required: true, max_duration_days: 30,
      requires_bg_monitoring: true, stable_dose_required: true }
  },
  simvastatin: {
    is_nti: false, requires_tdm: false, abuse_potential: 'none',
    is_specialist_only: false, route: 'oral', self_admin: true,
    requires_diagnosis: true, pregnancy_category: 'X',
    typical_duration: 'chronic (lifelong)', has_generic: true,
    okt_pillars: ['chronic_refill'],
    restrictions: { previous_prescription_required: true, max_duration_days: 30,
      pregnancy_exclusion: true, pregnancy_screening_required: true }
  },
  levothyroxine: {
    is_nti: false, requires_tdm: true, abuse_potential: 'none',
    is_specialist_only: false, route: 'oral', self_admin: true,
    requires_diagnosis: true, pregnancy_category: 'A',
    typical_duration: 'chronic (lifelong)', has_generic: true,
    okt_pillars: ['chronic_refill'],
    restrictions: { previous_prescription_required: true, max_duration_days: 30,
      stable_dose_required: true, tdm_available_at_pharmacy: true }
  },
  allopurinol: {
    is_nti: false, requires_tdm: false, abuse_potential: 'none',
    is_specialist_only: false, route: 'oral', self_admin: true,
    requires_diagnosis: true, pregnancy_category: 'C',
    typical_duration: 'chronic (lifelong)', has_generic: true,
    okt_pillars: ['chronic_refill'],
    restrictions: { previous_prescription_required: true, max_duration_days: 30, stable_dose_required: true }
  },
  insulin: {
    is_nti: true, requires_tdm: true, abuse_potential: 'none',
    is_specialist_only: false, route: 'injectable', self_admin: true,
    requires_diagnosis: true, pregnancy_category: 'B',
    typical_duration: 'chronic (lifelong)', has_generic: true,
    okt_pillars: ['chronic_refill'],
    restrictions: { previous_prescription_required: true, max_duration_days: 30,
      tdm_available: true, note: 'Insulin is NTI but self-admin; pharmacist must verify BG monitoring competence' }
  },

  // Topical candidates
  'clindamycin topical': {
    is_nti: false, requires_tdm: false, abuse_potential: 'none',
    is_specialist_only: false, route: 'topical', self_admin: true,
    requires_diagnosis: false, pregnancy_category: 'B',
    typical_duration: '8-12 weeks', has_generic: true,
    okt_pillars: ['topical'],
    restrictions: { max_qty: '1 tube 30g', indication: 'acne vulgaris' }
  },
  'ketoconazole cream': {
    is_nti: false, requires_tdm: false, abuse_potential: 'none',
    is_specialist_only: false, route: 'topical', self_admin: true,
    requires_diagnosis: false, pregnancy_category: 'C',
    typical_duration: '2-4 weeks', has_generic: true,
    okt_pillars: ['topical'],
    restrictions: { max_qty: '1 tube', indication: 'superficial fungal infection' }
  },
  'acyclovir cream': {
    is_nti: false, requires_tdm: false, abuse_potential: 'none',
    is_specialist_only: false, route: 'topical', self_admin: true,
    requires_diagnosis: false, pregnancy_category: 'B',
    typical_duration: '5 days', has_generic: true,
    okt_pillars: ['topical'],
    restrictions: { max_qty: '1 tube', indication: 'herpes labialis (cold sores)' }
  },
  'mupirocin': {
    is_nti: false, requires_tdm: false, abuse_potential: 'none',
    is_specialist_only: false, route: 'topical', self_admin: true,
    requires_diagnosis: false, pregnancy_category: 'B',
    typical_duration: '5-10 days', has_generic: true,
    okt_pillars: ['topical'],
    restrictions: { max_qty: '1 tube 15g', indication: 'impetigo, folliculitis (limited area)' }
  },
  'diclofenac gel': {
    is_nti: false, requires_tdm: false, abuse_potential: 'none',
    is_specialist_only: false, route: 'topical', self_admin: true,
    requires_diagnosis: false, pregnancy_category: 'C',
    typical_duration: '7-14 days', has_generic: true,
    okt_pillars: ['topical'],
    restrictions: { max_qty: '1 tube', indication: 'musculoskeletal pain' }
  },

  // ── NSAID oral for self-medication / pain ──
  meloxicam: {
    is_nti: false, requires_tdm: false, abuse_potential: 'none',
    is_specialist_only: false, route: 'oral', self_admin: true,
    requires_diagnosis: false, pregnancy_category: 'C',
    typical_duration: '7-14 days', has_generic: true,
    okt_pillars: ['self_medication'],
    max_self_medication_qty: 10, max_self_medication_days: 7,
    note: 'NSAID for short-term musculoskeletal pain, dysmenorrhea. Risk of GI/cardiac AEs requires pharmacist counseling on contraindications.',
    restrictions: { max_duration_days: 7, max_tablets: 10, counseling_required: true, contraindication_screening: ['gastric_ulcer', 'ckd', 'pregnancy'] }
  },
  diclofenac: {
    is_nti: false, requires_tdm: false, abuse_potential: 'none',
    is_specialist_only: false, route: 'oral', self_admin: true,
    requires_diagnosis: false, pregnancy_category: 'C',
    typical_duration: '3-7 days', has_generic: true,
    okt_pillars: ['self_medication'],
    max_self_medication_qty: 10, max_self_medication_days: 5,
    note: 'Oral NSAID. Same restrictions as meloxicam - GI/cardiac risk screening by pharmacist required.',
    restrictions: { max_duration_days: 5, counseling_required: true, contraindication_screening: ['gastric_ulcer', 'ckd', 'pregnancy'] }
  },

  // REJECTED examples (for testing)
  warfarin: {
    is_nti: true, requires_tdm: true, abuse_potential: 'none',
    is_specialist_only: false, route: 'oral', self_admin: true,
    requires_diagnosis: true, pregnancy_category: 'X',
    typical_duration: 'chronic', has_generic: true,
    okt_pillars: [],
    rejection_reasons: ['NTI', 'requires_INR_monitoring', 'pregnancy_X']
  },
  digoxin: {
    is_nti: true, requires_tdm: true, abuse_potential: 'none',
    is_specialist_only: false, route: 'oral', self_admin: true,
    requires_diagnosis: true, pregnancy_category: 'C',
    typical_duration: 'chronic', has_generic: true,
    okt_pillars: [],
    rejection_reasons: ['NTI', 'requires_TDM']
  },
  phenytoin: {
    is_nti: true, requires_tdm: true, abuse_potential: 'none',
    is_specialist_only: false, route: 'oral', self_admin: true,
    requires_diagnosis: true, pregnancy_category: 'D',
    typical_duration: 'chronic', has_generic: true,
    okt_pillars: [],
    rejection_reasons: ['NTI', 'requires_TDM']
  },
  morphine: {
    is_nti: true, requires_tdm: false, abuse_potential: 'high',
    is_specialist_only: false, route: 'injectable', self_admin: false,
    requires_diagnosis: true, pregnancy_category: 'C',
    typical_duration: 'short-term', has_generic: true,
    okt_pillars: [],
    rejection_reasons: ['narcotic_exclusion', 'high_abuse_potential', 'injectable']
  },
  diazepam: {
    is_nti: false, requires_tdm: false, abuse_potential: 'high',
    is_specialist_only: false, route: 'oral', self_admin: true,
    requires_diagnosis: true, pregnancy_category: 'D',
    typical_duration: 'short-term', has_generic: true,
    okt_pillars: [],
    rejection_reasons: ['psychotropic_exclusion']
  },
  amoxicillin: {
    is_nti: false, requires_tdm: false, abuse_potential: 'none',
    is_specialist_only: false, route: 'oral', self_admin: true,
    requires_diagnosis: true, pregnancy_category: 'B',
    typical_duration: '5-10 days', has_generic: true,
    okt_pillars: [],
    rejection_reasons: ['requires_diagnosis_antibiotic', 'amr_concern'],
    note: 'Antibiotics require confirmed bacterial infection; dispensing without prescription contributes to AMR'
  }
};

// ─────────────────────────────────────────────────────────
// Fuzzy drug lookup (case-insensitive, partial match)
// ─────────────────────────────────────────────────────────
function findDrug(query) {
  const q = query.toLowerCase().trim();
  // Direct match
  if (DRUG_PROFILES[q]) return { key: q, ...DRUG_PROFILES[q] };
  // Partial match against known keys
  const keys = Object.keys(DRUG_PROFILES).filter(k => k.includes(q) || q.includes(k));
  if (keys.length === 1) return { key: keys[0], ...DRUG_PROFILES[keys[0]] };
  // Search in database.json
  const db = loadDB();
  const cat = db.drug_catalog.therapeutic_classes;
  const results = [];
  for (const [ck, cd] of Object.entries(cat)) {
    if (cd.subclasses) {
      for (const [sk, sd] of Object.entries(cd.subclasses)) {
        for (const ex of (sd.examples || [])) {
          if (ex.toLowerCase().includes(q)) {
            // Check if we have a profile for this drug
            const pKey = ex.toLowerCase();
            const profile = DRUG_PROFILES[pKey];
            results.push({ key: ex, class: cd.class, classification: cd.classification, profile });
          }
        }
      }
    }
  }
  if (results.length > 0) {
    return { key: results[0].key, classification: results[0].classification, ...results[0].profile, _foundIn: results[0].class };
  }
  return null;
}

// ─────────────────────────────────────────────────────────
// Classification resolver
// ─────────────────────────────────────────────────────────
function resolveClassification(drugInfo, drugName) {
  if (drugInfo && drugInfo.classification) {
    const c = drugInfo.classification.toLowerCase();
    // Handle mixed classification strings like "Obat Keras / Obat Wajib Apotek"
    if (c.includes('narkotika')) return 'narkotika';
    if (c.includes('psikotropika')) return 'psikotropika';
    if (c.includes('obat bebas terbatas') || c === 'obat_bebas_terbatas') return 'obat_bebas_terbatas';
    if (c.includes('obat bebas') || c === 'obat_bebas') return 'obat_bebas';
    if (c.includes('obat keras')) return 'obat_keras';
    return c;
  }
  // Generic classification by drug name patterns
  const name = drugName.toLowerCase();
  const narcs = ['morphine', 'fentanyl', 'codeine', 'pethidine', 'oxycodone', 'heroin', 'cocaine'];
  if (narcs.some(n => name.includes(n))) return 'narkotika';
  const psychs = ['diazepam', 'alprazolam', 'lorazepam', 'clobazam', 'phenobarbital', 'methylphenidate',
    'nitrazepam', 'bromazepam', 'zolpidem', 'haloperidol', 'risperidone', 'olanzapine', 'fluoxetine'];
  if (psychs.some(p => name.includes(p))) return 'psikotropika';
  return 'obat_keras';
}

function normalizeClassification(raw) {
  const s = String(raw).toLowerCase();
  if (s.includes('narkotika')) return 'narkotika';
  if (s.includes('psikotropika')) return 'psikotropika';
  if (s.includes('obat bebas terbatas') || s === 'obat_bebas_terbatas') return 'obat_bebas_terbatas';
  if (s.includes('obat bebas') || s === 'obat_bebas') return 'obat_bebas';
  if (s.includes('obat keras') || s.includes('obat_keras')) return 'obat_keras';
  return s;
}

// ─────────────────────────────────────────────────────────
// Core OKT evaluation
// ─────────────────────────────────────────────────────────
function evaluateOKT(drugName, context = 'auto') {
  const rules = loadRules();
  const startTime = Date.now();

  // Flatten the rules for easy reference
  const exclusions = rules.hard_exclusions.rules;
  const pillars = rules.eligibility_pillars.pillars;
  const safetyGates = rules.safety_gates.gates;

  // Look up drug in profiles, then in database
  const drugInfo = findDrug(drugName);
  const rawClassification = drugInfo && drugInfo.classification
    ? drugInfo.classification
    : resolveClassification(drugInfo, drugName);
  const classification = normalizeClassification(rawClassification);

  const result = {
    drug: drugName,
    classification: classification,
    requested_context: context,
    timestamp: new Date().toISOString(),
    eligibility: null,
    grounds: [],
    gate_results: [],
    restrictions: {},
    rationale: [],
    execution_time_ms: 0
  };

  // ── Gate 0: Hard Exclusions ──
  if (classification === 'narkotika') {
    result.eligibility = 'REJECTED';
    result.grounds.push('EXCL-001');
    result.gate_results.push({ gate: 'EXCL-001', name: 'Narcotics Exclusion', status: 'FAIL', detail: 'Narcotics are strictly off-limits for pharmacist dispensing' });
    result.rationale.push('Narkotika (narcotics) are explicitly excluded per Pasal 78(6) Permenkes 5/2026');
    result.execution_time_ms = Date.now() - startTime;
    return result;
  }
  if (classification === 'psikotropika') {
    result.eligibility = 'REJECTED';
    result.grounds.push('EXCL-002');
    result.gate_results.push({ gate: 'EXCL-002', name: 'Psychotropics Exclusion', status: 'FAIL', detail: 'Psychotropics are strictly off-limits for pharmacist dispensing' });
    result.rationale.push('Psikotropika are explicitly excluded per Pasal 78(6) Permenkes 5/2026');
    result.execution_time_ms = Date.now() - startTime;
    return result;
  }
  if (classification === 'obat_bebas' || classification === 'obat_bebas_terbatas') {
    result.eligibility = 'NOT_APPLICABLE';
    result.grounds.push('EXCL-003');
    result.gate_results.push({ gate: 'EXCL-003', name: 'Already Non-Prescription', status: 'SKIP', detail: 'Drug is already available without prescription' });
    result.rationale.push('This drug is already classified as non-prescription; OKT rules do not apply');
    result.execution_time_ms = Date.now() - startTime;
    return result;
  }
  if (classification !== 'obat_keras') {
    result.eligibility = 'UNKNOWN';
    result.rationale.push(`Cannot determine classification for '${drugName}'`);
    result.execution_time_ms = Date.now() - startTime;
    return result;
  }

  // ── Gate 1: Safety Check ──
  let safetyPass = true;
  const safetyResults = [];

  if (drugInfo) {
    for (const gate of safetyGates) {
      const gId = gate.id;
      let conditionMet = false;

      // Evaluate conditions based on gate logic
      switch (gId) {
        case 'SAFE-01':
          conditionMet = drugInfo.is_nti === true;
          break;
        case 'SAFE-02':
          conditionMet = drugInfo.requires_tdm === true;
          break;
        case 'SAFE-03':
          conditionMet = drugInfo.abuse_potential === 'high';
          break;
        case 'SAFE-04':
          conditionMet = drugInfo.is_specialist_only === true;
          break;
        case 'SAFE-05':
          conditionMet = drugInfo.route === 'injectable' && drugInfo.self_admin !== true;
          break;
        case 'SAFE-06':
          conditionMet = drugInfo.requires_diagnosis === true && context === 'self_medication';
          break;
        case 'SAFE-07':
          conditionMet = ['D', 'X'].includes(drugInfo.pregnancy_category) && context === 'self_medication';
          break;
        default:
          conditionMet = false;
      }

      if (conditionMet) {
        safetyPass = false;
        const detail = gate.examples
          ? `${gate.name}: matches pattern (examples: ${gate.examples.slice(0, 3).join(', ')})`
          : `${gate.name}: condition triggered`;
        safetyResults.push({ gate: gId, name: gate.name, status: 'FAIL', detail });
        result.rationale.push(`REJECTED by ${gate.name}: ${gate.rationale}`);
      } else {
        safetyResults.push({ gate: gId, name: gate.name, status: 'PASS', detail: 'No issue detected' });
      }
    }
  } else {
    // No drug profile available - conservative approach
    result.rationale.push('No detailed profile available for this drug; conservative assessment applied');
    // Still check for generic safety patterns
    const name = drugName.toLowerCase();
    const ntiDrugs = ['warfarin', 'digoxin', 'phenytoin', 'lithium', 'theophylline', 'carbamazepine', 'valproic', 'cyclosporine', 'tacrolimus'];
    if (ntiDrugs.some(d => name.includes(d))) {
      safetyPass = false;
      safetyResults.push({ gate: 'SAFE-01', name: 'Narrow Therapeutic Index', status: 'FAIL', detail: `${drugName} recognized as NTI drug` });
    }
  }

  result.gate_results = safetyResults;

  // ── Gate 2: Pillar Eligibility ──
  const eligiblePillars = [];
  const pillarResults = [];

  if (drugInfo && drugInfo.okt_pillars) {
    const info = drugInfo;
    // Context filter
    const pillarKeys = context === 'auto' ? info.okt_pillars : info.okt_pillars.filter(p => p === context);

    for (const pKey of pillarKeys) {
      const pillar = pillars[pKey];
      if (!pillar) continue;

      // Score how many criteria are satisfied
      const criteria = pillar.criteria || [];
      const satisfiedCount = criteria.length; // Assume all satisfied if profile indicates this pillar
      const totalCount = criteria.length;

      // For chronic refill, verify previous prescription requirement
      if (pKey === 'chronic_refill' && info.restrictions && info.restrictions.previous_prescription_required) {
        eligiblePillars.push({
          pillar: pKey,
          name: pillar.name,
          status: 'CONDITIONAL',
          score: `${satisfiedCount}/${totalCount}`,
          conditions: ['Previous valid prescription required', 'Patient must be stable on current dose']
        });
      } else if (pKey === 'self_medication') {
        eligiblePillars.push({
          pillar: pKey,
          name: pillar.name,
          status: 'ELIGIBLE',
          score: `${satisfiedCount}/${totalCount}`,
          conditions: ['Short-term use only', 'Limited quantity']
        });
      } else if (pKey === 'topical') {
        eligiblePillars.push({
          pillar: pKey,
          name: pillar.name,
          status: 'ELIGIBLE',
          score: `${satisfiedCount}/${totalCount}`,
          conditions: ['Local use only', 'Limited area for potent agents']
        });
      }
    }
  }

  // ── Decision ──
  if (!safetyPass) {
    result.eligibility = 'REJECTED';
    result.rationale.unshift('FAILED safety gates - cannot be dispensed without prescription');
    result.restrictions = {};
  } else if (eligiblePillars.length === 0) {
    result.eligibility = 'REJECTED';
    result.rationale.unshift('Does not meet any OKT eligibility pillar (self-medication, chronic refill, or topical)');
    result.rationale.push('This drug requires a valid doctor\'s prescription');
    result.restrictions = {};
  } else {
    // Passes both safety and at least one pillar
    result.eligibility = eligiblePillars.some(p => p.status === 'CONDITIONAL') ? 'CONDITIONAL' : 'ELIGIBLE';
    result.grounds = eligiblePillars.map(p => p.pillar);
    result.restrictions = {};

    for (const ep of eligiblePillars) {
      const limitsKey = ep.pillar === 'self_medication' ? 'self_medication_limits'
        : ep.pillar === 'chronic_refill' ? 'chronic_refill_limits'
        : 'topical_limits';
      const limits = rules.default_restrictions[limitsKey] || {};
      Object.assign(result.restrictions, limits);

      // Merge drug-specific restrictions
      if (drugInfo && drugInfo.restrictions) {
        Object.assign(result.restrictions, drugInfo.restrictions);
      }
    }

    result.rationale.unshift(`PASSES OKT eligibility: ${eligiblePillars.map(p => p.name).join(', ')}`);
  }

  result.pillar_evaluation = eligiblePillars;
  result.execution_time_ms = Date.now() - startTime;
  return result;
}

// ─────────────────────────────────────────────────────────
// CLI handler
// ─────────────────────────────────────────────────────────
function printResult(result) {
  const statusColor = {
    'ELIGIBLE': '\x1b[32m',     // green
    'CONDITIONAL': '\x1b[33m',  // yellow
    'REJECTED': '\x1b[31m',     // red
    'NOT_APPLICABLE': '\x1b[36m', // cyan
    'UNKNOWN': '\x1b[35m'       // magenta
  }[result.eligibility] || '\x1b[0m';
  const reset = '\x1b[0m';

  console.log(`\n╔═══════════════════════════════════════════════`);
  console.log(`║  OKT DECISION REPORT`);
  console.log(`╠═══════════════════════════════════════════════`);
  console.log(`║  Drug:           ${result.drug}`);
  console.log(`║  Classification: ${result.classification}`);
  console.log(`║  Context:        ${result.requested_context}`);
  console.log(`║  Eligibility:    ${statusColor}${result.eligibility}${reset}`);
  console.log(`║  Time:           ${result.execution_time_ms}ms`);
  console.log(`╠═══════════════════════════════════════════════`);

  if (result.pillar_evaluation && result.pillar_evaluation.length) {
    console.log(`║  Eligible Pillars:`);
    for (const p of result.pillar_evaluation) {
      console.log(`║    - ${p.name}: ${p.status} (${p.score})`);
      for (const c of (p.conditions || [])) {
        console.log(`║      . ${c}`);
      }
    }
  }

  console.log(`╠═══════════════════════════════════════════════`);
  console.log(`║  Gate Results:`);
  for (const g of result.gate_results) {
    const gStatus = g.status === 'FAIL' ? '\x1b[31m✗\x1b[0m' : g.status === 'PASS' ? '\x1b[32m✓\x1b[0m' : '\x1b[36m-\x1b[0m';
    console.log(`║    ${gStatus} ${g.gate}: ${g.name} - ${g.detail}`);
  }

  console.log(`╠═══════════════════════════════════════════════`);
  console.log(`║  Rationale:`);
  for (const r of result.rationale) {
    console.log(`║    • ${r}`);
  }

  if (Object.keys(result.restrictions).length) {
    console.log(`╠═══════════════════════════════════════════════`);
    console.log(`║  Dispensing Restrictions:`);
    for (const [k, v] of Object.entries(result.restrictions)) {
      console.log(`║    ${k}: ${JSON.stringify(v)}`);
    }
  }
  console.log(`╚═══════════════════════════════════════════════\n`);
}

function printUsage() {
  console.log(`
OKT Decision Engine - Usage:
  node okt-engine.js evaluate <drug_name> [context]
  node okt-engine.js list
  node okt-engine.js list-all

Context:
  self_medication  - Evaluate for self-medication (swamedikasi)
  chronic_refill   - Evaluate for chronic disease refill (resep ulangan)
  topical          - Evaluate as topical drug
  auto             - Auto-detect (default)

Examples:
  node okt-engine.js evaluate Omeprazole
  node okt-engine.js evaluate Amlodipine chronic_refill
  node okt-engine.js evaluate Diazepam
  node okt-engine.js list
`);
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length === 0) { printUsage(); process.exit(0); }

switch (args[0]) {
  case 'evaluate': {
    if (!args[1]) { console.log('Error: provide a drug name'); printUsage(); process.exit(1); }
    const ctx = args[2] || 'auto';
    const result = evaluateOKT(args[1], ctx);
    printResult(result);
    // Also output JSON if requested
    if (args.includes('--json')) {
      console.log(JSON.stringify(result, null, 2));
    }
    break;
  }
  case 'list': {
    console.log('\nKnown drug profiles:');
    for (const [key, val] of Object.entries(DRUG_PROFILES)) {
      const pillars = (val.okt_pillars || []).join(', ') || '(none - will be rejected)';
      const reject = val.rejection_reasons ? ` REJECT: ${val.rejection_reasons.join(', ')}` : '';
      console.log(`  - ${key} [${pillars}]${reject}`);
    }
    break;
  }
  case 'list-all': {
    const db = loadDB();
    const cat = db.drug_catalog.therapeutic_classes;
    console.log('\nAll drugs in database (checking OKT eligibility):\n');
    for (const [ck, cd] of Object.entries(cat)) {
      if (cd.subclasses) {
        for (const [sk, sd] of Object.entries(cd.subclasses)) {
          for (const ex of (sd.examples || [])) {
            const result = evaluateOKT(ex, 'auto');
            const badge = result.eligibility === 'ELIGIBLE' ? '✓' : result.eligibility === 'CONDITIONAL' ? '~' : '✗';
            console.log(`  ${badge} ${ex.padEnd(35)} ${result.eligibility.padEnd(15)} ${(result.grounds || []).join(', ')}`);
          }
        }
      }
    }
    break;
  }
  default:
    console.log(`Unknown command: ${args[0]}`);
    printUsage();
}
