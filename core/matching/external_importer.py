import json
import os
import time
import urllib.request
import urllib.error
from datetime import datetime
from typing import Dict, List, Any, Optional

DEFAULT_EXTERNAL_URL = "https://faculty-rating.vercel.app/faculty.json"
CACHE_PATH = "data/external/faculty_rating_cache.json"
USER_AGENT = "Resumio-FFCS-Research/1.0 (VIT Personal Timetable Project; offline-first)"

def fetch_external_faculty_ratings(
    url: str = DEFAULT_EXTERNAL_URL,
    cache_path: str = CACHE_PATH,
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    Safely retrieves external faculty ratings from the public community site.
    Respects rate limiting, uses local caching, stops on 403/429, and tags source metadata.
    """
    cache_dir = os.path.dirname(os.path.abspath(cache_path))
    os.makedirs(cache_dir, exist_ok=True)

    # 1. Check local cache first unless force_refresh is requested
    if os.path.exists(cache_path) and not force_refresh:
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {
                    "status": "cached",
                    "retrieved_at": data.get("_metadata", {}).get("retrieved_at"),
                    "source_url": data.get("_metadata", {}).get("source_url", url),
                    "faculty_count": len(data.get("faculty", [])),
                    "faculty": data.get("faculty", [])
                }
        except Exception:
            pass

    # 2. Network request with safe headers and rate limiting
    req = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT}
    )

    try:
        # Sleep to guarantee max 1 req per 2 seconds
        time.sleep(2.0)
        with urllib.request.urlopen(req, timeout=10) as response:
            status_code = response.getcode()
            if status_code in [403, 429]:
                raise PermissionError(f"HTTP {status_code}: Access restricted by server. Aborting.")
            raw_data = response.read().decode("utf-8")
            parsed_json = json.loads(raw_data)

            # Standardize payload
            faculty_list = parsed_json if isinstance(parsed_json, list) else parsed_json.get("professors", [])
            retrieval_date = datetime.utcnow().isoformat()

            cached_payload = {
                "_metadata": {
                    "source_url": url,
                    "retrieved_at": retrieval_date,
                    "agent": USER_AGENT
                },
                "faculty": faculty_list
            }

            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(cached_payload, f, indent=2, ensure_ascii=False)

            return {
                "status": "fetched",
                "retrieved_at": retrieval_date,
                "source_url": url,
                "faculty_count": len(faculty_list),
                "faculty": faculty_list
            }

    except urllib.error.HTTPError as e:
        if e.code in [403, 429]:
            raise PermissionError(f"HTTP {e.code}: Scraper blocked or rate limit reached. Halting immediately.")
        raise RuntimeError(f"HTTP Error {e.code}: {e.reason}")
    except Exception as e:
        # If network fails, check if old cache exists as fallback
        if os.path.exists(cache_path):
            with open(cache_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {
                    "status": "fallback_cached",
                    "retrieved_at": data.get("_metadata", {}).get("retrieved_at"),
                    "source_url": data.get("_metadata", {}).get("source_url", url),
                    "faculty_count": len(data.get("faculty", [])),
                    "faculty": data.get("faculty", [])
                }
        raise e

def import_external_ratings_file(file_path: str) -> Dict[str, Any]:
    """
    Offline manual import path for local CSV or JSON external ratings file.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"External ratings file not found: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        faculty_list = data if isinstance(data, list) else data.get("faculty", [])

    return {
        "status": "imported_local",
        "file_path": file_path,
        "retrieved_at": datetime.utcnow().isoformat(),
        "faculty_count": len(faculty_list),
        "faculty": faculty_list
    }
