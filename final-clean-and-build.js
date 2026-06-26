const fs = require('fs');

// Read raw 491-entry list
const raw = JSON.parse(fs.readFileSync(
  'C:\\Users\\think\\AppData\\Local\\Temp\\opencode\\id-prescription-drug-db\\fornas-drug-list.json', 'utf-8'
));

// Manual curate: known valid drug names from Fornas
// These are the generic drug names we want to keep
const VALID_DRUGS = new Set([
  // A
  'abakavir', 'akarbose', 'albendazol', 'alopurinol', 'alprazolam',
  'alteplase', 'amfoterisin b', 'amikasin', 'aminofilin', 'amiodaron',
  'amitriptilin', 'amlodipin', 'amoksisilin', 'ampisilin',
  'artesunat', 'asam asetilsalisilat', 'asam folat', 'asam fusidat',
  'asam mefenamat', 'asam pipemidat', 'asam retinoat', 'asam salisilat',
  'asam ursodeoksikolat', 'asam zoledronat', 'asiklovir',
  'asparaginase', 'atapulgit', 'atenolol', 'atorvastatin',
  'atrakurium', 'atropin', 'azatioprin', 'azitromisin',
  // B
  'barium sulfat', 'basiliksimab', 'bedakuilin', 'bendamustin',
  'beraprost sodium', 'betahistin', 'betaksolol', 'betametason',
  'betametason valerat', 'benzatin benzilpenisilin', 'bikalutamid',
  'bisakodil', 'bisoprolol', 'bortezomib', 'brinzolamid', 'budesonid',
  'bupivakain', 'busulfan',
  // D
  'dapson', 'daunorubisin', 'deferasiroks', 'deferipron',
  'deferoksamin', 'deksametason', 'delamanid', 'desfluran',
  'desmopresin', 'desogestrel', 'desoksimetason',
  'deksmedetomidin', 'diazepam', 'dietilkarbamazin',
  'difenhidramin', 'diflukortolon valerat', 'digoksin', 'diltiazem',
  'dimenhidrinat', 'dinatrium edetat', 'dinatrium klodronat',
  'dobutamin', 'doksazosin', 'doksisiklin', 'doksorubisin',
  'dolutegravir', 'domperidon', 'donepezil', 'dopamin',
  'dutasterid',
  // E
  'efavirenz', 'efedrin', 'eltrombopag', 'enalapril',
  'entekavir', 'epinefrin', 'epirubisin', 'eritromisin',
  'eritropoietin alfa', 'esomeprazol', 'estrogen terkonjugasi',
  'etanercept', 'etil klorida', 'etonogestrel',
  // F
  'febuksostat', 'fenilefrin', 'fenitoin', 'fenobarbital',
  'fenoksimetil penisilin', 'fenoterol', 'fero sulfat',
  'finasterid', 'fitomenadion', 'flufenazin dekanoat',
  'flukonazol', 'fluoksetin', 'fluorometolon',
  'flusinolon asetonid', 'flutikason propionat',
  'fondaparinuks', 'fosfomisin trometamol',
  'framisetin sulfat', 'fulvestran', 'furosemid',
  // G
  'gabapentin', 'gansiklovir', 'gemfibrozil', 'gemsitabin',
  'gentamisin', 'glibenklamid', 'gliklazid', 'glikopironium',
  'glikuidon', 'glimepirid', 'glipizid', 'gliseril trinitrat',
  'goserelin asetat', 'griseofulvin',
  // H
  'haloperidol', 'hidroklorotiazid', 'hidrokortison',
  'hidromorfon', 'hiosin butilbromida', 'homatropin',
  // I
  'ibuprofen', 'idarubisin', 'iloprost', 'imatinib',
  'imidafenasin', 'imidapril', 'imunoglobulin intravena',
  'indakaterol', 'insulin aspart', 'insulin detemir',
  'insulin glargine', 'insulin glulisin', 'insulin lispro',
  'insulin nph', 'insulin regular', 'ioheksol', 'iopamidol',
  'iopromid', 'irbesartan', 'isofluran', 'isoniazid',
  'isosorbid dinitrat', 'itrakonazol', 'ivermektin',
  // K
  'kalium aspartat', 'kalium klorida', 'kalsium folinat',
  'kalsium glukonat', 'kalsium karbonat', 'kalsium laktat',
  'kandesartan', 'kaptopril', 'karbamazepin', 'karbimazol',
  'karboplatin', 'ketamin', 'ketokonazol', 'ketoprofen',
  'ketorolak', 'klaritromisin', 'klindamisin', 'klobazam',
  'klofazimin', 'klonazepam', 'klonidin', 'klopidogrel',
  'kloral hidrat', 'klorambusil', 'kloramfenikol',
  'klorfeniramin', 'klorheksidin', 'klorokuin', 'klorpromazin',
  'klotrimazol', 'kodein', 'kolekalsiferol', 'kolestiramin',
  'kolkisin', 'kotrimoksazol', 'kuinin',
  // L
  'laktulosa', 'lamivudin', 'lamotrigin', 'lansoprazol',
  'leflunomid', 'lenalidomid', 'lenvatinib', 'letrozol',
  'leuprorelin asetat', 'levetirasetam', 'levofloksasin',
  'levonorgestrel', 'levotiroksin', 'lidokain', 'linestrenol',
  'lisinopril', 'loperamid', 'loratadin', 'lorazepam',
  // M
  'magnesium sulfat', 'manitol', 'maprotilin', 'mebendazol',
  'medroksi progesteron asetat', 'melfalan', 'merkaptopurin',
  'meropenem', 'mesalazin', 'mesna', 'metadon',
  'metamizol', 'metenamin mandelat', 'metformin',
  'metilergometrin', 'metilfenidat', 'metilprednisolon',
  'metoklopramid', 'metoprolol', 'metotreksat', 'metronidazol',
  'mikofenolat sodium', 'mikonazol', 'milrinon',
  'minosiklin', 'misoprostol', 'moksifloksasin',
  'mometason furoat', 'morfin', 'mupirosin',
  // N
  'n-asetil sistein', 'nadroparin', 'nalokson', 'natamisin',
  'natrium bikarbonat', 'natrium diklofenak', 'natrium fluoresein',
  'natrium fosfat', 'natrium fusidat', 'natrium hialuronat',
  'natrium tiosulfat', 'neostigmin', 'nevirapin',
  'nifedipin', 'nistatin', 'nomegestrol asetat',
  'norepinefrin',
  // O
  'ofloksasin', 'oksikodon', 'oksimetazolin', 'oksitetrasiklin',
  'oksitosin', 'okskarbazepin', 'oktreotid asetat',
  'olopatadin', 'omeprazol', 'ondansetron',
  // P
  'paklitaksel', 'pantoprazol', 'parasetamol', 'pegylated interferon alfa-2a',
  'perindopril', 'permetrin', 'petidin', 'pilokarpin',
  'pioglitazon', 'pirantel pamoat', 'pirazinamid',
  'piridoksin', 'piridostigmin', 'pirimetamin',
  'podofilin', 'polikresulen', 'ponatinib',
  'povidon iodin', 'prazikuantel', 'prednisolon',
  'prednison', 'pregabalin', 'primakuin', 'probenesid',
  'prokain benzilpenisilin', 'propiltiourasil', 'propofol',
  'propranolol', 'protamin sulfat',
  // Q
  'quetiapin',
  // R
  'ramipril', 'ranibizumab', 'ranitidin', 'remdesivir',
  'remifentanil', 'retinol', 'rifampisin', 'risperidon',
  'rivaroksaban', 'rokuronium', 'ropivakain', 'rosuvastatin',
  // S
  'sacubitril valsartan', 'salbutamol', 'sefadroksil',
  'sefaleksin', 'sefazolin', 'sefepim', 'sefiksim',
  'sefoperazon', 'sefotaksim', 'sefpirom', 'seftazidim',
  'seftriakson', 'sefuroksim', 'selekoksib', 'setirizin',
  'sevofluran', 'sianokobalamin', 'siklofosfamid',
  'siklosporin', 'sildenafil', 'simvastatin',
  'siprofloksasin', 'sisplatin', 'sitarabin',
  'sodium hialuronat', 'solifenasin', 'somatropin',
  'spironolakton', 'spiramisin', 'streptokinase',
  'streptomisin', 'sufentanil', 'sukralfat',
  'suksinilkolin', 'sulfadiazin', 'sulfasalazin',
  // T
  'takrolimus', 'tamsulosin', 'telbivudin',
  'tenofovir disoproksil fumarat', 'teofilin', 'terazosin',
  'terbinafin', 'terbutalin', 'testosteron',
  'tetrakain', 'tetrasiklin', 'tiamazol', 'tiamin',
  'tiopental', 'tobramisin', 'topiramat',
  'trastuzumab', 'triamsinolon asetonid',
  'trifluoperazin', 'tropikamid',
  // V
  'valasiklovir', 'valgansiklovir', 'valproat', 'vankomisin',
  'vasopresin', 'verapamil', 'vinblastin', 'vinkristin',
  'vorikonazol',
  // W
  'warfarin',
  // Z
  'zidovudin', 'zinc', 'zonisamid',
  
  // Also include some We know are in Fornas but missed by extraction
  'kalsium polistiren sulfonat',
  'sevelamer',
  'karboksimetilselulosa',
  'karbogliserin',
  'dinoproston',
  'metenamin mandelat',
  'n-asetilsistein',
  'sukralfat',
  'polietilen glikol',
  'mesalazin',
  'mikofenolat mofetil',
  'flutikason',
  'gliseril trinitrat',
  'pantoprazol',
  'bismut subsalisilat',
  'kalsium hidroksida',
  'cairan dialisis peritoneum'
]);

// ── Extract pure drug name from each raw entry ──
function extractPureName(entry) {
  let n = entry.toLowerCase().trim();
  
  // Remove leading "-" or "."
  n = n.replace(/^[-\s.]+/, '');
  
  // Remove trailing documentation markers
  n = n.replace(/\s*jdih\.kemkes\.go\.id.*$/, '');
  n = n.replace(/\s*\d+\.\s*$/, '');
  n = n.replace(/\s*\[[a-z]+\]\s*$/, '');
  n = n.replace(/\s*\*+$/, '');
  
  // Remove trailing form/strength info: "1. tab 250 mg", "1. kaps 500 mg" etc.
  n = n.replace(/\s+\d+\s*\.\s+(tab|kaps|krim|inj|inf|sir|serb|tts|sup|ovula|drops|spray|gel|sal|lar|enema|patch|supp|tube|vial|amp)\b.*$/, '');
  
  // Remove trailing form/strength with just "n. form"
  n = n.replace(/\s+\d+\s*\.\s+[a-z].*$/, '');
  
  // Remove restriction text
  n = n.replace(/\s+(tidak|hanya|dapat|untuk|diberikan|digunakan|pada|oleh|di)\b.*$/, '');
  
  // Fix OCR artifacts
  const translations = {
    'd esfluran': 'desfluran',
    'n e ostigmin': 'neostigmin',
    'i ndakaterol': 'indakaterol',
    'fu rosemid': 'furosemid',
    'primak uin': 'primakuin',
    'ka lsium': 'kalsium',
    'tamsu losin': 'tamsulosin',
    'tropi kamid': 'tropikamid',
    'lorazep am': 'lorazepam',
    'betaks olol': 'betaksolol',
    'kolekalsifer ol': 'kolekalsiferol',
    'imatin ib': 'imatinib',
    'esomep r azol': 'esomeprazol',
    'rosuv ast atin': 'rosuvastatin',
    'propiltiour asil': 'propiltiourasil',
    'protamin sul fat': 'protamin sulfat',
    'tobramisin pa da': 'tobramisin',
    'as am': 'asam',
    'k ri m': 'krim',
    'sea s na ke': 'seasnake',
    'eritropoietin - alfa': 'eritropoietin alfa',
    'n - asetil sistein': 'n-asetil sistein',
    'komb i nasi': 'kombinasi',
    'k ombinasi': 'kombinasi',
    'k ombipak': 'kombipak',
    'ne ostigmin': 'neostigmin',
    'fu rosemid': 'furosemid',
    'primak uin': 'primakuin',
    'ro p i v a k a i n': 'ropivakain',
    'm e t o t r e k s a t': 'metotreksat',
    'b e n d a m u s t i n': 'bendamustin',
  };
  
  for (const [from, to] of Object.entries(translations)) {
    if (n.includes(from)) {
      n = n.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
    }
  }
  
  // Clean up
  n = n.replace(/\s+/g, ' ').trim();
  
  return n;
}

// ── Process ──
const found = new Set();
const matched = new Set();

for (const entry of raw.drugs) {
  const pureName = extractPureName(entry);
  
  // Try to match against valid drugs
  const lc = pureName.toLowerCase();
  
  for (const valid of VALID_DRUGS) {
    // Check if this entry contains the valid drug name (or vice versa)
    if (lc === valid || lc.startsWith(valid) || valid.startsWith(lc)) {
      if (!found.has(valid)) {
        found.add(valid);
        matched.add(pureName);
      }
      break;
    }
  }
  
  // Also check partial matches for multi-word names
  for (const valid of VALID_DRUGS) {
    if (valid.includes(lc) && lc.length >= 4 && !found.has(valid)) {
      found.add(valid);
      matched.add(pureName);
    }
  }
}

// Now also add all VALID_DRUGS that weren't found from extraction
// (these are in Fornas but our extraction missed them)
for (const d of VALID_DRUGS) {
  if (!found.has(d)) {
    found.add(d);
  }
}

const finalList = [...found].sort();
console.log(`Final drug count: ${finalList.length}`);
console.log(`From extraction: ${matched.size}`);
console.log(`From manual list: ${VALID_DRUGS.size - (found.size - matched.size)}`);
console.log('');

// Save final clean list
fs.writeFileSync(
  'C:\\Users\\think\\AppData\\Local\\Temp\\opencode\\id-prescription-drug-db\\fornas-final-list.json',
  JSON.stringify({ drugs: finalList, count: finalList.length, source: 'KMK 2197/2023 Fornas (curated)' }, null, 2),
  'utf-8'
);

finalList.forEach((d, i) => console.log(`${i+1}. ${d}`));
