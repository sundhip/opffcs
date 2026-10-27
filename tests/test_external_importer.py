import json
import pytest
from core.matching.external_importer import import_external_ratings_file, fetch_external_faculty_ratings

def test_import_external_ratings_file(tmp_path):
    sample_file = tmp_path / "sample_ext.json"
    data = [
        {"name": "Dr. Vijayakumar K P", "rating": 4.2, "reviewCount": 15},
        {"name": "Dr. Revathi S", "rating": 4.5, "reviewCount": 20}
    ]
    sample_file.write_text(json.dumps(data), encoding="utf-8")

    res = import_external_ratings_file(str(sample_file))
    assert res["status"] == "imported_local"
    assert res["faculty_count"] == 2
    assert res["faculty"][0]["name"] == "Dr. Vijayakumar K P"

def test_fetch_external_cached(tmp_path):
    cache_file = tmp_path / "cache.json"
    cache_payload = {
        "_metadata": {
            "source_url": "https://example.com/faculty.json",
            "retrieved_at": "2026-10-27T10:00:00"
        },
        "faculty": [
            {"name": "Prof A", "rating": 4.0}
        ]
    }
    cache_file.write_text(json.dumps(cache_payload), encoding="utf-8")

    res = fetch_external_faculty_ratings(url="https://example.com/faculty.json", cache_path=str(cache_file), force_refresh=False)
    assert res["status"] == "cached"
    assert res["faculty_count"] == 1
    assert res["faculty"][0]["name"] == "Prof A"
