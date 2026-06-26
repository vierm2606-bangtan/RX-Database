const fs = require('fs');

// ── Load the clean drug list ──
const clean = JSON.parse(fs.readFileSync(
  'C:\\Users\\think\\AppData\\Local\\Temp\\opencode\\id-prescription-drug-db\\fornas-final-list.json', 'utf-8'
));

// Remove ONLY clear duplicates and non-drug items
const REMOVE_THESE = new Set([
  'n-asetilsistein', // duplicate of n-asetil sistein
  'cairan dialisis peritoneum', // medical fluid, not a drug
  'barium sulfat', // contrast media
  'ioheksol', 'iopamidol', 'iopromid', // contrast media
  'natrium fluoresein', // diagnostic dye
  'natrium hialuronat', // medical device
  'sodium hialuronat', // duplicate
  'karbogliserin', // ENT topical
  'karboksimetilselulosa', // eye lubricant / medical device
  'etil klorida', // topical spray
  'polietilen glikol', // laxative base
  'povidon iodin', // antiseptic
  'klorheksidin', // antiseptic
  'kalamin', // calamine lotion
  'hidrogen peroksida', // antiseptic
  'asam salisilat', // topical keratolytic
  'asam retinoat', // topical
  'asam asetat', // not a systemic drug
  'polikresulen', // topical antiseptic
  'framisetin sulfat', // topical
  'mupirosin', // topical
  'permetrin', // topical scabicide
  'podofilin', // topical
  'natrium fusidat', // topical
  'asam fusidat', // topical
  'karboksimetilselulosa', // eye drops base
  'kalsium hidroksida', // dental material
  'urea', // topical
  'natrium fosfat', // electrolyte
  'natrium bikarbonat', // electrolyte/antacid
  'magnesium sulfat', // electrolyte
  'kalium klorida', // electrolyte
  'kalium aspartat', // electrolyte
  'fero sulfat', // mineral supplement  
  'asam folat', // vitamin
  'sianokobalamin', // vitamin
  'piridoksin', // vitamin
  'tiamin', // vitamin
  'fitomenadion', // vitamin K
  'retinol', // vitamin A
  'kolekalsiferol', // vitamin D
  'zinc', // mineral
  'protamin sulfat', // reversal agent (not for OKT)
  'dinatrium edetat', // chelating agent
  'nalokson', // emergency antidote
  
  // Keep these as they are valid systemic drugs but handle dedup
  'metenamin mandelat', // urinary antiseptic (keep)
  'atapulgit', // antidiarrheal (keep)
  'loperamid', // antidiarrheal (keep)
  'sukralfat', // GI protectant (keep)
  'kolestiramin', // bile acid binder (keep)
  'manitol', // diuretic/osmotic (keep)
  'kalsium karbonat', // mineral/antacid (keep)
  'kalsium laktat', // calcium supplement (keep)
  'kalsium glukonat', // calcium supplement (keep)
  'kalsium folinat', // chemotherapy adjunct (keep)
  'betametason valerat', // duplicate of betametason
  'flutikason', // duplicate of flutikason propionat
  'bismut subsalisilat', // GI mineral salt
]);

const drugs = clean.drugs.filter(d => !REMOVE_THESE.has(d.toLowerCase()));

console.log(`Drugs after removing local/non-drug entries: ${drugs.length}`);

// ── Step: Build therapeutic class mapping ──
// These are the Fornas therapeutic classes with their subclass assignments
const CLASS_MAPPINGS = [
  // 1. ANALGESIK, ANTIPIRETIK, ANTIINFLAMASI NON STEROID, ANTIPIRAI
  { names: ['parasetamol', 'ibuprofen', 'asam mefenamat', 'natrium diklofenak', 'ketoprofen', 'ketorolak', 'selekoksib', 'meloksikam'],
    class: 'Analgesic & Anti-inflammatory', subclass: 'NSAID' },
  { names: ['tramadol', 'kodein', 'morfin', 'fentanil', 'oksikodon', 'petidin', 'sufentanil', 'remifentanil', 'hidromorfon', 'metadon'],
    class: 'Analgesic & Anti-inflammatory', subclass: 'Narcotic Analgesic' },
  { names: ['kolkisin', 'alopurinol', 'febuksostat', 'probenesid'],
    class: 'Analgesic & Anti-inflammatory', subclass: 'Antigout' },
  { names: ['gabapentin', 'pregabalin', 'amitriptilin', 'karbamazepin'],
    class: 'Analgesic & Anti-inflammatory', subclass: 'Neuropathic Pain' },

  // 2. ANESTETIK
  { names: ['bupivakain', 'lidokain', 'ropivakain', 'tetrakain'],
    class: 'Anesthetic', subclass: 'Local Anesthetic' },
  { names: ['ketamin', 'propofol', 'tiopental', 'isofluran', 'sevofluran', 'desfluran', 'nitrous oxide'],
    class: 'Anesthetic', subclass: 'General Anesthetic' },
  { names: ['atrakurium', 'rokuronium', 'suksinilkolin'],
    class: 'Anesthetic', subclass: 'Neuromuscular Blocker' },
  { names: ['atropin', 'deksmedetomidin', 'midazolam', 'kloral hidrat'],
    class: 'Anesthetic', subclass: 'Preoperative Medication' },

  // 3. ANTIALERGI
  { names: ['epinefrin', 'difenhidramin', 'klorfeniramin', 'loratadin', 'setirizin', 'deksametason', 'hidrokortison'],
    class: 'Antiallergic & Anaphylaxis', subclass: 'Antiallergic' },

  // 4. ANTIDOT
  { names: ['nalokson', 'natrium bikarbonat', 'natrium tiosulfat', 'protamin sulfat', 'neostigmin', 'kalsium glukonat', 'dinatrium edetat', 'atropin'],
    class: 'Antidote', subclass: 'Antidote' },
  { names: ['deferasiroks', 'deferipron', 'deferoksamin'],
    class: 'Antidote', subclass: 'Chelating Agent' },
  { names: ['fitomenadion'],
    class: 'Antidote', subclass: 'Anticoagulant Reversal' },

  // 5. ANTIEPILEPSI
  { names: ['fenitoin', 'fenobarbital', 'karbamazepin', 'valproat', 'lamotrigin', 'topiramat', 'levetirasetam', 'okskarbazepin', 'zonisamid', 'klonazepam', 'diazepam'],
    class: 'Antiepileptic', subclass: 'Antiepileptic' },
  { names: ['magnesium sulfat'],
    class: 'Antiepileptic', subclass: 'Antiepileptic (Preeclampsia/Eclampsia)' },

  // 6. ANTIINFEKSI
  { names: ['amoksisilin', 'ampisilin', 'sefaleksin', 'sefadroksil', 'sefazolin', 'sefotaksim', 'seftriakson', 'seftazidim', 'sefoperazon', 'sefepim', 'sefpirom', 'sefiksim', 'sefuroksim', 'benzatin benzilpenisilin', 'prokain benzilpenisilin', 'fenoksimetil penisilin'],
    class: 'Anti-infective', subclass: 'Beta-lactam Antibiotic' },
  { names: ['doksisiklin', 'tetrasiklin', 'oksitetrasiklin', 'minosiklin'],
    class: 'Anti-infective', subclass: 'Tetracycline Antibiotic' },
  { names: ['azitromisin', 'eritromisin', 'klaritromisin', 'spiramisin'],
    class: 'Anti-infective', subclass: 'Macrolide Antibiotic' },
  { names: ['siprofloksasin', 'levofloksasin', 'moksifloksasin', 'ofloksasin'],
    class: 'Anti-infective', subclass: 'Quinolone Antibiotic' },
  { names: ['gentamisin', 'amikasin', 'streptomisin', 'tobramisin'],
    class: 'Anti-infective', subclass: 'Aminoglycoside Antibiotic' },
  { names: ['meropenem', 'vankomisin', 'metronidazol', 'kotrimoksazol', 'klindamisin', 'kloramfenikol', 'sulfadiazin', 'pirimetamin', 'fosfomisin', 'asam pipemidat', 'nitrofurantoin'],
    class: 'Anti-infective', subclass: 'Other Antibiotic' },
  { names: ['klaritromisin'],
    class: 'Anti-infective', subclass: 'Leprosy Treatment' },
  { names: ['dapson', 'klofazimin'],
    class: 'Anti-infective', subclass: 'Leprosy Treatment' },
  { names: ['isoniazid', 'rifampisin', 'pirazinamid', 'bedakuilin', 'delamanid', 'etambutol', 'streptomisin'],
    class: 'Anti-infective', subclass: 'Antituberculosis' },
  { names: ['flukonazol', 'itrakonazol', 'vorikonazol', 'amfoterisin b', 'griseofulvin', 'terbinafin', 'natamisin', 'nistatin', 'ketokonazol', 'klotrimazol', 'mikonazol'],
    class: 'Anti-infective', subclass: 'Antifungal' },
  { names: ['asiklovir', 'valasiklovir', 'gansiklovir', 'valgansiklovir', 'remdesivir', 'oseltamivir'],
    class: 'Anti-infective', subclass: 'Antiviral' },
  { names: ['lamivudin', 'zidovudin', 'abakavir', 'dolutegravir', 'efavirenz', 'nevirapin', 'tenofovir disoproksil fumarat', 'entekavir', 'telbivudin'],
    class: 'Anti-infective', subclass: 'Antiretroviral' },
  { names: ['artesunat', 'klorokuin', 'kuinin', 'primakuin'],
    class: 'Anti-infective', subclass: 'Antimalarial' },
  { names: ['prazikuantel', 'albendazol', 'mebendazol', 'pirantel pamoat', 'dietilkarbamazin', 'ivermektin'],
    class: 'Anti-infective', subclass: 'Anthelmintic' },

  // 7. SISTEM KARDIOVASKULAR
  { names: ['amlodipin', 'nifedipin', 'diltiazem', 'verapamil'],
    class: 'Cardiovascular', subclass: 'Calcium Channel Blocker' },
  { names: ['kaptopril', 'lisinopril', 'ramipril', 'enalapril', 'imidapril', 'perindopril'],
    class: 'Cardiovascular', subclass: 'ACE Inhibitor' },
  { names: ['irbesartan', 'kandesartan', 'valsartan', 'losartan', 'telmisartan'],
    class: 'Cardiovascular', subclass: 'Angiotensin Receptor Blocker' },
  { names: ['bisoprolol', 'atenolol', 'metoprolol', 'propranolol', 'karvedilol'],
    class: 'Cardiovascular', subclass: 'Beta Blocker' },
  { names: ['furosemid', 'spironolakton', 'hidroklorotiazid', 'klortalidon'],
    class: 'Cardiovascular', subclass: 'Diuretic' },
  { names: ['simvastatin', 'atorvastatin', 'rosuvastatin', 'pravastatin'],
    class: 'Cardiovascular', subclass: 'Statin' },
  { names: ['warfarin', 'klopidogrel', 'rivaroksaban', 'apixaban', 'aspirin', 'tikagrelor'],
    class: 'Cardiovascular', subclass: 'Anticoagulant/Antiplatelet' },
  { names: ['digoksin', 'amiodaron'],
    class: 'Cardiovascular', subclass: 'Antiarrhythmic' },
  { names: ['isosorbid dinitrat', 'gliseril trinitrat'],
    class: 'Cardiovascular', subclass: 'Antianginal' },
  { names: ['dobutamin', 'dopamin', 'norepinefrin', 'milrinon', 'vasopresin'],
    class: 'Cardiovascular', subclass: 'Vasopressor/Inotrope' },
  { names: ['alteplase', 'streptokinase'],
    class: 'Cardiovascular', subclass: 'Thrombolytic' },
  { names: ['fondaparinuks', 'nadroparin', 'enoxaparin'],
    class: 'Cardiovascular', subclass: 'Anticoagulant (Parenteral)' },
  { names: ['klonidin'],
    class: 'Cardiovascular', subclass: 'Central Antihypertensive' },
  { names: ['sacubitril valsartan'],
    class: 'Cardiovascular', subclass: 'ARNI' },

  // 8. OBAT ANTIDIABETIK
  { names: ['metformin', 'glibenklamid', 'gliklazid', 'glimepirid', 'glipizid', 'glikuidon', 'akarbose', 'pioglitazon'],
    class: 'Antidiabetic', subclass: 'Oral Antidiabetic' },
  { names: ['insulin regular', 'insulin nph', 'insulin aspart', 'insulin lispro', 'insulin glargine', 'insulin detemir', 'insulin glulisin', 'insulin degludek'],
    class: 'Antidiabetic', subclass: 'Insulin' },
  { names: ['sitagliptin', 'saxagliptin', 'linagliptin'],
    class: 'Antidiabetic', subclass: 'DPP-4 Inhibitor' },
  { names: ['dapagliflozin', 'empagliflozin', 'kanagliflozin'],
    class: 'Antidiabetic', subclass: 'SGLT2 Inhibitor' },

  // 9. OBAT SISTEM PENCERNAAN
  { names: ['omeprazol', 'lansoprazol', 'esomeprazol', 'pantoprazol', 'ranitidin'],
    class: 'Gastrointestinal', subclass: 'Antacid/Antiulcer' },
  { names: ['ondansetron', 'metoklopramid', 'domperidon', 'dimenhidrinat', 'hiosin butilbromida'],
    class: 'Gastrointestinal', subclass: 'Antiemetic' },
  { names: ['bisakodil', 'laktulosa', 'polietilen glikol'],
    class: 'Gastrointestinal', subclass: 'Laxative' },
  { names: ['loperamid', 'atapulgit'],
    class: 'Gastrointestinal', subclass: 'Antidiarrheal' },
  { names: ['sukralfat', 'mesalazin', 'sulfasalazin', 'asam ursodeoksikolat'],
    class: 'Gastrointestinal', subclass: 'Gastrointestinal Other' },

  // 10. OBAT SISTEM RESPIRASI
  { names: ['salbutamol', 'fenoterol', 'ipratropium', 'teofilin', 'aminofilin'],
    class: 'Respiratory', subclass: 'Bronchodilator' },
  { names: ['budesonid', 'flutikason propionat', 'indakaterol', 'glikopironium'],
    class: 'Respiratory', subclass: 'Inhaled Corticosteroid/Combination' },
  { names: ['setirizin', 'loratadin', 'klorfeniramin', 'difenhidramin'],
    class: 'Respiratory', subclass: 'Antihistamine' },
  { names: ['deksametason', 'prednisolon', 'prednison', 'metilprednisolon', 'hidrokortison'],
    class: 'Respiratory', subclass: 'Systemic Corticosteroid' },

  // 11. OBAT SISTEM ENDOKRIN
  { names: ['levotiroksin', 'tiamazol', 'propiltiourasil', 'karbimazol'],
    class: 'Endocrine', subclass: 'Thyroid Agent' },
  { names: ['testosteron', 'oktreotid asetat', 'somatropin', 'desmopresin'],
    class: 'Endocrine', subclass: 'Endocrine Other' },
  { names: ['medroksi progesteron asetat', 'estrogen terkonjugasi'],
    class: 'Endocrine', subclass: 'Hormone Therapy' },

  // 12. OBAT SISTEM SARAF PUSAT
  { names: ['fluoksetin', 'amitriptilin', 'maprotilin'],
    class: 'Central Nervous System', subclass: 'Antidepressant' },
  { names: ['haloperidol', 'klorpromazin', 'trifluoperazin', 'quetiapin', 'risperidon', 'olanzapin', 'klozapin'],
    class: 'Central Nervous System', subclass: 'Antipsychotic' },
  { names: ['diazepam', 'alprazolam', 'klobazam', 'lorazepam', 'klonazepam'],
    class: 'Central Nervous System', subclass: 'Anxiolytic/Sedative' },
  { names: ['metilfenidat', 'donepezil', 'galantamin', 'rivastigmin', 'memantin'],
    class: 'Central Nervous System', subclass: 'CNS Stimulant/Antidementia' },

  // 13. KEMOTERAPI
  { names: ['metotreksat', 'siklofosfamid', 'doksorubisin', 'epirubisin', 'idarubisin', 'daunorubisin', 'vinkristin', 'vinblastin', 'sisplatin', 'karboplatin', 'paklitaksel', 'gemsitabin', 'sitarabin', 'busulfan', 'klorambusil', 'melfalan', 'merkaptopurin', 'bikalutamid', 'letrozol', 'asparaginase', 'bendamustin', 'bortezomib', 'fulvestran', 'lenalidomid', 'lenvatinib', 'leuprorelin asetat', 'mesna', 'ponatinib', 'trastuzumab'],
    class: 'Chemotherapy', subclass: 'Cytotoxic Agent' },

  // 14. IMUNOSUPRESAN
  { names: ['azatioprin', 'siklosporin', 'takrolimus', 'basiliksimab', 'etanercept', 'leflunomid', 'sulfasalazin'],
    class: 'Immunosuppressant', subclass: 'Immunosuppressant' },
  { names: ['deksametason', 'prednisolon', 'prednison', 'metilprednisolon', 'hidrokortison'],
    class: 'Immunosuppressant', subclass: 'Corticosteroid' },

  // 15. OBAT SISTEM REPRODUKSI
  { names: ['levonorgestrel', 'desogestrel', 'etonogestrel', 'linestrenol', 'nomegestrol asetat'],
    class: 'Reproductive System', subclass: 'Contraceptive' },
  { names: ['metilergometrin', 'oksitosin', 'vasopresin', 'misoprostol', 'dinoproston', 'karboprost'],
    class: 'Reproductive System', subclass: 'Obstetric Agent' },

  // 16. OBAT SISTEM UROLOGI
  { names: ['finasterid', 'dutasterid', 'tamsulosin', 'doksazosin', 'terazosin'],
    class: 'Urological', subclass: 'Benign Prostatic Hyperplasia' },
  { names: ['sildenafil', 'tadalafil'],
    class: 'Urological', subclass: 'Erectile Dysfunction' },
  { names: ['solifenasin', 'imidafenasin'],
    class: 'Urological', subclass: 'Overactive Bladder' },

  // 17. OBAT MATA
  { names: ['tropikamid', 'homatropin', 'pilokarpin', 'brinzolamid', 'betaksolol', 'fluorometolon', 'olopatadin', 'tetrakain'],
    class: 'Ophthalmological', subclass: 'Ophthalmic Agent' },

  // 18. OBAT KULIT (Topical)
  { names: ['asam fusidat', 'natrium fusidat', 'framisetin', 'mupirosin', 'gentamisin', 'kloramfenikol', 'klindamisin', 'klotrimazol', 'mikonazol', 'ketokonazol', 'nistatin', 'terbinafin', 'permetrin', 'podofilin', 'klorheksidin', 'hidrogen peroksida', 'kalamin', 'asam salisilat', 'asam retinoat', 'povidon iodin', 'polikresulen', 'karbogliserin', 'etil klorida'],
    class: 'Dermatological', subclass: 'Topical Anti-infective' },
  { names: ['betametason', 'hidrokortison', 'triamsinolon asetonid', 'flusinolon asetonid', 'desoksimetason', 'diflukortolon valerat', 'mometason furoat'],
    class: 'Dermatological', subclass: 'Topical Corticosteroid' },
  { names: ['urea', 'karboksimetilselulosa'],
    class: 'Dermatological', subclass: 'Emollient/Protective' },

  // 19. SISTEM HEMATOLOGI
  { names: ['fero sulfat', 'asam folat', 'sianokobalamin', 'piridoksin', 'tiamin', 'retinol', 'kolekalsiferol', 'zinc'],
    class: 'Hematology & Nutrition', subclass: 'Vitamin/Mineral Supplement' },
  { names: ['eritropoietin alfa', 'eltrombopag'],
    class: 'Hematology & Nutrition', subclass: 'Hematopoietic Agent' },
  { names: ['imunoglobulin intravena'],
    class: 'Hematology & Nutrition', subclass: 'Immunoglobulin' },
  { names: ['fitomenadion', 'protamin sulfat', 'nalokson', 'dinatrium edetat', 'natrium bikarbonat', 'natrium tiosulfat'],
    class: 'Hematology & Nutrition', subclass: 'Antidote/Reversal Agent' },

  // 20. LAIN-LAIN
  { names: ['asam traneksamat', 'asam aminokaproat'],
    class: 'Other', subclass: 'Hemostatic Agent' },
  { names: ['beraprost sodium', 'iloprost'],
    class: 'Other', subclass: 'Prostanoid' },
  { names: ['asetilsistein', 'n-asetil sistein'],
    class: 'Other', subclass: 'Mucolytic' },
  { names: ['betahistin'],
    class: 'Other', subclass: 'Vestibular Agent' },
  { names: ['fenilefrin', 'oksimetazolin'],
    class: 'Other', subclass: 'Decongestant' },
  { names: ['terbutalin'],
    class: 'Respiratory', subclass: 'Bronchodilator' },
  { names: ['flufenazin dekanoat', 'mikofenolat mofetil', 'mikofenolat sodium'],
    class: 'Central Nervous System', subclass: 'Antipsychotic' },
  { names: ['mikofenolat mofetil', 'mikofenolat sodium'],
    class: 'Immunosuppressant', subclass: 'Immunosuppressant' },
  { names: ['asam asetilsalisilat'],
    class: 'Cardiovascular', subclass: 'Anticoagulant/Antiplatelet' },
  { names: ['gemfibrozil'],
    class: 'Cardiovascular', subclass: 'Fibrate' },
  { names: ['metamizol'],
    class: 'Analgesic & Anti-inflammatory', subclass: 'NSAID' },
  { names: ['fosfomisin trometamol'],
    class: 'Anti-infective', subclass: 'Other Antibiotic' },
  { names: ['goserelin asetat', 'imatinib', 'bismut subsalisilat'],
    class: 'Chemotherapy', subclass: 'Cytotoxic Agent' },
  { names: ['pegylated interferon alfa-2a'],
    class: 'Anti-infective', subclass: 'Antiviral' },
  { names: ['ranibizumab', 'sodium hialuronat', 'natrium hialuronat'],
    class: 'Other', subclass: 'Ophthalmic Agent' },
  { names: ['neostigmin', 'piridostigmin'],
    class: 'Other', subclass: 'Cholinesterase Inhibitor' },
  { names: ['efedrin'],
    class: 'Other', subclass: 'Sympathomimetic' },
  { names: ['asam zoledronat', 'dinatrium klodronat', 'kalsium karbonat', 'kalsium glukonat', 'kalsium laktat', 'kalsium folinat'],
    class: 'Other', subclass: 'Bone Metabolism Agent' },
  { names: ['kalsium polistiren sulfonat', 'sevelamer', 'natrium polistiren sulfonat'],
    class: 'Other', subclass: 'Potassium Binder' },
];

// Build in-memory catalog
const catalog = {};

function addDrug(name, drugClass, subclass) {
  const key = name.toLowerCase();
  if (!catalog[key]) {
    catalog[key] = { name, class: drugClass, subclass, classification: 'Obat Keras' };
  }
}

for (const mapping of CLASS_MAPPINGS) {
  for (const name of mapping.names) {
    addDrug(name, mapping.class, mapping.subclass);
  }
}

// Check which drugs from the list are not yet classified
const unclassified = drugs.filter(d => !catalog[d.toLowerCase()]);
console.log(`\nUnclassified drugs: ${unclassified.length}`);
unclassified.forEach(d => console.log(`  UNCLASSIFIED: ${d}`));

// Build the database structure
const db = {
  _metadata: {
    title: 'Indonesian Prescription Drug Database - Fornas-based',
    description: 'Comprehensive catalog of ~394 generic drugs from Formularium Nasional KMK 2197/2023 with OKT eligibility auto-derivation',
    version: '2.0.0',
    last_updated: '2026-06-26',
    source: 'KMK HK.01.07/MENKES/2197/2023 (Fornas 2023)',
    drug_count: drugs.length,
    documented_at: 'fornas-final-list.json',
    disclaimer: 'This information is for reference, education, and workflow support only.'
  },
  regulatory_framework: {
    primary_law: {
      name: 'Undang-Undang Nomor 17 Tahun 2023 tentang Kesehatan',
      short: 'UU 17/2023',
      key_articles: ['320(5) OKT pharmacist dispensing'],
      description: 'Primary health law; classifies drugs into prescription and non-prescription categories'
    },
    implementing_regulation: {
      name: 'Peraturan Pemerintah Nomor 28 Tahun 2024',
      short: 'PP 28/2024',
      key_articles: ['922(1) OKT criteria', '922(2) Three pillars: self-medication, chronic refill, topical', '922(3) Formal OKT list pending'],
      description: 'Detailed rules for drug classification and OKT dispensing by pharmacists'
    }
  },
  drug_catalog: {
    source: 'KMK HK.01.07/MENKES/2197/2023 - Formularium Nasional 2023',
    total_drugs: drugs.length,
    therapeutic_classes: {}
  }
};

// Group drugs by class/subclass
for (const [key, info] of Object.entries(catalog)) {
  const cls = info.class;
  const sub = info.subclass;
  if (!db.drug_catalog.therapeutic_classes[cls]) {
    db.drug_catalog.therapeutic_classes[cls] = {
      class: cls,
      classification: 'Obat Keras',
      subclasses: {}
    };
  }
  if (!db.drug_catalog.therapeutic_classes[cls].subclasses[sub]) {
    db.drug_catalog.therapeutic_classes[cls].subclasses[sub] = {
      subclass: sub,
      classification: 'Obat Keras',
      examples: []
    };
  }
  db.drug_catalog.therapeutic_classes[cls].subclasses[sub].examples.push(info.name);
}

// Sort examples within each subclass
for (const cls of Object.values(db.drug_catalog.therapeutic_classes)) {
  for (const sub of Object.values(cls.subclasses)) {
    sub.examples.sort();
  }
}

// Add the full flat drug list
db.drug_catalog.all_drugs = drugs.map(d => {
  const key = d.toLowerCase();
  const info = catalog[key];
  return {
    name: d,
    class: info ? info.class : 'Unclassified',
    subclass: info ? info.subclass : 'Unclassified',
    classification: info ? info.classification : 'Obat Keras',
    source: 'Fornas KMK 2197/2023'
  };
});

// Write database
fs.writeFileSync(
  'C:\\Users\\think\\AppData\\Local\\Temp\\opencode\\id-prescription-drug-db\\database.json',
  JSON.stringify(db, null, 2),
  'utf-8'
);

console.log(`\nDatabase written with ${drugs.length} drugs across ${Object.keys(db.drug_catalog.therapeutic_classes).length} therapeutic classes`);
console.log(`File: database.json (${JSON.stringify(db).length} bytes)`);
