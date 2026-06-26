# Indonesian Prescription Drug Database & OKT Decision Engine

A local database and decision engine for Indonesian prescription drug classification and **Obat Keras Tertentu (OKT)** — a framework under UU 17/2023 and PP 28/2024 that allows pharmacists to dispense certain prescription drugs without a doctor's prescription.

## Legal Framework

- **UU 17/2023** Pasal 320(5) — Pharmacists may dispense certain prescription drugs without prescription
- **PP 28/2024** Pasal 922 — Three OKT pillars: self-medication (swamedikasi), chronic disease refill (resep ulangan), topical
- **Permenkes 5/2026** — Technical regulation; Pasal 78(6) excludes narcotics and psychotropics from OKT
- **KMK 2197/2023** — Formularium Nasional (Fornas), source of the 339-drug catalog

> **Note:** The formal OKT list (daftar Obat Keras Tertentu) mandated by Pasal 922(3) PP 28/2024 has not been published as of June 2026. This engine uses the generic criteria from PP 28/2024 and clinical/pharmacological reasoning.

## Files

| File | Purpose |
|------|---------|
| `database.json` | 339 generic drugs from Fornas, classified into 20 therapeutic classes |
| `okt-engine.js` | CLI decision engine — evaluates OKT eligibility for any drug |
| `okt-rules.json` | Rule definitions: hard exclusions, eligibility pillars, safety gates |
| `OKT-ALGORITHM.md` | Decision tree documentation |
| `rebuild-full-database.js` | Build script — generates database.json from the Fornas drug list |
| `final-clean-and-build.js` | Fornas PDF extraction and curation pipeline |

## Usage

```bash
# Evaluate a drug (auto-detect context)
node okt-engine.js evaluate Omeprazole

# Evaluate with specific context
node okt-engine.js evaluate Amlodipine chronic_refill
node okt-engine.js evaluate "Ketoconazole cream" topical

# List all drugs by therapeutic class
node okt-engine.js list "Cardiovascular"

# List all drugs with OKT results
node okt-engine.js list-all

# JSON output
node okt-engine.js evaluate Dexamethasone --json
```

### Context options

| Context | Description |
|---------|-------------|
| `auto` (default) | Auto-detect eligible pillar |
| `self_medication` | For short-term symptomatic use |
| `chronic_refill` | For stable chronic disease refills |
| `topical` | For topical/local application |

## Results

| Status | Meaning |
|--------|---------|
| ELIGIBLE | Pharmacist may dispense without prescription |
| CONDITIONAL | Eligible with specific conditions (monitoring, previous Rx) |
| REJECTED | Hard exclusion (narcotic/psychotropic) or safety gate failure |
| NOT_APPLICABLE | Drug is already OTC; OKT rules don't apply |

### Safety Gates

- **SAFE-01**: Narrow Therapeutic Index (e.g., warfarin, digoxin)
- **SAFE-02**: Requires TDM (e.g., warfarin, aminoglycosides)
- **SAFE-03**: High abuse potential (e.g., tramadol, opioids)
- **SAFE-04**: Specialist-only (chemotherapy, immunosuppressants)
- **SAFE-05**: Injectable (non-self-admin)
- **SAFE-06**: Diagnosis-dependent therapy for self-medication
- **SAFE-07**: Pregnancy category D/X for self-medication

## Drug Coverage

339 generic drugs extracted from KMK 2197/2023 Formularium Nasional, covering:

- Cardiovascular (ACE inhibitors, ARBs, CCBs, statins, anticoagulants, etc.)
- Anti-infective (antibiotics, antivirals, antifungals, antimalarials, anthelmintics, TB drugs)
- Analgesics (NSAIDs, narcotic analgesics, antigout, neuropathic pain)
- Antidiabetics (oral agents, insulin)
- CNS (antiepileptics, antidepressants, antipsychotics, anxiolytics)
- Gastrointestinal, Respiratory, Endocrine, Chemotherapy, Immunosuppressants
- Contraceptives, Urological, Ophthalmological, Dermatological
- Antidotes, Anesthetics, and more

## Data Sources

- **Primary**: KMK HK.01.07/MENKES/2197/2023 (Fornas 2023, 219 pages)
- **Reference**: UU 17/2023, PP 28/2024, Permenkes 5/2026, historic OWA lists

## Disclaimer

This information is for reference, education, and workflow support only. It does not constitute medical advice and must not be used as the sole basis for clinical decisions. Consult qualified healthcare professionals and validated clinical systems for patient care.
