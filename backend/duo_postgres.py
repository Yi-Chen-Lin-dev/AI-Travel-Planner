"""Schedule region searches and upload their results to PostgreSQL.

Run without arguments to continuously schedule the configured regions.
SQLite supplies the search targets. PostgreSQL records which regions are due
and stores the observations. The local outbox keeps each batch until the
database receipt and its local copy have both been saved.
"""
from __future__ import annotations

import argparse
import asyncio
import getpass
import hashlib
import json
import os
import re
import sys
import tempfile
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit


# Region names use the country hint. Use a full region ID for ambiguous names.
SCHEDULE_REGIONS = ["台灣"]
SCHEDULE_COUNTRY = "TW"
REFRESH_DAYS = 7
CHECK_INTERVAL_SECONDS = 300
RETRY_INTERVAL_SECONDS = 3600
TAIPEI = timezone(timedelta(hours=8))

# These limits match the column widths and numeric precision in public.pois.
MAX_NAME_LENGTH = 200
MAX_CATEGORY_LENGTH = 50
MAX_EXTERNAL_ID_LENGTH = 255
MAX_DB_INTEGER = 2147483647
MAX_COST = Decimal('99999999.99')
BATCH_SCHEMA_VERSION = 1
EXPORT_SCHEMA_VERSION = 3


def canonical(value):
    """Return stable JSON text for a batch, its checksum, or its receipt."""
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, allow_nan=False, separators=(',', ':')
    )


def atomic_json(path, value):
    """Write value to path atomically so an interrupted write can be retried."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_path = tempfile.mkstemp(prefix='.upload-', suffix='.tmp', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as output:
            output.write(canonical(value))
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary_path, path)
    finally:
        if os.path.exists(temporary_path):
            os.unlink(temporary_path)


def norm(value):
    """Return comparable address text, including the two spellings of Taiwan."""
    compact = re.sub(r'\s+', '', value or '')
    return compact.replace('臺', '台').casefold()


def stable_id(place):
    """Return the Google ID from an attraction or its URL. Raise ValueError if absent."""
    external_id = place.get('external_place_id')
    if external_id:
        return str(external_id)

    url = unquote(place.get('source_url') or '')
    query = parse_qs(urlsplit(url).query)
    for key in ('query_place_id', 'place_id'):
        if query.get(key):
            return query[key][0]

    # Display names can repeat. Preserve the source of each fallback identifier.
    place_id = re.search(r'!19s([A-Za-z0-9_-]+)', url)
    if place_id:
        return place_id[1]
    feature = re.search(r'!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)', url)
    if feature:
        return 'maps_feature:' + feature[1].lower()
    if query.get('cid'):
        return 'maps_cid:' + query['cid'][0]
    raise ValueError('缺少可穩定識別的 Google Place ID／Maps feature ID')


def region_from_address(place, districts):
    """Return the one district ID whose city and district both occur in the address."""
    address = norm(place.get('full_address'))
    matches = set()
    for district in districts:
        region_id, city_name, district_name = district[:3]
        if city_name and district_name:
            if norm(city_name) in address and norm(district_name) in address:
                matches.add(region_id)
    if len(matches) != 1:
        raise ValueError('地址無法唯一比對台灣縣市與鄉鎮市區，保留待確認')
    return matches.pop()


def number(value, name, low, high=None, integer=False):
    """Return a checked Decimal or integer, preserving missing values as None."""
    if value is None:
        return None
    try:
        result = Decimal(str(value))
    except InvalidOperation:
        raise ValueError(name + '不是數字')
    if not result.is_finite() or result < low or (high is not None and result > high):
        raise ValueError(name + '超出範圍')
    if integer:
        if result != int(result):
            raise ValueError(name + '超出範圍')
        return int(result)
    return result


def prepare(place, districts):
    """Validate a raw Google attraction against the district list and return a POI row."""
    region_id = region_from_address(place, districts)
    name = place.get('name') or ''
    if not name.strip() or len(name) > MAX_NAME_LENGTH:
        raise ValueError('景點名稱空白或超過200字')
    latitude = number(place.get('latitude'), '緯度', -90, 90)
    longitude = number(place.get('longitude'), '經度', -180, 180)
    if latitude is None or longitude is None:
        raise ValueError('缺少經緯度')
    category = place.get('primary_category')
    if category is not None and len(category) > MAX_CATEGORY_LENGTH:
        raise ValueError('分類超過50字')
    external_id = stable_id(place)
    if len(external_id) > MAX_EXTERNAL_ID_LENGTH:
        raise ValueError('來源識別碼超過255字')
    if place.get('source', 'google_places') != 'google_places':
        raise ValueError('非 Google 來源')

    # Older exports store a plain amount. New exports include the currency.
    cost = place.get('estimated_cost')
    if isinstance(cost, dict):
        if cost.get('currency') != 'TWD':
            raise ValueError('費用幣別不是 TWD，需人工確認')
        cost = cost.get('amount')
    return {
        'region_id': region_id,
        'external_place_id': external_id,
        'name': name,
        'address': place.get('full_address'),
        'latitude': latitude,
        'longitude': longitude,
        'category': category,
        'estimated_visit_minutes': number(
            place.get('estimated_visit_minutes'), '停留分鐘', 1, MAX_DB_INTEGER, True
        ),
        'estimated_cost': number(cost, '費用', 0, MAX_COST),
        'rating': number(place.get('rating'), '評分', 0, 5),
        'review_count': number(place.get('review_count'), '評論數', 0, MAX_DB_INTEGER, True),
        'source_url': place.get('source_url'),
        'opening_hours': place.get('opening_hours'),
    }


def make_payload(region_id, location, places, observed_at=None):
    """Wrap one region's attractions and observation time in a uniquely identified batch."""
    if not region_id:
        raise ValueError('沒有地區 ID，不能提交此區')
    return {
        'schema_version': BATCH_SCHEMA_VERSION,
        'batch_id': str(uuid.uuid4()),
        'search_region_id': region_id,
        'search_location': location,
        'observed_at': observed_at or datetime.now(timezone.utc).isoformat(),
        'attractions': places,
        'coverage': 'partial_search_results',
    }


class DriverUnavailable(RuntimeError):
    """Report that the optional PostgreSQL driver could not be loaded."""


class DatabaseConnectionError(ConnectionError):
    """Represent a connection failure that the scheduler can retry."""


class MissingDatabasePassword(DatabaseConnectionError):
    """Request a password when the server requires one to connect."""


def load_driver():
    """Return the PostgreSQL driver or raise an error with installation instructions."""
    try:
        import psycopg
    except (ImportError, OSError) as exc:
        requirements = Path(__file__).resolve().with_name('requirements-postgres.txt')
        prefix = '& ' if os.name == 'nt' else ''
        raise DriverUnavailable(
            f'無法載入 PostgreSQL 驅動 psycopg（{exc}）。\n'
            f'請在終端機執行（Windows 使用 PowerShell）：\n'
            f'{prefix}"{sys.executable}" -m pip install -r "{requirements}"'
        ) from exc
    return psycopg


def connect():
    """Open the configured PostgreSQL connection and mask its password on login errors."""
    psycopg = load_driver()
    try:
        return psycopg.connect(
            host=os.environ.get('PGHOST', '100.126.222.118'),
            port=os.environ.get('PGPORT', '5433'),
            dbname=os.environ.get('PGDATABASE', 'ai_travel_planner'),
            user=os.environ.get('PGUSER', 'travel_writer'),
            connect_timeout=10,
            application_name='duo_crawler',
            options='-c statement_timeout=30000 -c lock_timeout=10000',
        )
    except psycopg.OperationalError as exc:
        reason = str(exc)
        password = os.environ.get('PGPASSWORD')
        if password:
            reason = reason.replace(password, '***')
        if 'no password supplied' in str(exc).lower():
            raise MissingDatabasePassword(reason) from exc
        raise DatabaseConnectionError(reason) from exc


UPSERT = """
INSERT INTO public.pois(name,address,latitude,longitude,category,estimated_visit_minutes,
 estimated_cost,rating,review_count,source,source_url,external_place_id,opening_hours,
 region_id,crawl_observed_at,crawl_metadata)
VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'google_places',%s,%s,%s::jsonb,%s,%s,%s::jsonb)
ON CONFLICT(source,external_place_id) DO UPDATE SET
 name=EXCLUDED.name,address=COALESCE(EXCLUDED.address,pois.address),
 latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,
 category=COALESCE(EXCLUDED.category,pois.category),
 estimated_visit_minutes=COALESCE(pois.estimated_visit_minutes,EXCLUDED.estimated_visit_minutes),
 estimated_cost=COALESCE(EXCLUDED.estimated_cost,pois.estimated_cost),
 rating=COALESCE(EXCLUDED.rating,pois.rating),review_count=COALESCE(EXCLUDED.review_count,pois.review_count),
 source_url=EXCLUDED.source_url,opening_hours=COALESCE(EXCLUDED.opening_hours,pois.opening_hours),
 crawl_observed_at=EXCLUDED.crawl_observed_at,crawl_metadata=EXCLUDED.crawl_metadata
WHERE pois.region_id=EXCLUDED.region_id AND pois.visibility='public'
 AND (pois.crawl_observed_at IS NULL OR pois.crawl_observed_at<EXCLUDED.crawl_observed_at)
RETURNING poi_id
"""


def _write_attraction(cursor, place, raw_place, payload, observed, index, report):
    """Try one validated POI and record its outcome in the current batch report."""
    lookup_sql = (
        'SELECT region_id,visibility FROM public.pois WHERE source=%s AND external_place_id=%s'
    )
    lookup_key = ('google_places', place['external_place_id'])
    cursor.execute(lookup_sql, lookup_key)
    previous = cursor.fetchone()
    if previous and (previous[0] != place['region_id'] or previous[1] != 'public'):
        report['review'].append({
            'index': index, 'name': place['name'], 'reason': '既有景點地區衝突或私人資料，未覆寫',
        })
        return

    metadata = {
        'raw': raw_place,
        'search_region_id': payload['search_region_id'],
        'assignment_basis': 'address_text_match',
        'boundary_verified': False,
    }
    hours = place['opening_hours']
    if hours is not None:
        hours = canonical(hours)
    parameters = [
        place['name'], place['address'], place['latitude'], place['longitude'],
        place['category'], place['estimated_visit_minutes'], place['estimated_cost'],
        place['rating'], place['review_count'], place['source_url'], place['external_place_id'],
        hours, place['region_id'], observed, canonical(metadata),
    ]
    cursor.execute(UPSERT, parameters)
    if cursor.fetchone():
        report['written'] += 1
        return

    # A concurrent insert can claim the same ID after the first lookup.
    cursor.execute(lookup_sql, lookup_key)
    current = cursor.fetchone()
    if current and (current[0] != place['region_id'] or current[1] != 'public'):
        report['review'].append({
            'index': index, 'name': place['name'], 'reason': '並行寫入的地區衝突，未覆寫',
        })
    else:
        report['unchanged'] += 1


def upload(payload, connect_fn=connect):
    """Commit a region batch with its receipt and return the saved per-attraction report.

    A retry with the same ID and contents returns the original receipt. Reusing
    the ID with changed contents raises ValueError before any rows are written.
    """
    if payload.get('schema_version') != BATCH_SCHEMA_VERSION:
        raise ValueError('不支援的批次格式')
    observed = datetime.fromisoformat(payload['observed_at'])
    if observed.tzinfo is None:
        raise ValueError('批次時間必須包含時區')
    observation_day = observed.astimezone(TAIPEI).date()
    payload_text = canonical(payload)
    digest = hashlib.sha256(payload_text.encode()).hexdigest()
    batch_id = payload['batch_id']
    region_id = payload['search_region_id']

    with connect_fn() as connection, connection.cursor() as cursor:
        # Serialize receipt checks so two processes cannot replay the same batch.
        cursor.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', (batch_id,))
        cursor.execute(
            'SELECT payload_sha256,report FROM public.poi_crawl_batches WHERE batch_id=%s',
            (batch_id,),
        )
        receipt = cursor.fetchone()
        if receipt:
            if receipt[0] != digest:
                raise ValueError('批次 ID 相同但內容不同，停止覆寫')
            return receipt[1]

        cursor.execute('SELECT country_id FROM public.regions WHERE region_id=%s AND enabled',
                       (region_id,))
        target = cursor.fetchone()
        if not target:
            raise ValueError('搜尋地區不存在或未啟用')
        cursor.execute("""SELECT r.region_id,c.name_zh_hant AS city_name,r.name_zh_hant AS district_name
                FROM public.regions r JOIN public.regions c ON c.region_id=r.parent_id
                WHERE r.country_id='country:TW' AND r.source_level=3 AND r.enabled""")
        districts = []
        if target[0] == 'country:TW':
            districts = cursor.fetchall()

        report = {
            'written': 0, 'unchanged': 0, 'review': [], 'region_date_updated': False,
            'crawl_errors': payload.get('crawl_errors', []),
            'crawl_complete': payload.get('crawl_complete', True),
        }
        prepared = []
        for index, raw_place in enumerate(payload['attractions']):
            try:
                place = prepare(raw_place, districts)
            except (ValueError, TypeError, AttributeError) as exc:
                name = raw_place.get('name') if isinstance(raw_place, dict) else None
                report['review'].append({'index': index, 'name': name, 'reason': str(exc)})
                continue
            prepared.append((place, index, raw_place))

        # Overlapping batches take POI locks in the same order to avoid deadlocks.
        prepared.sort(key=lambda entry: entry[0]['external_place_id'])
        for place, index, raw_place in prepared:
            _write_attraction(cursor, place, raw_place, payload, observed, index, report)

        # Partial searches keep the old date so a later round can finish the region.
        if report['crawl_complete'] and not report['crawl_errors']:
            cursor.execute(
                'UPDATE public.regions SET last_updated_on=GREATEST(last_updated_on,%s) WHERE region_id=%s',
                (observation_day, region_id),
            )
            report['region_date_updated'] = True
        cursor.execute(
            """INSERT INTO public.poi_crawl_batches
                (batch_id,search_region_id,observed_at,payload_sha256,raw_payload,report)
                VALUES (%s,%s,%s,%s,%s::jsonb,%s::jsonb)""",
            (batch_id, region_id, observed, digest, payload_text, canonical(report)),
        )
    return report


class Outbox:
    """Keep pending batches on disk and archive each batch after its receipt is saved."""

    def __init__(self, path):
        """Use path as the directory for pending batches and their receipts."""
        self.path = Path(path)
        self.lock = asyncio.Lock()

    def enqueue(self, payload):
        """Save a batch under its existing ID and return the pending file's path."""
        path = self.path / (payload['batch_id'] + '.json')
        atomic_json(path, payload)
        return path

    async def flush(self, *, report_missing_password=False):
        """Upload pending files in name order. Return False if one must be retried.

        Set report_missing_password to let the scheduler request credentials.
        """
        async with self.lock:
            for path in sorted(self.path.glob('*.json')):
                try:
                    payload = json.loads(path.read_text(encoding='utf-8'))
                    report = await asyncio.to_thread(upload, payload)
                    sent = self.path / 'sent'
                    sent.mkdir(parents=True, exist_ok=True)
                    atomic_json(sent / (path.stem + '.report.json'), report)
                    path.replace(sent / path.name)
                    date_status = '保留（整區爬取未完成）'
                    if report.get('region_date_updated'):
                        date_status = '已更新'
                    print(
                        f'[Database] {payload["search_location"]}: 寫入 {report["written"]}，'
                        f'未變更 {report["unchanged"]}，待確認 {len(report["review"])}；'
                        f'地區日期：{date_status}', flush=True,
                    )
                except Exception as exc:
                    if report_missing_password and isinstance(exc, MissingDatabasePassword):
                        raise
                    # Driver messages may contain connection details. Log the type only.
                    print(
                        f'[Database] 尚未送達（{type(exc).__name__}），保留待傳檔：{path}；'
                        '請確認連線、密碼與 postgres_crawler_setup.sql，稍後 --retry-postgres。',
                        flush=True,
                    )
                    return False
            return True

    async def submit(self, payload):
        """Save a batch locally before attempting delivery, including older pending batches."""
        self.enqueue(payload)
        await self.flush()


def payloads_from_json(document, observed_at):
    """Yield a batch for each search district in a schema-version-3 export."""
    if document.get('schema_version') != EXPORT_SCHEMA_VERSION:
        raise ValueError('需要 schema_version=3 的完整 JSON')
    for country in document['countries']:
        for city in country['cities']:
            for group in city['districts']:
                yield make_payload(
                    group['search_area_id'], group.get('search_location'),
                    group['attractions'], observed_at,
                )


def schedule_targets():
    """Resolve configured area names or IDs to an ordered list of unique crawler targets."""
    from google_maps_duo_test import PlaceIndex

    targets = {}
    with PlaceIndex() as index:
        for selection in SCHEDULE_REGIONS:
            place_id = selection if ':' in selection else None
            plan = index.plan(place_id=place_id, text=selection, country_code=SCHEDULE_COUNTRY)
            if plan['status'] != 'ready':
                raise ValueError(f'地區無法唯一辨識：{selection}；請改用 region_id')
            for target in plan['targets']:
                targets[target['place_id']] = target
    if not targets:
        raise ValueError('SCHEDULE_REGIONS 至少需要一個地區')
    return list(targets.values())


def region_due(region_id, connect_fn=connect):
    """Return the last update date and a due flag for an enabled region.

    An empty but successful search still has a date, so the check uses the
    region timestamp even when the region contains no POIs.
    """
    with connect_fn() as connection, connection.cursor() as cursor:
        cursor.execute("""SELECT last_updated_on,
                last_updated_on IS NULL OR last_updated_on <=
                (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei')::date - %s
                FROM public.regions WHERE region_id=%s AND enabled""",
                       (REFRESH_DAYS, region_id))
        row = cursor.fetchone()
        if row is None:
            raise ValueError(f'資料庫缺少或停用了地區：{region_id}')
        return row


def scheduler_password(*, force=False, terminal=False):
    """Set PGPASSWORD interactively unless the existing libpq credentials suffice."""
    if not force:
        if os.environ.get('PGPASSWORD') or os.environ.get('PGPASSFILE'):
            return
        if os.name == 'nt':
            passfile = Path(os.environ.get('APPDATA', '')) / 'postgresql' / 'pgpass.conf'
        else:
            passfile = Path.home() / '.pgpass'
        if passfile.is_file():
            return

    user = os.environ.get('PGUSER', 'travel_writer')
    prompt = f'請輸入 PostgreSQL 帳號 {user} 的密碼：'
    while True:
        if terminal:
            password = getpass.getpass(prompt)
        else:
            password = ask_password(prompt)
        if password:
            os.environ['PGPASSWORD'] = password
            return
        print('密碼不能留白，請重新輸入。', flush=True)


def ask_password(prompt):
    """Return a masked password from the dialog or terminal. Cancel interrupts the run."""
    # PyCharm on Windows may not render a terminal password prompt.
    try:
        import tkinter as tk
        from tkinter import simpledialog

        root = tk.Tk()
        root.withdraw()
        try:
            password = simpledialog.askstring('PostgreSQL', prompt, show='*', parent=root)
        finally:
            root.destroy()
        if password is None:
            raise KeyboardInterrupt
    except Exception:
        password = getpass.getpass(prompt)
    return password


async def _due_targets(targets, cooldown, loop):
    """Return due targets after checking every region, applying per-region retry times."""
    due_targets = []
    for target in targets:
        region_id = target['place_id']
        location = target['location']
        try:
            updated, due = await asyncio.to_thread(region_due, region_id)
        except DatabaseConnectionError:
            raise
        except Exception as exc:
            print(f'[排程] {location} 檢查失敗：{type(exc).__name__}；稍後重試。', flush=True)
            cooldown[region_id] = loop.time() + RETRY_INTERVAL_SECONDS
            continue

        status = '需要爬取' if due else '尚未到期'
        print(f'[日期檢查] {location}：{updated or "尚未更新"}；' + status, flush=True)
        if due:
            if loop.time() < cooldown.get(region_id, 0):
                print(f'[排程] {location} 尚在重試等待時間，本輪暫不爬取。', flush=True)
            else:
                due_targets.append(target)
    print(f'[日期檢查完成] 已逐區檢查 {len(targets)} 區，本輪安排 {len(due_targets)} 區。', flush=True)
    return due_targets


async def _crawl_due_targets(crawl, due, default_id, outbox, filename, cooldown, loop):
    """Dispatch due regions and cool down each dispatched ID, including on a failed crawl."""
    # The first region starts this round. Later regions count only when requested.
    attempted = [due[0]['place_id']]

    async def ready_targets():
        """Yield each checked target and record it before the crawler receives it."""
        yield due[0]
        for index in range(1, len(due)):
            target = due[index]
            attempted.append(target['place_id'])
            yield target

    try:
        await crawl(
            ['--place-id', default_id, '--postgres', '--once',
             '--postgres-outbox', str(outbox), '--output', str(filename), '--headless'],
            target_source=ready_targets(),
        )
    finally:
        for region_id in attempted:
            cooldown[region_id] = loop.time() + RETRY_INTERVAL_SECONDS


async def run_scheduler(outbox):
    """Check due dates, crawl eligible regions and retry pending files until interrupted."""
    from google_maps_duo_test import main as crawl

    if min(REFRESH_DAYS, CHECK_INTERVAL_SECONDS, RETRY_INTERVAL_SECONDS) <= 0:
        raise ValueError('更新天數與等待秒數必須大於零')
    targets = schedule_targets()
    box = Outbox(outbox)
    cooldown = {}
    loop = asyncio.get_running_loop()
    output = Path(__file__).resolve().parent / 'scheduled_results'
    output.mkdir(exist_ok=True)
    print(f'[排程] 共 {len(targets)} 區；滿 {REFRESH_DAYS} 天或日期空白才爬。Ctrl+C 停止。', flush=True)

    while True:
        try:
            # Pause collection while uploads are blocked to bound the offline backlog.
            if not await box.flush(report_missing_password=True):
                await asyncio.sleep(CHECK_INTERVAL_SECONDS)
                continue
            due = await _due_targets(targets, cooldown, loop)
            if not due:
                print(f'[排程] 沒有到期地區，等待 {CHECK_INTERVAL_SECONDS} 秒。', flush=True)
                await asyncio.sleep(CHECK_INTERVAL_SECONDS)
                continue
            timestamp = datetime.now(TAIPEI).strftime('%Y%m%d_%H%M%S')
            filename = output / (timestamp + '_' + uuid.uuid4().hex + '.json')
            await _crawl_due_targets(crawl, due, targets[0]['place_id'], outbox, filename,
                                     cooldown, loop)
        except MissingDatabasePassword:
            print('[排程] 伺服器要求密碼，請補輸入後繼續。', flush=True)
            scheduler_password(force=True)
            continue
        except DatabaseConnectionError as exc:
            print(f'[排程] PostgreSQL 連線失敗：{exc}', flush=True)
        except Exception as exc:
            print(f'[排程] 本輪檢查失敗：{type(exc).__name__}；等待後再試。', flush=True)

        print(f'[排程] 等待 {CHECK_INTERVAL_SECONDS} 秒後重新檢查。', flush=True)
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)


def _check_database():
    """Check login, columns and basic write privileges without modifying rows. Return an exit code."""
    try:
        with connect() as connection, connection.cursor() as cursor:
            cursor.execute('SELECT current_database(),current_user,inet_server_port()')
            identity = cursor.fetchone()
            cursor.execute('SELECT region_id,enabled,last_updated_on FROM public.regions LIMIT 0')
            cursor.execute('SELECT batch_id,report FROM public.poi_crawl_batches LIMIT 0')
            cursor.execute('SELECT crawl_observed_at,crawl_metadata,last_updated_on FROM public.pois LIMIT 0')
            cursor.execute(
                "SELECT has_table_privilege(current_user,'public.pois','INSERT'),"
                "has_table_privilege(current_user,'public.poi_crawl_batches','INSERT'),"
                "has_column_privilege(current_user,'public.regions','last_updated_on','UPDATE')"
            )
            if not all(cursor.fetchone()):
                raise PermissionError('missing grant')
        print(f'連線與必要表結構／基本權限檢查成功：{identity}；未寫入資料。')
        return 0
    except (DriverUnavailable, DatabaseConnectionError) as exc:
        print(exc, file=sys.stderr)
    except Exception as exc:
        print(f'檢查失敗：{type(exc).__name__}。請確認 Tailscale、帳密與 setup SQL。')
    return 1


def main():
    """Run the selected scheduler, connection check, retry, or import and return its exit code."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check-postgres', action='store_true', help='只檢查登入與必要資料表，不寫入資料')
    parser.add_argument('--import-json', type=Path)
    parser.add_argument('--observed-at', help='舊 JSON 不含完成時間，必須指定實際爬取時間（含時區）')
    parser.add_argument('--outbox', type=Path, default=Path(__file__).parent / '.postgres_outbox')
    parser.add_argument('--prompt-db-password', action='store_true')
    parser.add_argument('--apply', action='store_true', help='寫入本機待傳佇列並嘗試上傳；預設僅檢查JSON')
    parser.add_argument('--retry-postgres', action='store_true')
    parser.add_argument('--schedule', action='store_true', help='持續檢查並爬取設定的地區（不帶參數時預設啟動）')
    args = parser.parse_args()

    manual_action = args.check_postgres or args.retry_postgres or args.import_json
    if args.schedule or not manual_action:
        if manual_action or args.apply or args.observed_at:
            parser.error('--schedule 不可與檢查／匯入模式混用')
        print('[排程] 啟動中，請確認密碼視窗。', flush=True)
        try:
            load_driver()
            scheduler_password(force=args.prompt_db_password, terminal=args.prompt_db_password)
            asyncio.run(run_scheduler(args.outbox.resolve()))
        except DriverUnavailable as exc:
            print(f'[排程] {exc}', file=sys.stderr)
            return 1
        except KeyboardInterrupt:
            print('[排程] 已手動停止。')
        return 0

    if args.prompt_db_password and (args.apply or args.retry_postgres or args.check_postgres):
        scheduler_password(force=True, terminal=True)
    if args.check_postgres:
        return _check_database()
    box = Outbox(args.outbox)
    if args.retry_postgres:
        return 0 if asyncio.run(box.flush()) else 1

    if not args.import_json or not args.observed_at:
        parser.error('請提供 --import-json 和 --observed-at，或 --retry-postgres')
    observed = datetime.fromisoformat(args.observed_at)
    if observed.tzinfo is None:
        parser.error('--observed-at 必須含時區，例如 +08:00')
    document = json.loads(args.import_json.read_text(encoding='utf-8'))
    payloads = list(payloads_from_json(document, observed.isoformat()))
    ids = set()
    total = 0
    for payload in payloads:
        places = payload['attractions']
        total += len(places)
        print(payload['search_location'], len(places))
        for place in places:
            try:
                ids.add(stable_id(place))
            except ValueError:
                # Keep unidentified records for review but exclude them from the unique count.
                continue
    print(f'共 {len(payloads)} 區，{total} 筆搜尋結果，{len(ids)} 個可識別景點')
    if args.apply:
        for payload in payloads:
            box.enqueue(payload)
        return 0 if asyncio.run(box.flush()) else 1
    print('僅檢查，未連線、未寫入。加 --apply 才上傳。')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
