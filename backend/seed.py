import sys
import argparse
from backend.db.session import SessionLocal, engine, Base
from backend.services.importer import DatasetImporter

def seed_database(force: bool = False, dry_run: bool = False):
    print("=== Seeding Resumio FFCS Database ===")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        importer = DatasetImporter(db)
        print("Importing canonical Excel and WhatsApp chat datasets...")
        res = importer.import_dataset(
            excel_path="data/raw/subject_teachers_slots_reviews_corrected_v2.xlsx",
            zip_paths=[
                "data/raw/WhatsApp Chat - '29 FFCS 1.2.zip",
                "data/raw/WhatsApp Chat - '29 FFCS 2.1.zip",
                "data/raw/WhatsApp Chat - ffcs'29.zip"
            ],
            dataset_name="VIT Chennai Canonical Dataset",
            force=force,
            dry_run=dry_run
        )
        print("\nSeed Result:")
        print(f"  Status:       {res.get('status')}")
        print(f"  Message:      {res.get('message')}")
        print(f"  Dataset ID:   {res.get('dataset_id')}")
        if "stats" in res:
            print("  Stats:")
            for k, v in res["stats"].items():
                print(f"    - {k}: {v}")
    except Exception as e:
        print(f"\nError seeding database: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description="Seed the Resumio FFCS SQLite database from local raw files.")
    parser.add_argument("--force", action="store_true", help="Force re-import even if checksum matches.")
    parser.add_argument("--dry-run", action="store_true", help="Run validation without committing DB writes.")
    args = parser.parse_args()

    seed_database(force=args.force, dry_run=args.dry_run)

if __name__ == "__main__":
    main()
