const fs = require('fs');
const path = require('path');

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

// ── Drug attribute rules (class-based) ──
const NTI_DRUGS = new Set(['warfarin', 'digoksin', 'fenitoin', 'karbamazepin', 'valproat', 'teofilin', 'siklosporin', 'takrolimus', 'lithium', 'fenytoin']);
const TDM_REQUIRED = new Set(['warfarin', 'digoksin', 'fenitoin', 'karbamazepin', 'valproat', 'teofilin', 'siklosporin', 'takrolimus', 'lithium', 'gentamisin', 'amikasin', 'vankomisin']);
const HIGH_ABUSE = new Set(['tramadol', 'kodein', 'morfin', 'fentanil', 'oksikodon', 'petidin', 'sufentanil', 'remifentanil', 'hidromorfon', 'metadon', 'ketamin', 'propofol']);
const SPECIALIST_ONLY_CLASSES = new Set(['Chemotherapy', 'Immunosuppressant']);
const REQUIRES_DIAG_CLASSES = new Set(['Anti-infective', 'Antiviral', 'Antiretroviral', 'Antituberculosis']);
const SELF_MEDICATION_CLASSES = new Set(['Analgesic & Anti-inflammatory', 'Gastrointestinal', 'Antiallergic & Anaphylaxis', 'Respiratory']);
const CHRONIC_REFILL_CLASSES = new Set(['Cardiovascular', 'Antidiabetic', 'Endocrine', 'Urological']);
const TOPICAL_CLASSES = new Set(['Dermatological', 'Ophthalmological']);

function autoDeriveProfile(drugName, drugClass, drugSubclass) {
  const name = drugName.toLowerCase();
  const profile = {
    is_nti: NTI_DRUGS.has(name),
    requires_tdm: TDM_REQUIRED.has(name),
    abuse_potential: HIGH_ABUSE.has(name) ? 'high' : 'none',
    is_specialist_only: SPECIALIST_ONLY_CLASSES.has(drugClass) || drugSubclass === 'Cytotoxic Agent',
    route: 'oral',
    self_admin: true,
    requires_diagnosis: REQUIRES_DIAG_CLASSES.has(drugSubclass) || drugSubclass === 'Insulin' || drugSubclass === 'Antiviral',
    pregnancy_category: 'C',
    typical_duration: 'varies',
    has_generic: true,
    okt_pillars: []
  };

  // Route inference from subclass
  if (drugSubclass && (drugSubclass.includes('Topical') || drugSubclass.includes('Dermatological') || drugSubclass.includes('Ophthalmic'))) {
    profile.route = 'topical';
  } else if (drugSubclass === 'General Anesthetic' || drugSubclass === 'Local Anesthetic' || 
             drugSubclass === 'Neuromuscular Blocker') {
    profile.route = 'injectable';
    profile.self_admin = false;
  } else if (drugSubclass === 'Insulin') {
    profile.route = 'injectable';
    profile.self_admin = true;
    profile.requires_diagnosis = true;
  } else if (drugSubclass === 'Vasopressor/Inotrope' || drugSubclass === 'Thrombolytic' ||
             drugSubclass === 'Anticoagulant (Parenteral)') {
    profile.route = 'injectable';
    profile.self_admin = false;
  } else if (drugSubclass === 'Inhaled Corticosteroid/Combination' || drugSubclass === 'Bronchodilator') {
    profile.route = 'inhaled';
    profile.self_admin = true;
  }

  // Pregnancy category inference
  const pregD = ['ACE Inhibitor', 'Angiotensin Receptor Blocker', 'Statin'];
  const pregX = ['Statin', 'Warfarin'];
  if (drugSubclass && pregD.includes(drugSubclass)) profile.pregnancy_category = 'D';
  if (drugSubclass && pregX.includes(drugSubclass)) profile.pregnancy_category = 'X';
  if (drugSubclass === 'Anticoagulant/Antiplatelet') profile.pregnancy_category = 'X';

  // OKT pillar determination
  // Self-medication candidates
  if (drugSubclass === 'NSAID' || drugSubclass === 'Antacid/Antiulcer' || drugSubclass === 'Antihistamine' ||
      drugSubclass === 'Antiallergic' || drugSubclass === 'Antiemetic' || drugSubclass === 'Laxative' ||
      drugSubclass === 'Antidiarrheal' || drugSubclass === 'Antifungal' ||
      drugSubclass === 'Mucolytic' || drugSubclass === 'Decongestant' ||
      drugSubclass === 'Bronchodilator' || drugSubclass === 'Antihistamine' ||
      drugSubclass === 'Vestibular Agent' || drugSubclass === 'Anthelmintic' ||
      drugSubclass === 'Antimalarial' || drugSubclass === 'Vitamin/Mineral Supplement') {
    profile.okt_pillars.push('self_medication');
  }

  // Chronic refill candidates
  if (CHRONIC_REFILL_CLASSES.has(drugClass) || 
      drugSubclass === 'Anticoagulant/Antiplatelet' || drugSubclass === 'Statin' ||
      drugSubclass === 'Fibrate' || drugSubclass === 'Oral Antidiabetic' || drugSubclass === 'Insulin' ||
      drugSubclass === 'Thyroid Agent' || drugSubclass === 'Benign Prostatic Hyperplasia' ||
      drugSubclass === 'Erectile Dysfunction' || drugSubclass === 'Contraceptive' ||
      drugSubclass === 'Hormone Therapy' || drugSubclass === 'Overactive Bladder' ||
      drugSubclass === 'Antipsychotic' || drugSubclass === 'Antidepressant' ||
      drugSubclass === 'Anxiolytic/Sedative' || drugSubclass === 'Antiepileptic' ||
      drugSubclass === 'Central Antihypertensive' || drugSubclass === 'Antianginal' ||
      drugSubclass === 'Antiarrhythmic' || drugSubclass === 'Antigout') {
    profile.okt_pillars.push('chronic_refill');
  }

  // Topical candidates — expanded to include druSubclass names containing 'Topical' and common topical classes
  if (TOPICAL_CLASSES.has(drugClass) || profile.route === 'topical' ||
      drugSubclass === 'Topical Corticosteroid' || drugSubclass === 'Topical Anti-infective' ||
      drugSubclass === 'Ophthalmic Agent' || drugSubclass === 'Vestibular Agent' ||
      drugSubclass === 'Antifungal' || drugSubclass === 'Antibacterial (Topical)' ||
      drugSubclass === 'Dermatological' || drugSubclass === 'Emollient/Protective') {
    profile.okt_pillars.push('topical');
  }

  // Blocked: narcotic analgesics are in okt_pillars but will be rejected by SAFE-03
  return profile;
}

// ── Drug lookup ──
const NAME_ALIASES = {
  'digoxin': 'digoksin', 'omeprazole': 'omeprazol', 'amoxicillin': 'amoksisilin', 'amoxycillin': 'amoksisilin',
  'ciprofloxacin': 'siprofloksasin', 'acyclovir': 'asiklovir', 'levothyroxine': 'levotiroksin',
  'phenytoin': 'fenitoin', 'phenobarbital': 'fenobarbital', 'carbamazepine': 'karbamazepin',
  'valproic acid': 'valproat', 'fluoxetine': 'fluoksetin', 'haloperidol': 'haloperidol',
  'chlorpromazine': 'klorpromazin', 'risperidone': 'risperidon', 'methotrexate': 'metotreksat',
  'cyclophosphamide': 'siklofosfamid', 'doxorubicin': 'doksorubisin', 'vincristine': 'vinkristin',
  'cisplatin': 'sisplatin', 'carboplatin': 'karboplatin', 'paclitaxel': 'paklitaksel',
  'gemcitabine': 'gemsitabin', 'azathioprine': 'azatioprin', 'mercaptopurine': 'merkaptopurin',
  'busulfan': 'busulfan', 'melphalan': 'melfalan', 'chlorambucil': 'klorambusil',
  'enalapril': 'enalapril', 'lisinopril': 'lisinopril', 'captopril': 'kaptopril',
  'simvastatin': 'simvastatin', 'atorvastatin': 'atorvastatin', 'rosuvastatin': 'rosuvastatin',
  'metformin': 'metformin', 'glimepiride': 'glimepirid', 'glipizide': 'glipizid',
  'gliclazide': 'gliklazid', 'glibenclamide': 'glibenklamid', 'prednisone': 'prednison',
  'prednisolone': 'prednisolon', 'dexamethasone': 'deksametason', 'hydrocortisone': 'hidrokortison',
  'gentamicin': 'gentamisin', 'amikacin': 'amikasin', 'streptomycin': 'streptomisin',
  'tobramycin': 'tobramisin', 'vancomycin': 'vankomisin', 'erythromycin': 'eritromisin',
  'azithromycin': 'azitromisin', 'clarithromycin': 'klaritromisin', 'spiramycin': 'spiramisin',
  'cephalexin': 'sefaleksin', 'cefadroxil': 'sefadroksil', 'cefazolin': 'sefazolin',
  'cefotaxime': 'sefotaksim', 'ceftriaxone': 'seftriakson', 'ceftazidime': 'seftazidim',
  'cefoperazone': 'sefoperazon', 'cefepime': 'sefepim', 'cefpirome': 'sefpirom',
  'cefixime': 'sefiksim', 'cefuroxime': 'sefuroksim', 'salbutamol': 'salbutamol',
  'albuterol': 'salbutamol', 'fenoterol': 'fenoterol', 'ipratropium': 'ipratropium',
  'nitroglycerin': 'gliseril trinitrat', 'isosorbide dinitrate': 'isosorbid dinitrat',
  'furosemide': 'furosemid', 'spironolactone': 'spironolakton', 'hydrochlorothiazide': 'hidroklorotiazid',
  'alprazolam': 'alprazolam', 'diazepam': 'diazepam', 'lorazepam': 'lorazepam',
  'clobazam': 'klobazam', 'clonazepam': 'klonazepam', 'phenobarbital': 'fenobarbital',
  'metoclopramide': 'metoklopramid', 'ondansetron': 'ondansetron', 'omeprazole': 'omeprazol',
  'lansoprazole': 'lansoprazol', 'pantoprazole': 'pantoprazol', 'ketoconazole': 'ketokonazol',
  'fluconazole': 'flukonazol', 'itraconazole': 'itrakonazol', 'voriconazole': 'vorikonazol',
  'isotretinoin': 'asam retinoat', 'tretinoin': 'asam retinoat',
  'acetylsalicylic acid': 'asam asetilsalisilat', 'aspirin': 'asam asetilsalisilat',
  'mefenamic acid': 'asam mefenamat', 'valproate': 'valproat',
  'diclofenac': 'natrium diklofenak', 'ketoprofen': 'ketoprofen', 'ketorolac': 'ketorolak',
  'meloxicam': 'meloksikam', 'celecoxib': 'selekoksib', 'allopurinol': 'alopurinol',
  'colchicine': 'kolkisin', 'probenecid': 'probenesid', 'levofloxacin': 'levofloksasin',
  'moxifloxacin': 'moksifloksasin', 'ofloxacin': 'ofloksasin', 'doxycycline': 'doksisiklin',
  'tetracycline': 'tetrasiklin', 'minocycline': 'minosiklin', 'clindamycin': 'klindamisin',
  'metronidazole': 'metronidazol', 'isoniazid': 'isoniazid', 'rifampicin': 'rifampisin',
  'pyrazinamide': 'pirazinamid', 'ethambutol': 'etambutol', 'amphotericin b': 'amfoterisin b',
  'griseofulvin': 'griseofulvin', 'terbinafine': 'terbinafin', 'artesunate': 'artesunat',
  'quinine': 'kuinin', 'primaquine': 'primakuin', 'praziquantel': 'prazikuantel',
  'albendazole': 'albendazol', 'mebendazole': 'mebendazol', 'ivermectin': 'ivermektin',
  'levonorgestrel': 'levonorgestrel', 'desogestrel': 'desogestrel', 'etonogestrel': 'etonogestrel',
  'medroxyprogesterone': 'medroksi progesteron asetat', 'estrogen conjugate': 'estrogen terkonjugasi',
  'sildenafil': 'sildenafil', 'tadalafil': 'tadalafil', 'finasteride': 'finasterid',
  'dutasteride': 'dutasterid', 'doxazosin': 'doksazosin', 'terazosin': 'terazosin',
  'tamsulosin': 'tamsulosin', 'timolol': 'betaksolol', 'levodopa': 'levodopa',
  'morphine': 'morfin', 'codeine': 'kodein', 'fentanyl': 'fentanil', 'pethidine': 'petidin',
  'oxycodone': 'oksikodon', 'sufentanil': 'sufentanil', 'remifentanil': 'remifentanil',
  'hydromorphone': 'hidromorfon', 'methadone': 'metadon', 'tramadol': 'tramadol',
  'propofol': 'propofol', 'ketamine': 'ketamin', 'thiopental': 'tiopental',
  'warfarin': 'warfarin', 'clopidogrel': 'klopidogrel', 'ticagrelor': 'tikagrelor',
  'enoxaparin': 'enoxaparin', 'nadroparin': 'nadroparin', 'fondaparinux': 'fondaparinuks',
  'insulin glargine': 'insulin glargine', 'insulin detemir': 'insulin detemir',
  'insulin aspart': 'insulin aspart', 'insulin lispro': 'insulin lispro',
  'insulin glulisine': 'insulin glulisin', 'insulin degludec': 'insulin degludek',
};

function findDrug(query) {
  let q = query.toLowerCase().trim();
  const db = loadDB();
  const cat = db.drug_catalog.therapeutic_classes;
  
  // Try English-to-Indonesian alias (exact match first)
  if (NAME_ALIASES[q]) q = NAME_ALIASES[q];
  // Try first word after stripping qualifiers like "cream", "gel", "tablet", etc.
  if (!NAME_ALIASES[q]) {
    const words = q.split(/\s+/);
    const baseWord = words[0].replace(/[^a-z]/g, '');
    if (NAME_ALIASES[baseWord]) q = NAME_ALIASES[baseWord];
  }
  
  const all = db.drug_catalog.all_drugs || [];
  
  // Exact match
  for (const d of all) {
    if (d.name.toLowerCase() === q) {
      return { ...d, profile: autoDeriveProfile(d.name, d.class, d.subclass) };
    }
  }
  
  // Partial match
  for (const d of all) {
    if (d.name.toLowerCase().includes(q) || q.includes(d.name.toLowerCase())) {
      return { ...d, profile: autoDeriveProfile(d.name, d.class, d.subclass) };
    }
  }
  
  // Search in therapeutic_classes
  for (const [ck, cd] of Object.entries(cat)) {
    if (cd.subclasses) {
      for (const [sk, sd] of Object.entries(cd.subclasses)) {
        for (const ex of (sd.examples || [])) {
          if (ex.toLowerCase().includes(q)) {
            const profile = autoDeriveProfile(ex, cd.class, sd.subclass);
            return { name: ex, class: cd.class, subclass: sd.subclass, classification: 'Obat Keras', profile, _foundIn: ck };
          }
        }
      }
    }
  }
  
  return null;
}

// ── Classification resolver ──
function resolveClassification(drugInfo, drugName) {
  const name = drugName.toLowerCase();
  const narcs = ['morfin', 'fentanil', 'kodein', 'petidin', 'oksikodon', 'sufentanil', 'remifentanil', 'hidromorfon', 'metadon'];
  if (narcs.some(n => name.includes(n))) return 'narkotika';
  const psychs = ['diazepam', 'alprazolam', 'lorazepam', 'klobazam', 'fenobarbital', 'metilfenidat',
    'klonazepam', 'haloperidol', 'risperidon', 'olanzapin', 'fluoksetin', 'klorpromazin', 'trifluoperazin', 'quetiapin'];
  if (psychs.some(p => name.includes(p))) return 'psikotropika';
  return 'obat_keras';
}

function normalizeClassification(raw) {
  const s = String(raw).toLowerCase();
  if (s.includes('narkotika')) return 'narkotika';
  if (s.includes('psikotropika')) return 'psikotropika';
  if (s.includes('obat bebas') || s === 'obat_bebas' || s === 'obat_bebas_terbatas') return 'obat_bebas';
  if (s.includes('obat keras') || s.includes('obat_keras')) return 'obat_keras';
  return s;
}

// ── Core OKT evaluation ──
function evaluateOKT(drugName, context = 'auto') {
  const rules = loadRules();
  const startTime = Date.now();
  const exclusions = rules.hard_exclusions.rules;
  const pillars = rules.eligibility_pillars.pillars;
  const safetyGates = rules.safety_gates.gates;

  const drugInfo = findDrug(drugName);
  // Always check name patterns for narcotic/psychotropic classification  
  const nameBasedClass = resolveClassification(null, drugInfo ? drugInfo.name : drugName);
  const rawClassification = nameBasedClass !== 'obat_keras' ? nameBasedClass
    : (drugInfo ? drugInfo.classification : 'obat_keras');
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
    result.gate_results.push({ gate: 'EXCL-001', name: 'Narcotics Exclusion', status: 'FAIL', detail: 'Narcotics strictly off-limits' });
    result.rationale.push('Narkotika are excluded per Pasal 78(6) Permenkes 5/2026');
    result.execution_time_ms = Date.now() - startTime;
    return result;
  }
  if (classification === 'psikotropika') {
    result.eligibility = 'REJECTED';
    result.grounds.push('EXCL-002');
    result.gate_results.push({ gate: 'EXCL-002', name: 'Psychotropics Exclusion', status: 'FAIL', detail: 'Psychotropics strictly off-limits' });
    result.rationale.push('Psikotropika are excluded per Pasal 78(6) Permenkes 5/2026');
    result.execution_time_ms = Date.now() - startTime;
    return result;
  }
  if (classification === 'obat_bebas') {
    result.eligibility = 'NOT_APPLICABLE';
    result.grounds.push('EXCL-003');
    result.gate_results.push({ gate: 'EXCL-003', name: 'Already Non-Prescription', status: 'SKIP', detail: 'Drug is OTC' });
    result.execution_time_ms = Date.now() - startTime;
    return result;
  }

  // ── Auto-derive profile from class ──
  const profile = drugInfo && drugInfo.profile ? drugInfo.profile : autoDeriveProfile(drugName, 'Unknown', 'Unknown');
  result._found_in = drugInfo ? (drugInfo.class || 'Unknown') : 'Not in database';

  // ── Safety Gates ──
  let safetyPass = true;
  const safetyResults = [];

  for (const gate of safetyGates) {
    const gId = gate.id;
    let conditionMet = false;

    switch (gId) {
      case 'SAFE-01': conditionMet = profile.is_nti; break;
      case 'SAFE-02': conditionMet = profile.requires_tdm; break;
      case 'SAFE-03': conditionMet = profile.abuse_potential === 'high'; break;
      case 'SAFE-04': conditionMet = profile.is_specialist_only; break;
      case 'SAFE-05': conditionMet = profile.route === 'injectable' && !profile.self_admin; break;
      case 'SAFE-06': conditionMet = profile.requires_diagnosis && context === 'self_medication'; break;
      case 'SAFE-07': conditionMet = ['D', 'X'].includes(profile.pregnancy_category) && context === 'self_medication'; break;
    }

    if (conditionMet) {
      safetyPass = false;
      safetyResults.push({ gate: gId, name: gate.name, status: 'FAIL', detail: `${gate.name}: profile triggered rejection` });
      result.rationale.push(`REJECTED by ${gate.name}`);
    } else {
      safetyResults.push({ gate: gId, name: gate.name, status: 'PASS', detail: 'Safe' });
    }
  }

  result.gate_results = safetyResults;

  // ── Pillar Evaluation ──
  const eligiblePillars = [];
  const pillarKeys = context === 'auto' ? profile.okt_pillars : profile.okt_pillars.filter(p => p === context);

  for (const pKey of pillarKeys) {
    const pillar = pillars[pKey];
    if (!pillar) continue;
    eligiblePillars.push({
      pillar: pKey, name: pillar.name, status: 'ELIGIBLE',
      score: `${(pillar.criteria || []).length}/${(pillar.criteria || []).length}`,
      conditions: pillar.criteria
    });
  }

  // ── Decision ──
  if (!safetyPass) {
    result.eligibility = 'REJECTED';
    result.rationale.unshift('FAILED safety gates');
  } else if (eligiblePillars.length === 0) {
    result.eligibility = 'REJECTED';
    result.rationale.unshift('No OKT pillar matched');
    result.rationale.push('Requires prescription');
  } else {
    result.eligibility = eligiblePillars.some(p => p.status === 'CONDITIONAL') ? 'CONDITIONAL' : 'ELIGIBLE';
    result.grounds = eligiblePillars.map(p => p.pillar);
    for (const ep of eligiblePillars) {
      const limitsKey = ep.pillar === 'self_medication' ? 'self_medication_limits'
        : ep.pillar === 'chronic_refill' ? 'chronic_refill_limits' : 'topical_limits';
      const limits = rules.default_restrictions[limitsKey] || {};
      Object.assign(result.restrictions, limits);
    }
    result.rationale.unshift(`PASSES OKT: ${eligiblePillars.map(p => p.name).join(', ')}`);
  }

  result.pillar_evaluation = eligiblePillars;
  result.execution_time_ms = Date.now() - startTime;
  return result;
}

// ── CLI ──
function printResult(result) {
  const color = { 'ELIGIBLE': '\x1b[32m', 'CONDITIONAL': '\x1b[33m', 'REJECTED': '\x1b[31m', 'NOT_APPLICABLE': '\x1b[36m', 'UNKNOWN': '\x1b[35m' }[result.eligibility] || '';
  const reset = '\x1b[0m';
  console.log(`\n${color}${result.eligibility}${reset}  ${result.drug.padEnd(25)} ${result.classification.padEnd(15)} ${result.requested_context.padEnd(15)} ${(result.grounds || []).join(', ').padEnd(20)} ${result.execution_time_ms}ms`);
  for (const g of result.gate_results) {
    const sym = g.status === 'FAIL' ? '\x1b[31m\xe2\x9c\x97\x1b[0m' : g.status === 'PASS' ? '\x1b[32m\xe2\x9c\x93\x1b[0m' : '\x1b[36m-\x1b[0m';
    console.log(`  ${sym} ${g.gate}: ${g.status}`);
  }
  for (const r of result.rationale) console.log(`  > ${r}`);
  if (Object.keys(result.restrictions).length) console.log(`  Restrictions: ${JSON.stringify(result.restrictions)}`);
}

function printUsage() {
  console.log(`Usage:
  node okt-engine.js evaluate <drug> [context]
  node okt-engine.js list [class]
  node okt-engine.js list-all`);
}

const args = process.argv.slice(2);
if (!args.length) { printUsage(); process.exit(0); }

const useJson = args.includes('--json');
const cleanArgs = args.filter(a => a !== '--json');

switch (cleanArgs[0]) {
  case 'evaluate': {
    if (!cleanArgs[1]) { console.log('Error: provide drug name'); process.exit(1); }
    const ctx = cleanArgs[2] || 'auto';
    const result = evaluateOKT(cleanArgs[1], ctx);
    printResult(result);
    if (useJson) console.log(JSON.stringify(result, null, 2));
    break;
  }
  case 'list': {
    const db = loadDB();
    const filter = args[1] ? args[1].toLowerCase() : '';
    for (const [cls, cd] of Object.entries(db.drug_catalog.therapeutic_classes)) {
      if (filter && !cls.toLowerCase().includes(filter)) continue;
      console.log(`\n${cls}:`);
      for (const [sub, sd] of Object.entries(cd.subclasses)) {
        for (const ex of (sd.examples || [])) {
          const r = evaluateOKT(ex, 'auto');
          const badge = r.eligibility === 'ELIGIBLE' ? '\x1b[32m\u2713\x1b[0m' : r.eligibility === 'REJECTED' ? '\x1b[31m\u2717\x1b[0m' : '\x1b[33m~\x1b[0m';
          console.log(`  ${badge} ${ex.padEnd(35)} ${r.eligibility.padEnd(12)} ${(r.grounds || []).join(', ')}`);
        }
      }
    }
    break;
  }
  case 'list-all': {
    const db = loadDB();
    for (const d of db.drug_catalog.all_drugs) {
      const r = evaluateOKT(d.name, 'auto');
      const badge = r.eligibility === 'ELIGIBLE' ? '\x1b[32m\u2713\x1b[0m' : r.eligibility === 'REJECTED' ? '\x1b[31m\u2717\x1b[0m' : '\x1b[33m~\x1b[0m';
      console.log(`  ${badge} ${d.name.padEnd(30)} ${r.eligibility.padEnd(12)} ${(r.grounds || []).join(', ').padEnd(25)} ${d.class || ''}`);
    }
    break;
  }
  default:
    console.log(`Unknown: ${args[0]}`);
    printUsage();
}
