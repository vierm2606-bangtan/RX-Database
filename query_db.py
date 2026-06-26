"""
Indonesian Prescription Drug Database Query Tool
Loads database.json into memory and provides query functions.

Usage:
    python query_db.py --list-classes
    python query_db.py --search <term>
    python query_db.py --class <therapeutic_class>
    python query_db.py --regulation <law/regulation>
    python query_db.py --classification <obat_keras|narkotika|psikotropika|obat_bebas>
"""

import json
import sys
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "database.json")

_db = None

def load_db():
    global _db
    if _db is None:
        with open(DB_PATH, "r", encoding="utf-8") as f:
            _db = json.load(f)
    return _db

def search_drug(query):
    db = load_db()
    query = query.lower()
    results = []
    cat = db["drug_catalog"]["therapeutic_classes"]
    for class_key, class_data in cat.items():
        if "subclasses" in class_data:
            for sub_key, sub_data in class_data["subclasses"].items():
                for ex in sub_data.get("examples", []):
                    if query in ex.lower():
                        results.append({
                            "drug": ex,
                            "therapeutic_class": class_data["class"],
                            "subclass": sub_data.get("name", sub_key),
                            "classification": class_data["classification"]
                        })
        if "examples" in class_data:
            if isinstance(class_data["examples"], dict):
                for list_key, list_val in class_data["examples"].items():
                    for ex in list_val:
                        if query in ex.lower():
                            results.append({
                                "drug": ex,
                                "therapeutic_class": class_data["class"],
                                "classification": class_data["classification"],
                                "note": list_key
                            })
            else:
                for ex in class_data["examples"]:
                    if query in ex.lower():
                        results.append({
                            "drug": ex,
                            "therapeutic_class": class_data["class"],
                            "classification": class_data["classification"]
                        })
    return results

def list_classes():
    db = load_db()
    cat = db["drug_catalog"]["therapeutic_classes"]
    print("\n=== Therapeutic Classes ===")
    for key, data in cat.items():
        print(f"  {key}: {data['class']} [{data['classification']}]")
        if "subclasses" in data:
            for sub_key, sub_data in data["subclasses"].items():
                print(f"    - {sub_key}: {sub_data.get('name', sub_key)}")

def list_classification_rules():
    db = load_db()
    print("\n=== Drug Classification Rules ===")
    cl = db["drug_classification"]["prescription_drugs"]["categories"]
    for key, data in cl.items():
        print(f"\n--- {data['name']} ---")
        print(f"  Label: {data.get('label', 'N/A')}")
        print(f"  Definition: {data.get('definition', data.get('description', 'N/A'))}")
    print("\n--- Non-Prescription Drugs ---")
    np = db["drug_classification"]["non_prescription_drugs"]["categories"]
    for key, data in np.items():
        print(f"\n--- {data['name']} ---")
        print(f"  Label: {data.get('label', 'N/A')}")
        print(f"  Examples: {', '.join(data.get('examples', []))}")

def show_regulations():
    db = load_db()
    print("\n=== Regulatory Framework ===")
    rf = db["regulatory_framework"]
    for key in ["primary_law", "implementing_regulation"]:
        item = rf[key]
        print(f"\n--- {item['name']} ---")
        print(f"  Short: {item['short']}")
        print(f"  Description: {item['description']}")
    print("\n--- Ancillary Regulations ---")
    for reg in rf["ancillary_regulations"]:
        print(f"  - {reg['name']}")
        print(f"    {reg['description']}")

def show_classification(key):
    db = load_db()
    cat = db["drug_classification"]["prescription_drugs"]["categories"]
    if key in cat:
        data = cat[key]
        print(f"\n=== {data['name']} ===")
        print(f"  Label: {data.get('label', 'N/A')}")
        print(f"  Definition: {data.get('definition', 'N/A')}")
        print(f"  Examples:")
        for ex in data.get("examples", []):
            print(f"    - {ex}")
    elif key in ["obat_bebas", "obat_bebas_terbatas"]:
        np = db["drug_classification"]["non_prescription_drugs"]["categories"]
        if key in np:
            data = np[key]
            print(f"\n=== {data['name']} ===")
            print(f"  Label: {data['label']}")
            print(f"  Examples: {', '.join(data.get('examples', []))}")
    else:
        print(f"Classification '{key}' not found. Try: obat_keras, narkotika, psikotropika, obat_bebas, obat_bebas_terbatas")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    try:
        load_db()
        print("Database loaded in memory. Ready for queries.\n")
    except Exception as e:
        print(f"Error loading database: {e}")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "--list-classes":
        list_classes()
    elif cmd == "--classification" and len(sys.argv) > 2:
        show_classification(sys.argv[2])
    elif cmd == "--regulation":
        show_regulations()
    elif cmd == "--search" and len(sys.argv) > 2:
        results = search_drug(sys.argv[2])
        if results:
            print(f"\n=== Search results for '{sys.argv[2]}' ===")
            for r in results:
                print(f"  - {r['drug']} | Class: {r['therapeutic_class']} | Classification: {r['classification']}")
        else:
            print(f"No results found for '{sys.argv[2]}'")
    elif cmd == "--class" and len(sys.argv) > 2:
        db = load_db()
        cat = db["drug_catalog"]["therapeutic_classes"].get(sys.argv[2])
        if cat:
            print(f"\n=== {cat['class']} ({sys.argv[2]}) ===")
            print(f"  Classification: {cat['classification']}")
            if "subclasses" in cat:
                for sk, sd in cat["subclasses"].items():
                    print(f"\n  -- {sd.get('name', sk)} --")
                    for ex in sd.get("examples", []):
                        print(f"    - {ex}")
            if "examples" in cat:
                for ex in cat["examples"]:
                    print(f"  - {ex}")
        else:
            print(f"Therapeutic class '{sys.argv[2]}' not found")
    else:
        print(__doc__)
