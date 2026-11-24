"""Seed a DISPOSABLE LOCAL PostgreSQL demo DB using William's Taipei POI sample.

The default invocation is DRY RUN: no connection, no writes.

    python3 scripts/seed_mvp_local.py
    DB_HOST=localhost DB_NAME=atp_mvp_1124 ALLOW_TEST_DB_SEED=1 \
        python3 scripts/seed_mvp_local.py --apply

Never run with a production database, William's remote database, or secrets
in a committed file. Opening hours are historical and NOT independently verified.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ai.poi_adapter import normalize_weekly_hours

FILE = ROOT / "data/attractions_final_20261020_130555.json"
SOURCE = "local_review_sample"


def eligible(raw):
    address = str(raw.get("full_address") or "")
    if "臺北市" not in address and "台北市" not in address:
        return None
    duration = raw.get("estimated_visit_minutes")
    if not isinstance(duration, int) or isinstance(duration, bool) or duration <= 0:
        return None
    lat, lon = raw.get("latitude"), raw.get("longitude")
    if not isinstance(lat, (int, float)) or not -90 <= lat <= 90:
        return None
    if not isinstance(lon, (int, float)) or not -180 <= lon <= 180:
        return None
    hours = normalize_weekly_hours(raw.get("opening_hours"))
    if not any(w for w in hours.values()):
        return None
    name = raw.get("name")
    if not isinstance(name, str) or not name.strip():
        return None
    url = raw.get("source_url")
    if not isinstance(url, str) or not url.startswith("https://"):
        return None
    return {
        "name": name, "address": address, "latitude": lat, "longitude": lon,
        "category": raw.get("primary_category"), "estimated_visit_minutes": duration,
        "opening_hours": hours, "rating": raw.get("rating"),
        "source_url": url,
        "external_place_id": "sample_sha256:" + hashlib.sha256(url.encode("utf-8")).hexdigest(),
    }


def safety_guard():
    name = os.getenv("DB_NAME", "")
    host = os.getenv("DB_HOST", "")
    if (
        not name.startswith("atp_mvp_")
        or host not in ("localhost", "127.0.0.1", "::1")
        or os.getenv("ALLOW_TEST_DB_SEED") != "1"
    ):
        raise SystemExit(
            "WRITE REFUSED. Explicitly set DB_NAME=atp_mvp_<name>, "
            "DB_HOST=localhost, ALLOW_TEST_DB_SEED=1 for a disposable local DB."
        )


def apply(rows):
    safety_guard()
    from psycopg.types.json import Jsonb
    from backend.api.database import get_connection

    with get_connection() as conn:
        with conn.cursor() as cur:
            # This sample only claims verified city-level Taipei ADDRESS text,
            # NOT district-level boundary verification.
            cur.execute(
                """INSERT INTO public.region_countries
                   (country_id,iso2,iso3,name,name_zh_hant)
                   VALUES ('TW','TW','TWN','Taiwan','臺灣')
                   ON CONFLICT (country_id) DO NOTHING"""
            )
            cur.execute(
                """INSERT INTO public.regions
                   (region_id,country_id,parent_id,kind,name,enabled)
                   VALUES ('TW','TW',NULL,'country','Taiwan',TRUE)
                   ON CONFLICT (region_id) DO NOTHING"""
            )
            cur.execute(
                """INSERT INTO public.regions
                   (region_id,country_id,parent_id,kind,source_level,
                    name,name_zh_hant,name_en,enabled)
                   VALUES ('TW-TPE','TW','TW','administrative_area',1,
                           'Taipei City','臺北市','Taipei City',TRUE)
                   ON CONFLICT (region_id) DO NOTHING"""
            )
            # A disposable local demo user, matching the frontend default test UUID.
            # This is NOT an authentication mechanism and is never for production.
            cur.execute(
                """INSERT INTO public.users (user_id, display_name)
                   VALUES ('50048c95-b993-4a00-b13e-8e82262d7ec8', 'Local MVP Tester')
                   ON CONFLICT (user_id) DO NOTHING"""
            )
            written = 0
            for poi in rows:
                cur.execute(
                    """INSERT INTO public.pois
                       (name,address,latitude,longitude,category,tags,
                        estimated_visit_minutes,opening_hours,rating,
                        source,source_url,external_place_id,region_id)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'TW-TPE')
                       ON CONFLICT (source,external_place_id) DO UPDATE SET
                         name=EXCLUDED.name,
                         address=EXCLUDED.address,
                         latitude=EXCLUDED.latitude,
                         longitude=EXCLUDED.longitude,
                         category=EXCLUDED.category,
                         estimated_visit_minutes=EXCLUDED.estimated_visit_minutes,
                         opening_hours=EXCLUDED.opening_hours,
                         rating=EXCLUDED.rating
                       RETURNING poi_id""",
                    (
                        poi["name"], poi["address"], poi["latitude"], poi["longitude"],
                        poi["category"], [],
                        poi["estimated_visit_minutes"], Jsonb(poi["opening_hours"]),
                        poi["rating"], SOURCE, poi["source_url"], poi["external_place_id"],
                    ),
                )
                cur.fetchone()
                written += 1
    return written


if __name__ == "__main__":
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("--apply", action="store_true", help="Write only to explicitly opted-in LOCAL test DB")
    opts = args.parse_args()
    records = json.loads(FILE.read_text(encoding="utf-8"))
    rows = [x for item in records if (x := eligible(item)) is not None]
    print(f"Raw={len(records)}, suitable Taipei sample={len(rows)}, dry_run={not opts.apply}")
    print("These are historical raw POIs and do not establish today's opening hours.")
    if opts.apply:
        count = apply(rows)
        print(f"Upserted {count} sample POIs into the expressly selected LOCAL test DB.")
    else:
        print("No database connection or modifications. Pass --apply with guarded env to seed.")
