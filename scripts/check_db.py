import os
import sys
import sqlite3

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def check_database():
    db_path = "data/app.db"
    print("==================================================")
    print(f"       RESUMIO FFCS DATABASE INTEGRITY CHECK      ")
    print("==================================================")

    if not os.path.exists(db_path):
        print(f"[FAIL] Database file not found at {db_path}")
        return 1

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    try:
        # 1. PRAGMA integrity_check
        cur.execute("PRAGMA integrity_check;")
        res = cur.fetchall()
        if len(res) == 1 and res[0][0] == "ok":
            print("[OK] PRAGMA integrity_check passed (ok).")
        else:
            print(f"[FAIL] PRAGMA integrity_check failed: {res}")
            return 1

        # 2. PRAGMA foreign_key_check
        cur.execute("PRAGMA foreign_key_check;")
        fk_violations = cur.fetchall()
        if not fk_violations:
            print("[OK] PRAGMA foreign_key_check passed (0 violations).")
        else:
            print(f"[FAIL] PRAGMA foreign_key_check found {len(fk_violations)} violations: {fk_violations}")
            return 1

        # 3. Table counts
        tables = [
            "datasets",
            "courses",
            "faculty",
            "offerings",
            "meetings",
            "reviews",
            "review_matches",
            "faculty_ratings",
            "favourites",
            "preferences",
            "import_runs"
        ]

        print("\nTable Statistics:")
        print("--------------------------------------------------")
        for tbl in tables:
            cur.execute(f"SELECT count(*) FROM {tbl};")
            cnt = cur.fetchone()[0]
            print(f"  - {tbl:<20}: {cnt} rows")

        # 4. Active dataset check
        cur.execute("SELECT id, name, checksum, imported_at FROM datasets WHERE is_active = 1;")
        active = cur.fetchone()
        if active:
            print(f"\n[OK] Active Dataset: {active[1]} (ID: {active[0]})")
            print(f"     Checksum: {active[2]}")
            print(f"     Imported At: {active[3]}")
        else:
            print("\n[WARN] No dataset is currently flagged as active.")

        print("--------------------------------------------------")
        print("SUCCESS: DATABASE INTEGRITY VERIFIED (HEALTHY).")
        return 0

    except Exception as e:
        print(f"[FAIL] Exception during integrity check: {str(e)}")
        return 1
    finally:
        conn.close()

if __name__ == "__main__":
    sys.exit(check_database())
