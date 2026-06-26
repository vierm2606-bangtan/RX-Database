/**
 * Indonesian Prescription Drug Database Query Tool
 * Loads database.json into memory and provides query functions.
 *
 * Usage:
 *   node query_db.js --list-classes
 *   node query_db.js --search <term>
 *   node query_db.js --class <therapeutic_class>
 *   node query_db.js --regulations
 *   node query_db.js --classification <obat_keras|narkotika|psikotropika|obat_bebas>
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.json');
let db = null;

function loadDB() {
  if (!db) {
    db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  }
  return db;
}

function searchDrug(query) {
  const db = loadDB();
  const q = query.toLowerCase();
  const results = [];
  const cat = db.drug_catalog.therapeutic_classes;

  for (const [ck, cd] of Object.entries(cat)) {
    if (cd.subclasses) {
      for (const [sk, sd] of Object.entries(cd.subclasses)) {
        for (const ex of (sd.examples || [])) {
          if (ex.toLowerCase().includes(q)) {
            results.push({ drug: ex, class: cd.class, subclass: sd.name || sk, classification: cd.classification });
          }
        }
      }
    }
    if (cd.examples) {
      if (Array.isArray(cd.examples)) {
        for (const ex of cd.examples) {
          if (ex.toLowerCase().includes(q)) {
            results.push({ drug: ex, class: cd.class, classification: cd.classification });
          }
        }
      } else {
        for (const [lk, lv] of Object.entries(cd.examples)) {
          for (const ex of lv) {
            if (ex.toLowerCase().includes(q)) {
              results.push({ drug: ex, class: cd.class, classification: cd.classification, note: lk });
            }
          }
        }
      }
    }
  }
  return results;
}

function listClasses() {
  const db = loadDB();
  const cat = db.drug_catalog.therapeutic_classes;
  console.log('\n=== Therapeutic Classes ===');
  for (const [key, data] of Object.entries(cat)) {
    console.log(`  ${key}: ${data.class} [${data.classification}]`);
    if (data.subclasses) {
      for (const [sk, sd] of Object.entries(data.subclasses)) {
        console.log(`    - ${sk}: ${sd.name || sk}`);
      }
    }
  }
}

function showClassification(key) {
  const db = loadDB();
  const rx = db.drug_classification.prescription_drugs.categories;
  const np = db.drug_classification.non_prescription_drugs.categories;

  if (rx[key]) {
    const d = rx[key];
    console.log(`\n=== ${d.name} ===`);
    console.log(`  Label: ${d.label || 'N/A'}`);
    console.log(`  Definition: ${d.definition || 'N/A'}`);
    if (d.golongan) {
      for (const [gk, gd] of Object.entries(d.golongan)) {
        console.log(`\n  Golongan ${gk}: ${gd.description}`);
        console.log(`    Examples: ${(gd.examples || []).join(', ')}`);
      }
    } else {
      console.log(`  Examples:`);
      for (const ex of (d.examples || [])) {
        console.log(`    - ${ex}`);
      }
    }
  } else if (np[key]) {
    const d = np[key];
    console.log(`\n=== ${d.name} ===`);
    console.log(`  Label: ${d.label}`);
    console.log(`  Examples: ${(d.examples || []).join(', ')}`);
  } else {
    console.log(`Classification '${key}' not found. Try: obat_keras, narkotika, psikotropika, obat_bebas, obat_bebas_terbatas`);
  }
}

function showRegulations() {
  const db = loadDB();
  const rf = db.regulatory_framework;
  console.log('\n=== Regulatory Framework ===');
  for (const key of ['primary_law', 'implementing_regulation']) {
    const item = rf[key];
    console.log(`\n--- ${item.name} ---`);
    console.log(`  Short: ${item.short}`);
    console.log(`  Description: ${item.description}`);
  }
  console.log('\n--- Ancillary Regulations ---');
  for (const reg of rf.ancillary_regulations) {
    console.log(`  - ${reg.name}`);
    console.log(`    ${reg.description}`);
  }
}

function showTherapeuticClass(key) {
  const db = loadDB();
  const cat = db.drug_catalog.therapeutic_classes[key];
  if (!cat) {
    console.log(`Therapeutic class '${key}' not found`);
    return;
  }
  console.log(`\n=== ${cat.class} (${key}) ===`);
  console.log(`  Classification: ${cat.classification}`);
  if (cat.subclasses) {
    for (const [sk, sd] of Object.entries(cat.subclasses)) {
      console.log(`\n  -- ${sd.name || sk} --`);
      for (const ex of (sd.examples || [])) {
        console.log(`    - ${ex}`);
      }
    }
  }
  if (cat.examples) {
    for (const ex of (Array.isArray(cat.examples) ? cat.examples : [])) {
      console.log(`  - ${ex}`);
    }
  }
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(fs.readFileSync(__filename, 'utf-8').split('\n').slice(0, 12).map(l => l.replace(/^ \* ?/, '')).join('\n'));
  process.exit(0);
}

try {
  loadDB();
  console.log('Database loaded in memory. Ready for queries.\n');
} catch (e) {
  console.error('Error loading database:', e.message);
  process.exit(1);
}

const cmd = args[0];
switch (cmd) {
  case '--list-classes':
    listClasses();
    break;
  case '--classification':
    if (args[1]) showClassification(args[1]);
    else console.log('Specify a classification key');
    break;
  case '--regulations':
    showRegulations();
    break;
  case '--search':
    if (args[1]) {
      const results = searchDrug(args[1]);
      if (results.length) {
        console.log(`\n=== Search results for '${args[1]}' ===`);
        for (const r of results) {
          console.log(`  - ${r.drug} | Class: ${r.class} | Classification: ${r.classification}${r.subclass ? ` | Subclass: ${r.subclass}` : ''}`);
        }
      } else {
        console.log(`No results found for '${args[1]}'`);
      }
    } else {
      console.log('Provide a search term');
    }
    break;
  case '--class':
    if (args[1]) showTherapeuticClass(args[1]);
    else console.log('Specify a class name');
    break;
  default:
    console.log('Unknown command. Try: --list-classes, --search, --class, --classification, --regulations');
}
