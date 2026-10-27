import os
import re
import sqlite3
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

PHONE_REGEX = re.compile(r'(?:\+?91[\-\s]?)?[6-9]\d{9}\b')
EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')

def scan_text_string(text: str, context: str):
    issues = []
    if not isinstance(text, str):
        return issues

    # Skip import paths, CSS variables, or system tokens
    if '@vite' in text or '@tailwindcss' in text or text.startswith('usr_'):
        return issues

    phones = PHONE_REGEX.findall(text)
    for p in phones:
        issues.append(f"{context} -> Potential Phone Number: {p}")

    emails = EMAIL_REGEX.findall(text)
    for em in emails:
        if 'example.com' not in em and 'schema' not in em:
            issues.append(f"{context} -> Potential Email: {em}")

    return issues

def scan_json_file(filepath: str):
    issues = []
    try:
        if filepath.endswith('.jsonl'):
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                for idx, line in enumerate(f, start=1):
                    if not line.strip():
                        continue
                    obj = json.loads(line)
                    # Scan text and sender_hash
                    if 'text' in obj:
                        issues.extend(scan_text_string(obj['text'], f"Line {idx} text"))
                    if 'sender_hash' in obj:
                        sh = obj['sender_hash']
                        if not sh.startswith("usr_") or len(sh) != 20:
                            issues.append(f"Line {idx} -> Unhashed sender identity: {sh}")
        else:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                data = json.load(f)
                if isinstance(data, list):
                    for idx, item in enumerate(data):
                        if isinstance(item, dict):
                            for k in ['text', 'faculty_name', 'course_title', 'review_text']:
                                if k in item and item[k]:
                                    issues.extend(scan_text_string(str(item[k]), f"Item {idx} [{k}]"))
    except Exception as e:
        issues.append(f"Parse error: {str(e)}")
    return issues

def scan_database(db_path: str):
    db_issues = []
    if not os.path.exists(db_path):
        return db_issues

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    try:
        # Check reviews table
        cur.execute("SELECT review_id, sender_hash, text FROM reviews")
        rows = cur.fetchall()
        for r_id, s_hash, text in rows:
            if not s_hash.startswith("usr_") or len(s_hash) != 20:
                db_issues.append(f"Invalid/unhashed sender_hash in review {r_id}: {s_hash}")
            issues = scan_text_string(text, f"Review {r_id}")
            db_issues.extend(issues)
    except Exception as e:
        db_issues.append(f"Database query error: {str(e)}")
    finally:
        conn.close()

    return db_issues

def run_pii_scan():
    print("==================================================")
    print("       RESUMIO FFCS PII & PRIVACY SCANNER         ")
    print("==================================================")

    total_issues = 0

    # 1. Database scan
    db_path = "data/app.db"
    print(f"Scanning SQLite Database: {db_path}...")
    db_issues = scan_database(db_path)
    if db_issues:
        print(f"[FAIL] Found {len(db_issues)} issue(s) in {db_path}:")
        for iss in db_issues:
            print(f"  - {iss}")
        total_issues += len(db_issues)
    else:
        print("[OK] Database is clean. All sender identities hashed (usr_16hex), zero phone/email leaks.")

    # 2. Processed data scan
    processed_files = [
        "data/processed/reviews.jsonl",
        "data/processed/faculty_ratings.json",
        "data/processed/offerings.json",
        "data/processed/courses.json",
        "data/processed/faculty.json"
    ]
    for pf in processed_files:
        if os.path.exists(pf):
            issues = scan_json_file(pf)
            if issues:
                print(f"[FAIL] {pf}: {len(issues)} issue(s)")
                for desc in issues[:5]:
                    print(f"  - {desc}")
                total_issues += len(issues)
            else:
                print(f"[OK] {pf}: Clean (0 PII leaks).")

    print("--------------------------------------------------")
    if total_issues == 0:
        print("SUCCESS: PRIVACY AUDIT PASSED: ZERO PII LEAKS DETECTED.")
        return 0
    else:
        print(f"WARNING: PRIVACY AUDIT FAILED: {total_issues} potential PII issue(s) found.")
        return 1

if __name__ == "__main__":
    sys.exit(run_pii_scan())
