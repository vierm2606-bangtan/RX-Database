# OKT (Obat Keras Tertentu) Decision Algorithm

## Legal Framework

```
UU 17/2023 Pasal 320(5)
  └── PP 28/2024 Pasal 922(2) - OKT criteria
        ├── (a) Swamedikasi (Self-medication)
        ├── (b) Resep Ulangan (Chronic refill)
        └── (c) Topikal (Topical)
        └── Permenkes 5/2026 (implements, revokes Permenkes 919/1993)
```

The Minister of Health OKT list (Pasal 922(3)) has **not been published** as of June 2026. This algorithm implements the generic criteria from PP 28/2024.

---

## Decision Flow Chart

```
                    ┌──────────────────────┐
                    │   INPUT: Drug Name    │
                    └──────────┬───────────┘
                               │
                               ▼
              ┌───────────────────────────────────┐
              │  STEP 1: CLASSIFICATION CHECK     │
              │  Is it Narkotika or Psikotropika? │
              └──────────┬────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │ YES                 │ NO
              ▼                     ▼
     ┌─────────────────┐   ┌───────────────────┐
     │  REJECTED       │   │ Is it Obat Keras? │
     │  Hard exclusion │   └─────────┬─────────┘
     │  Pasal 78(6)    │             │
     │  Permenkes 5/26 │   ┌─────────┴─────────┐
     └─────────────────┘   │ YES              │ NO
                           ▼                   ▼
              ┌────────────────────┐   ┌────────────────┐
              │ STEP 3: SAFETY     │   │ NOT APPLICABLE │
              │ GATES (7 checks)   │   │ Already OTC    │
              └─────────┬──────────┘   └────────────────┘
                        │
              ┌─────────┴─────────┐
              │ Any gate FAILED?  │
              └─────────┬─────────┘
                        │
              ┌─────────┴─────────┐
              │ YES              │ NO
              ▼                   ▼
     ┌─────────────────┐   ┌──────────────────────┐
     │  REJECTED       │   │ STEP 4: PILLAR CHECK │
     │  Safety fail    │   │ (PP 28/2024 Psl 922) │
     └─────────────────┘   └──────────┬───────────┘
                                      │
                ┌─────────────────────┼─────────────────────┐
                ▼                     ▼                     ▼
     ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
     │ SELF-MEDICATION  │ │ CHRONIC REFILL   │ │ TOPICAL          │
     │ PILLAR           │ │ PILLAR           │ │ PILLAR           │
     │                  │ │                  │ │                  │
     │ • Recognizable   │ │ • Stable chronic │ │ • Local action   │
     │ • Acute/self-lmt │ │ • Prior Rx       │ │ • Min systemic   │
     │ • Wide TI        │ │ • Stable dose    │ │ • Self-applicable│
     │ • No masking     │ │ • Monitorable    │ │ • Low abuse      │
     │ • Short-term     │ │ • Formularium N  │ │                  │
     └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
              │                    │                    │
              └──────────┬─────────┴─────────┬──────────┘
                         │
                         ▼
              ┌────────────────────────────┐
              │   FINAL DECISION           │
              │                            │
              │  Matches ≥1 pillar?        │
              │  + Safety gates PASS?      │
              └──────────┬─────────────────┘
                         │
              ┌──────────┴──────────┐
              │ YES                │ NO
              ▼                    ▼
     ┌─────────────────┐  ┌─────────────────┐
     │ ELIGIBLE /      │  │ REJECTED        │
     │ CONDITIONAL     │  │ No pillar match │
     │                 │  └─────────────────┘
     │ + Restrictions │
     │ + Limitations  │
     └─────────────────┘
```

---

## Safety Gates (All Must Pass)

| Gate | Name | Condition | Action |
|------|------|-----------|--------|
| SAFE-01 | Narrow Therapeutic Index | drug.attributes.is_nti == true | REJECT |
| SAFE-02 | Requires TDM | drug.attributes.requires_tdm == true | REJECT |
| SAFE-03 | High Abuse Potential | drug.attributes.abuse_potential == 'high' | REJECT |
| SAFE-04 | Specialist Only | drug.attributes.is_specialist_only == true | REJECT |
| SAFE-05 | Injectable (non-self) | route == injectable && self_admin != true | REJECT |
| SAFE-06 | Diagnosis Required | requires_diagnosis && context == self_medication | REJECT |
| SAFE-07 | Pregnancy D/X | preg_category in ['D','X'] && context == self_medication | REJECT |

---

## Pillar Evaluation (PP 28/2024)

### Pillar A: Self-Medication (Swamedikasi)
Must satisfy ≥6 of 8 criteria:
1. Condition is self-recognizable by patient
2. Acute and self-limiting (not masking serious disease)
3. Well-established safety profile, wide TI
4. Low risk of masking serious underlying disease
5. Short-term use (≤7-14 days)
6. Minimal drug-drug interactions
7. No TDM required
8. Standardized dosing (no titration)

### Pillar B: Chronic Refill (Resep Ulangan)
Must satisfy ≥5 of 7 criteria:
1. Stable chronic condition
2. Previous valid prescription exists
3. Stable dosage
4. Pharmacist can monitor (BP, BG, etc.)
5. Listed in Formularium Nasional
6. Manageable AE risk
7. Screenable contraindications

### Pillar C: Topical (Obat Topikal)
Must satisfy ≥4 of 6 criteria:
1. Topical route (cutaneous, ophthalmic, otic, nasal, rectal, vaginal)
2. Minimal systemic absorption (<5% bioavailability)
3. Local action only
4. Low systemic AE risk
5. Self-applicable
6. Low abuse potential

---

## Output Interpretation

| Result | Meaning | Pharmacist Action |
|--------|---------|-------------------|
| **ELIGIBLE** | Drug qualifies for pharmacist dispensing | Dispense with restrictions; counsel patient |
| **CONDITIONAL** | Drug qualifies with prerequisites | Verify conditions (prior Rx, monitoring); document |
| **REJECTED** | Drug must have doctor's prescription | Refer to physician |
| **NOT_APPLICABLE** | Drug already OTC or limited OTC | No prescription needed |
| **UNKNOWN** | Cannot determine classification | Consult physician |

## Dispensing Restrictions

| Context | Max Days | Max Qty | Refills | Counseling |
|---------|----------|---------|---------|------------|
| Self-medication | 7 days | Per OWA history or standard pack | Prohibited | Required |
| Chronic refill | 30 days | Per prescription | 1 time | Required with monitoring |
| Topical | Per indication | 1 tube/pack | Allowed per protocol | As needed |

---

## Known Drug Profiles in Engine

**ELIGIBLE (Self-Medication):** Omeprazole, Ranitidine, Mefenamic Acid, Salbutamol (mild intermittent asthma)

**CONDITIONAL (Chronic Refill):** Amlodipine, Captopril, Metformin, Simvastatin, Levothyroxine, Allopurinol, Insulin (stable, with prior Rx)

**ELIGIBLE (Topical):** Clindamycin topical, Ketoconazole cream, Acyclovir cream, Mupirocin, Diclofenac gel

**REJECTED:**
- All narcotics (Morphine, Fentanyl, Codeine, etc.)
- All psychotropics (Diazepam, Alprazolam, Methylphenidate, etc.)
- NTI drugs (Warfarin, Digoxin, Phenytoin, Lithium)
- Antibiotics (Amoxicillin, Ciprofloxacin - requires diagnosis, AMR concern)
- Chemotherapy agents
- Injectable non-self-admin drugs

---

## Regulatory References

| Regulation | Key Content |
|------------|-------------|
| UU 17/2023 Pasal 320 | Drug classification; OKT authority |
| PP 28/2024 Pasal 920-922 | Implementing rules; 3 OKT criteria |
| Permenkes 5/2026 Pasal 78(6) | Electronic Rx restrictions for narc/psych |
| Permenkes 5/2026 Pasal 56 | Reclassification mechanism |
| PerBPOM 5/2026 | Supervision at pharmacy facilities |
| UU 35/2009 | Narcotics classification |
| UU 5/1997 | Psychotropics classification |
