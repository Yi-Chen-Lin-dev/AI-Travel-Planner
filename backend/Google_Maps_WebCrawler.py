"""Plan administrative-area searches, collect Google Maps attractions, and export JSON.

PlaceIndex reads the local SQLite index. Browser searches share a SearchResults
snapshot so a place found in several areas keeps every source. Exported area
labels describe the search area and do not verify an attraction's address.
"""

from typing import Any
import argparse
from collections import defaultdict
import sqlite3
import unicodedata
import asyncio
import getpass
import json
import copy
import os
import tempfile
import time
import uuid
import re
import random
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
import sys
from urllib.parse import urlencode, urlsplit, urlunsplit, parse_qs


# Resolve data relative to this module so invocation from another directory works.
DEFAULT_DB = Path(__file__).resolve().parent / 'world data' / 'world_admin.sqlite'
NAVIGATION_TIMEOUT_MS = 60000
DETAIL_TIMEOUT_MS = 45000
FEED_TIMEOUT_MS = 45000
HOURS_TIMEOUT_MS = 20000
CONTROL_TIMEOUT_MS = 15000
# Sample a fresh delay for each scroll and each completed detail record.
MIN_DELAY_SECONDS = 1
MAX_DELAY_SECONDS = 5
MAX_IDLE_ROUNDS = 8
MIN_SCROLL_PIXELS = 500
SCROLL_VIEWPORT_RATIO = 0.8
DEFAULT_LIMIT = 10000
SHOW_BROWSER = False
COOLDOWN_SECONDS = 30
DETAIL_PAGES_PER_AREA = 2
DEFAULT_MAX_SCROLLS = 2000
DEFAULT_MAX_TARGETS = None
# Configure (search tabs, detail tabs per search) by hierarchy tier.
TAB_PROFILES = {1: (1, 1), 2: (1, 1), 3: (1, 1)}
# A locked OneDrive destination may become available between write attempts.
REPLACE_RETRY_DELAYS = (0.2, 0.5, 1.0)


def normalize(value):
    """Return the comparison key for a place name or alias."""
    normal_name = unicodedata.normalize('NFKC', value).casefold().replace('臺', '台')
    letters = []
    for character in normal_name:
        if character.isalnum():
            letters.append(character)
    return ''.join(letters)


class PlaceIndex:
    """Resolve multilingual names and plan descendant searches in a read-only index."""

    def __init__(self, path=DEFAULT_DB):
        database = Path(path).expanduser().resolve()
        if not database.is_file():
            raise ValueError(
                f'找不到行政區資料庫：{database}\n'
                '請確認 world data/world_admin.sqlite 已放到電腦；'
                '若存放於其他資料夾，請用 --database "完整路徑" 指定。')
        try:
            self.db = sqlite3.connect(database.as_uri() + '?mode=ro', uri=True)
        except sqlite3.Error as exc:
            raise ValueError(
                f'無法開啟行政區資料庫：{database}\n'
                f'SQLite 訊息：{exc}\n'
                '若位於 OneDrive，請先選擇「一律保留在此裝置上」並等候下載完成；'
                '也可複製至本機資料夾，再用 --database "完整路徑" 指定。') from exc
        self.db.row_factory = sqlite3.Row

    def close(self):
        self.db.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    def get(self, place_id):
        """Look up a place by its index ID; return its decoded record or None."""
        row = self.db.execute('SELECT details_json FROM search_places WHERE id=?', (place_id,)).fetchone()
        if row is None:
            return None
        return json.loads(row[0])

    def label(self, place_id, language='auto'):
        """Return a display name, falling back to English and then the source name."""
        node = self.get(place_id)
        if node is None:
            raise ValueError('Unknown place_id: ' + place_id)
        if language == 'auto':
            language = node['preferred_search_language']
        name = node['names'].get(language) or node['names'].get('en')
        if name:
            return name
        if language == 'en':
            return node.get('ascii_name') or node['name']
        return node['name']

    def path(self, place_id):
        """Follow parent IDs and return the path from the country to the place."""
        result = []
        seen = set()
        while place_id:
            if place_id in seen:
                raise ValueError('Cycle in search hierarchy')
            seen.add(place_id)
            node = self.get(place_id)
            if node is None:
                raise ValueError('Missing ancestor: ' + place_id)
            result.append(node)
            place_id = node['search_parent_id']
        result.reverse()
        return result

    def qualified_name(self, place_id, language='auto'):
        """Format the complete path in the customary order for the search language."""
        if language == 'auto':
            language = self.get(place_id)['preferred_search_language']
        labels = []
        for node in self.path(place_id):
            labels.append(self.label(node['id'], language))
        if language.startswith('zh'):
            return ' '.join(labels)
        labels.reverse()
        return ', '.join(labels)

    def area_metadata(self, place_id, language='auto'):
        """Return area labels and their hierarchy for grouping results by search area."""
        nodes = self.path(place_id)
        country = None
        city = None
        nearest_town = None
        for node in nodes:
            kind = node.get('kind')
            if country is None and kind == 'country':
                country = node
            if kind == 'populated_place':
                nearest_town = node
            # In the Taiwan index, source level 2 represents a county or city.
            if city is None and node.get('country_id') == 'country:TW' and node.get('source_level') == 2:
                city = node
        if city is None:
            city = nearest_town

        leaf = nodes[-1]
        district = None
        if leaf.get('kind') == 'administrative_area' and leaf is not city and leaf is not country:
            district = leaf

        def area_label(node):
            if node:
                return self.label(node['id'], language)
            return None

        administrative_path = []
        for node in nodes:
            administrative_path.append({
                'id': node['id'],
                'name': area_label(node),
                'kind': node.get('kind'),
                'source_level': node.get('source_level'),
            })
        return {
            'place_id': place_id,
            'country': area_label(country),
            'city': area_label(city),
            'district': area_label(district),
            'administrative_path': administrative_path,
            'basis': 'search_area',
            'address_verified': False,
        }

    def resolve(self, text, country_code=None):
        """Find enabled candidates for a name, optionally within one country.

        Each result includes its ID, display names, country and kind. Candidates
        from different countries stay separate so a caller can resolve ambiguity.
        """
        key = normalize(text)
        if not key:
            return []
        args = [key]
        query = '''SELECT DISTINCT p.id FROM place_names n JOIN search_places p ON p.id=n.place_id
                   WHERE n.normalized=? AND p.search_enabled=1'''
        if country_code:
            query += ' AND p.country_id=?'
            args.append('country:' + country_code.upper())

        # A current country name takes priority over unrelated historical aliases.
        places = {}
        direct_ids = set()
        curated_ids = set()
        canonical_ids = set()
        matched_country = False
        for row in self.db.execute(query + ' ORDER BY p.id', args):
            place_id = row[0]
            place = self.get(place_id)
            places[place_id] = place
            names = [place['name'], *place['names'].values()]
            if any(normalize(name) == key for name in names if name):
                canonical_ids.add(place_id)
                direct_ids.add(place_id)
            for alias in place.get('search_aliases', []):
                if normalize(alias['name']) != key:
                    continue
                if alias['source'] == 'name_overrides.json':
                    curated_ids.add(place_id)
                    direct_ids.add(place_id)
                elif alias['source'] == 'user_requested_alias':
                    direct_ids.add(place_id)
            if place_id in direct_ids and place.get('kind') == 'country':
                matched_country = True

        # Resolve priority within each country so cross-border names stay visible.
        by_country = defaultdict(list)
        for place_id, place in places.items():
            if matched_country and place_id not in direct_ids:
                continue
            by_country[place['country_id']].append(place_id)

        results = []
        for country_ids in by_country.values():
            preferred = [place_id for place_id in country_ids if place_id in curated_ids]
            if not preferred:
                preferred = [place_id for place_id in country_ids if place_id in canonical_ids]
            if not preferred:
                preferred = country_ids
            for place_id in preferred:
                place = places[place_id]
                results.append({
                    'id': place_id,
                    'name': self.label(place_id),
                    'name_en': self.label(place_id, 'en'),
                    'qualified_name': self.qualified_name(place_id),
                    'country_id': place['country_id'],
                    'kind': place.get('kind'),
                })
        return results

    def search_children(self, place_id):
        """Return eligible children, respecting configured search boundaries."""
        node = self.get(place_id)
        if node is None:
            raise ValueError('Unknown place_id: ' + place_id)
        if node['search_stop']:
            return []
        return [row[0] for row in self.db.execute(
            "SELECT id FROM search_places WHERE search_parent_id=? "
            "AND search_enabled=1 AND place_kind='administrative_area' "
            "AND json_extract(details_json, '$.parent_id') IS NOT NULL ORDER BY id",
            (place_id,))]

    def tab_profile(self, place_id):
        """Return concurrency for a selected root using searchable descendants.

        Args:
            place_id: The user's selected place, before depth expansion.
        Returns:
            A dictionary with a capped bottom-up tier and tab limits.

        Countries use different administrative levels. A searchable leaf is
        therefore tier one; any branch with grandchildren makes tier three.
        Missing descendants reflect available data, not verified geography.
        """
        children = self.search_children(place_id)
        tier = 1
        if children:
            tier = 2
            for child in children:
                if self.search_children(child):
                    tier = 3
                    break
        search_tabs, detail_tabs = TAB_PROFILES[tier]
        return dict(tier=tier, search_tabs=search_tabs,
                    detail_tabs_per_search=detail_tabs)

    def plan(self, text=None, *, place_id=None, country_code=None, depth=1,
             max_targets=DEFAULT_MAX_TARGETS, language='auto'):
        """Plan every searchable leaf without silently truncating coverage.

        Args:
            text: Place name or alias, ignored when place_id is supplied.
            place_id: Explicit index identifier for disambiguation.
            country_code: Optional ISO country filter.
            depth: Legacy positive argument; expansion always continues to leaves.
            max_targets: Optional leaf-count limit; None allows all leaves.
            language: Search-label language, or auto for regional defaults.
        Returns:
            A status dictionary with targets, candidates, or overflow details.
        """
        if depth < 1 or (max_targets is not None and max_targets < 1):
            raise ValueError('depth and max_targets must be positive')
        if place_id is None:
            matches = self.resolve(text or '', country_code)
            if not matches:
                return dict(status='not_found', candidates=[], targets=[])
            if len(matches) > 1:
                return dict(status='ambiguous', candidates=matches, targets=[])
            place_id = matches[0]['id']
        root = self.get(place_id)
        if root is None or not root['search_enabled']:
            return dict(status='not_found', candidates=[], targets=[])
        if country_code and root['country_id'] != 'country:' + country_code.upper():
            return dict(status='not_found', candidates=[], targets=[])
        leaf_ids = []
        stack = [(place_id, frozenset())]
        visited = set()
        while stack:
            node_id, ancestors = stack.pop()
            if node_id in ancestors:
                raise ValueError('Cycle in search hierarchy: ' + node_id)
            if node_id in visited:
                continue
            visited.add(node_id)
            children = self.search_children(node_id)
            if children:
                # The stack pops the last child first. Push in reverse index order.
                child_ancestors = ancestors | {node_id}
                for child in reversed(children):
                    stack.append((child, child_ancestors))
            else:
                leaf_ids.append(node_id)

        if max_targets is not None and len(leaf_ids) > max_targets:
            return dict(status='too_many_targets', selected_id=place_id,
                        target_count=len(leaf_ids), max_targets=max_targets, targets=[])
        targets = []
        for node_id in leaf_ids:
            node = self.get(node_id)
            location = self.qualified_name(node_id, language)
            search_language = language
            if language == 'auto':
                search_language = node['preferred_search_language']
            query = location + ' 觀光景點'
            if search_language == 'en':
                query = location + ' tourist attractions'

            if node_id != place_id:
                reason = 'smaller_admin_area'
            elif node['search_stop']:
                reason = 'configured_stop'
            elif node.get('kind') == 'populated_place':
                reason = 'populated_place_no_admin_children'
            else:
                reason = 'no_smaller_area_in_data'

            targets.append({
                'place_id': node_id,
                'location': location,
                'place_kind': node.get('kind'),
                'administrative_area': self.area_metadata(node_id, language),
                'query': query,
                'name_zh': node['names']['zh-Hant'],
                'name_en': node['names']['en'],
                'ancestor_ids': [parent['id'] for parent in self.path(node_id)],
                'selection_reason': reason,
            })

        # Keep Taiwan's requested starting district first, then group by full path.
        def target_order(target):
            path = self.path(target['place_id'])
            labels = [normalize(node['names'].get('zh-Hant') or node['name']) for node in path]
            is_taipei = root['country_id'] == 'country:TW' and '台北市' in labels
            is_zhongzheng = is_taipei and labels[-1] == '中正區'
            return (not is_taipei, not is_zhongzheng, target['location'], target['place_id'])

        targets.sort(key=target_order)
        return dict(status='ready', selected_id=place_id, targets=targets,
            concurrency=self.tab_profile(place_id),
            coverage='partial_unverified', warnings=['資料缺漏不代表沒有更小行政區；搜尋結果不保證行政邊界內完整涵蓋。'])



@dataclass
class SearchResults:
    """Keep shared results deduplicated across administrative-area searches."""
    location: str = ''
    source_url: str = ''
    started_at: str = field(default_factory=lambda: datetime.now().astimezone().isoformat())
    attractions: dict = field(default_factory=dict)
    searches: list = field(default_factory=list)
    area_metadata: dict = field(default_factory=dict)
    deferred_output: Path | None = field(default=None, repr=False)
    checkpoint_path: Path | None = field(default=None, repr=False)

    def add(self, item, *, location=None, source_url=None):
        """Add one list card and its source to this snapshot; return its deduplication key."""
        key = url_key(item['url'])
        if key not in self.attractions:
            self.attractions[key] = {
                'name': item.get('name', ''),
                'url': item['url'],
                'rating_label': item.get('rating_label', ''),
                'text': item.get('text', ''),
                'address': '',
                'address_status': '尚未讀取',
                'locations': [],
                'source_urls': [],
                'opening_hours': None,
                'hours_status': '等待營業時間階段',
            }

        row = self.attractions[key]
        # Explicit sources keep a concurrent search from borrowing another area's URL.
        if location is None:
            location = self.location
        if source_url is None:
            source_url = self.source_url
        if location and location not in row['locations']:
            row['locations'].append(location)
        if source_url and source_url not in row['source_urls']:
            row['source_urls'].append(source_url)
        return key

    def to_dict(self):
        """Return an independent snapshot so callers cannot mutate live results."""
        return {
            'schema_version': 2,
            'location': self.location,
            'source_url': self.source_url,
            'started_at': self.started_at,
            'count': len(self.attractions),
            'attractions': copy.deepcopy(self.attractions),
            'searches': copy.deepcopy(self.searches),
            'area_metadata': copy.deepcopy(self.area_metadata),
        }

    def save_json(self, path):
        """Write a recovery snapshot, redirecting a pending public export to its checkpoint."""
        if self.deferred_output is not None and Path(path).resolve() == self.deferred_output.with_suffix('.json'):
            path = self.checkpoint_path
        atomic_write(path, lambda file: json.dump(
            self.to_dict(), file, ensure_ascii=False, indent=2), allow_recovery=True)


RECOVERY_OUTPUTS = {}


def atomic_write(path, write, encoding='utf-8', allow_recovery=False):
    """Write through a temporary file to protect the previous checkpoint.

    Args:
        path: Destination file path.
        write: Callback that writes to the opened text stream.
        encoding: Output text encoding.
        allow_recovery: Keep a recovery copy if the destination stays locked.
    Returns:
        None. The destination is replaced only after a successful write."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding=encoding, newline='',
                                         dir=path.parent, prefix=path.stem + '.recovery-',
                                         suffix=path.suffix, delete=False) as file:
            temporary = file.name
            write(file)
            file.flush()
            os.fsync(file.fileno())
        for attempt in range(len(REPLACE_RETRY_DELAYS) + 1):
            try:
                os.replace(temporary, path)
                if RECOVERY_OUTPUTS.pop(str(path.resolve()), None):
                    print(f'原輸出已恢復寫入：{path.resolve()}', flush=True)
                break
            except PermissionError:
                if attempt < len(REPLACE_RETRY_DELAYS):
                    time.sleep(REPLACE_RETRY_DELAYS[attempt])
                    continue
                if not allow_recovery:
                    raise
                recovery = path.with_name(path.stem + '.recovery' + path.suffix)
                try:
                    os.replace(temporary, recovery)
                except PermissionError:
                    # The complete temporary file is already flushed to disk.
                    recovery = Path(temporary)
                    temporary = None
                key = str(path.resolve())
                if RECOVERY_OUTPUTS.get(key) != str(recovery.resolve()):
                    print(f'存檔提醒：原檔暫時無法覆寫：{path.resolve()}\n'
                          f'最新資料已保存至：{recovery.resolve()}\n'
                          '搜尋繼續；請關閉占用輸出檔的程式，或改用 OneDrive 外的輸出資料夾。', flush=True)
                RECOVERY_OUTPUTS[key] = str(recovery.resolve())
                break
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)


# Convert internal collection records to the public JSON schema.
WEEKDAYS = ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')


def structured_hours(raw: str | None) -> dict[str, str | None]:
    """Convert Chinese or English weekday lines to a seven-day schedule with missing days set to None."""
    result: dict[str, str | None] = dict.fromkeys(WEEKDAYS)
    for line in (raw or '').splitlines():
        match = re.match(r'^(星期|週|周)([一二三四五六日天])\s*[:：]\s*(.*)$', line)
        if match:
            index = '一二三四五六日'.find(match[2].replace('天', '日'))
            value = match[3]
        else:
            match = re.match(r'^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*[:：]\s*(.*)$', line, re.I)
            if not match:
                continue
            index = WEEKDAYS.index(match[1].lower())
            value = match[2]
        result[WEEKDAYS[index]] = re.sub(r'\s*[–—－]\s*', '-', value).strip() or None
    return result


def place_coordinates(url):
    """Return validated place latitude and longitude, or two None values."""
    # !3d/!4d identify the place; @lat,lng is only the camera position.
    match = re.search(r'!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)', url or '')
    if match:
        latitude, longitude = map(float, match.groups())
        if -90 <= latitude <= 90 and -180 <= longitude <= 180:
            return latitude, longitude
    return None, None


def explicit_cost(text):
    """Only accept explicitly labelled admission prices with unambiguous currencies."""
    for line in (text or '').splitlines():
        if not re.search(r'門票|票價|入場費|admission|entry fee', line, re.I):
            continue
        match = re.search(r'(TWD|NT\$|USD|US\$|EUR|€|JPY|JP¥|HKD|HK\$|GBP|£|CNY|RMB|KRW|₩)\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)', line, re.I)
        if match:
            aliases = {'NT$': 'TWD', 'US$': 'USD', '€': 'EUR', 'JP¥': 'JPY',
                       'HK$': 'HKD', '£': 'GBP', 'RMB': 'CNY', '₩': 'KRW'}
            currency = match[1].upper()
            return dict(amount=float(match[2].replace(',', '')),
                        currency=aliases.get(currency, currency))
    return None


# Planning estimates in minutes. More specific categories come before "park".
VISIT_MINUTES_BY_CATEGORY = (
    (r'觀景台|observation deck', 90),
    (r'博物館|美術館|museum|art museum', 120),
    (r'動物園|遊樂園|zoo|theme park', 240),
    (r'公園|park', 60),
    (r'寺|廟|教堂|temple|church', 45),
)


def public_place(row: dict[str, Any]) -> dict[str, Any]:
    """Build one public attraction record from a collected card and its optional detail fields."""
    detail_url = row.get('detail_url') or row['url']
    latitude, longitude = place_coordinates(detail_url)
    category = row.get('primary_category')
    if category:
        category = str(category)
    else:
        category = None

    # The project estimates visit length by category. Unknown categories stay unset.
    duration = None
    for pattern, minutes in VISIT_MINUTES_BY_CATEGORY:
        if category and re.search(pattern, category, re.I):
            duration = minutes
            break
    rating = None
    match = re.search(r'(\d+(?:[.,]\d+)?)\s*(?:顆?星|stars?)', (row.get('rating_label') or ''), re.I)
    if match:
        value = float(match[1].replace(',', '.'))
        if 0 <= value <= 5:
            rating = value
    review_count = None
    match = re.search(r'([\d,，]+)\s*(?:則?評論|則評價|reviews?)', (row.get('review_label') or ''), re.I)
    if match:
        review_count = int(match[1].replace(',', '').replace('，', ''))
    query = parse_qs(urlsplit(detail_url).query)
    place_ids = query.get('query_place_id', [])
    place_id = place_ids[0] if place_ids else None
    hours = None
    if row.get('opening_hours') or row.get('hours_attempted'):
        hours = structured_hours(row.get('opening_hours'))
        hours['status'] = row.get('hours_status')

    return {
        'name': row['name'],
        'latitude': latitude,
        'longitude': longitude,
        'plus_code': row.get('plus_code') or None,
        'source': 'google_places',
        'full_address': row.get('address') or None,
        'primary_category': category,
        'estimated_visit_minutes': duration,
        'estimated_cost': row.get('estimated_cost') or explicit_cost(row.get('cost_text')),
        'opening_hours': hours,
        'rating': rating,
        'review_count': review_count,
        'source_url': row['url'],
        'external_place_id': row.get('external_place_id') or place_id,
    }


EXTRACT_METADATA = r"""() => {
    const main = document.querySelector('[role="main"]');
    if (!main) return {};
    const text = el => el ? el.innerText.trim() : '';
    const plus = main.querySelector('[data-item-id="oloc"]');
    const rating = main.querySelector('[role="img"][aria-label*="星"], [role="img"][aria-label*="star"]');
    const reviews = Array.from(main.querySelectorAll('button[aria-label]'))
        .find(el => /[\d,，]+\s*(則?評論|則評價|reviews?)/i.test(el.getAttribute('aria-label')));
    const category = main.querySelector('button[jsaction*="category"]');
    return {
        primary_category: text(category),
        plus_code: plus ? text(plus.querySelector('.Io6YTe')) || text(plus) : '',
        rating_label: rating ? rating.getAttribute('aria-label') : '',
        review_label: reviews ? reviews.getAttribute('aria-label') : '',
        cost_text: main.innerText.split('\n').filter(line => /門票|票價|入場費|admission|entry fee/i.test(line)).join('\n'),
        detail_url: location.href
    };
}"""


def save_results(results, output):
    """Save internal recovery JSON; public JSON is exported at round end."""
    if results.deferred_output is not None:
        path = results.checkpoint_path
    else:
        path = Path(output).with_suffix('.json')
    results.save_json(path)


def grouped_results(results):
    """Group the shared snapshot by country, city and district for public JSON.

    One attraction may appear in several search areas. Within a single area,
    include it once even when its source list contains two labels for that area.
    """
    countries = {}
    unknown = dict(country=None, city=None, district=None, place_id=None,
                   administrative_path=[], basis='unknown', address_verified=False)
    for row in results.attractions.values():
        areas = []
        for location in row.get('locations', []):
            if location in results.area_metadata:
                areas.append(results.area_metadata[location])
            else:
                areas.append(dict(unknown, search_location=location))
        if not areas:
            areas.append(unknown)
        seen = set()
        for area in areas:
            identity = (area.get('place_id'), area.get('search_location'))
            if identity in seen:
                continue
            seen.add(identity)
            country = countries.setdefault(area['country'], dict(country=area['country'], cities={}))
            city = country['cities'].setdefault(area['city'], dict(city=area['city'], districts={}))
            group = city['districts'].setdefault(identity, dict(
                district=area['district'], search_area_id=area.get('place_id'),
                search_location=area.get('search_location'),
                administrative_path=area.get('administrative_path', []), attractions=[]))
            place = public_place(row)
            place.update(country=area['country'], city=area['city'], district=area['district'],
                         administrative_area_basis=area.get('basis', 'search_area'),
                         address_verified=False)
            group['attractions'].append(place)
    output = []
    for country in countries.values():
        for city in country['cities'].values():
            city['districts'] = list(city['districts'].values())
        country['cities'] = list(country['cities'].values())
        output.append(country)
    return dict(schema_version=3, unique_attraction_count=len(results.attractions), countries=output)


def export_completed_results(results, output):
    """Write the grouped public snapshot to the JSON path derived from output."""
    atomic_write(Path(output).with_suffix('.json'), lambda file: json.dump(
        grouped_results(results), file, ensure_ascii=False, indent=2, allow_nan=False), allow_recovery=True)


# Keep DOM extraction together because Maps markup may change independently.
EXTRACT_CARDS = r"""feed => {
    return Array.from(feed.querySelectorAll('a[href*="/maps/place/"]'))
      .map(link => {
        const card = link.closest('[role="article"]') || link.closest('.Nv2PK');
        return {
          name: link.getAttribute('aria-label') || link.textContent.trim(),
          url: link.href,
          text: card ? card.innerText : '',
          rating_label: card ? Array.from(card.querySelectorAll('[role="img"][aria-label]'))
            .map(x => x.getAttribute('aria-label'))
            .filter(x => /星|star/i.test(x)).join(' | ') : ''
        };
      }).filter(x => x.name && x.url);
}"""


def url_key(url):
    """Ignore query and fragment variations when deduplicating place URLs."""
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, '', ''))


EXTRACT_TEMPORARILY_CLOSED = r"""() => {
    // Restrict to the current place's heading area, before the overview tabs.
    // Do not match reviews, recommendations, or ordinary "Closed now" labels.
    for (const main of document.querySelectorAll('[role="main"]')) {
        const title = main.querySelector('h1');
        const tabs = main.querySelector('[role="tablist"]');
        if (!title || !tabs) continue;
        for (const el of main.querySelectorAll('span, div')) {
            if (el.children.length || !el.getClientRects().length) continue;
            if (!/^(暫時關閉|暂时关闭|暫停營業|暂停营业|Temporarily closed|永久停業|永久停业|永久關閉|永久关闭|Permanently closed)$/i.test(el.innerText.trim())) continue;
            if ((title.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) &&
                (el.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING)) return /永久|Permanently/i.test(el.innerText) ? '永久停業' : '暫停營業';
        }
    }
    return false;
}"""


EXTRACT_HOURS = r"""() => {
    const day = /^(星期[一二三四五六日天]|週[一二三四五六日天]|周[一二三四五六日天]|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i;
    const valid = value => /\d{1,2}[:：]\d{2}|24\s*(小時|小时|hours?)|休息|公休|不營業|不营业|closed|open 24/i.test(value);
    let best = [];
    for (const root of document.querySelectorAll('[role="main"], [role="dialog"]')) {
        if (!root.getClientRects().length) continue;
        const found = new Map();
        const add = (label, value) => {
            const match = label.match(day);
            if (match && valid(value)) found.set(match[1], match[1] + '：' + value.trim());
        };
        for (const row of root.querySelectorAll('tr, [role="row"]')) {
            if (!row.getClientRects().length) continue;
            const cells = Array.from(row.querySelectorAll('td, th, [role="cell"], [role="rowheader"]'))
                .map(cell => cell.innerText.trim().replace(/\s+/g, ' '));
            if (cells.length >= 2) add(cells[0], cells.slice(1).join(' '));
        }
        // Some Maps layouts render hours as divs rather than a HTML table.
        const lines = root.innerText.split('\n').map(s => s.trim()).filter(Boolean);
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(day);
            if (!match) continue;
            const inline = lines[i].slice(match[0].length).replace(/^[\s:：]+/, '');
            if (valid(inline)) add(match[1], inline);
            else if (!inline && i + 1 < lines.length && !day.test(lines[i + 1])) {
                const periods = [];
                for (let j = i + 1; j < lines.length && j <= i + 4; j++) {
                    if (day.test(lines[j]) || !valid(lines[j])) break;
                    periods.push(lines[j]);
                }
                add(match[1], periods.join('、'));
            }
        }
        if (found.size > best.length) best = Array.from(found.values());
    }
    return best.join('\n');
}"""


EXTRACT_ADDRESS = r"""() => {
    const element = document.querySelector('[role="main"] [data-item-id="address"]');
    if (!element) return '';
    const label = element.getAttribute('aria-label') || '';
    if (/^(地址|地址資訊|Address)\s*[:：]/i.test(label))
        return label.replace(/^(地址|地址資訊|Address)\s*[:：]\s*/i, '').trim();
    const text = element.querySelector('.Io6YTe');
    return text ? text.innerText.trim() : '';
}"""


# Finish each batch before reopening Chromium so in-flight rows are checkpointed.
PLACES_PER_BROWSER = 50
BROWSER_RESTART_WAIT_SECONDS = 5
DETAIL_RECOVERY_LIMIT = 2
HOURS_ATTEMPTS = 4
FEED_ATTEMPTS = 3
FEED_RETRY_WAIT_SECONDS = 5
MAX_HOURS_DIAGNOSTICS = 3
DIAGNOSTIC_TEXT_LIMIT = 30000
SCREENSHOT_TIMEOUT_MS = 10000
CLOSED_STATUSES = ('暫時關閉', '暫停營業', '永久停業')


def merge_weekly_hours(week, raw):
    """Fill weekdays from raw Maps text in place, keeping earlier data for missing days."""
    for day, value in structured_hours(raw).items():
        if value:
            week[day] = value


def weekly_hours_text(week):
    """Return the populated weekdays in the order used by the checkpoint format."""
    lines = []
    for day, value in week.items():
        if value:
            lines.append(f'{day.title()}：{value}')
    return '\n'.join(lines)


def is_hours_expander(item_id, label, text, expanded):
    """Identify a closed hours panel without selecting a contribution action."""
    description = label + ' ' + text
    edit_action = re.search(
        r'新增|添加|編輯|编辑|修改|建議|建议|回報|回报|報告|报告|提供|'
        r'\b(add|edit|suggest|report|update|contribute)\b', description, re.I)
    if edit_action or expanded == 'true':
        return False

    if label.strip().lower() in ('顯示本週營業時間', '显示本周营业时间', 'show weekly hours'):
        return True
    if item_id == 'oh':
        return True
    if expanded != 'false':
        return False
    return bool(re.search(r'營業時間|营业时间|opening hours|營業中|营业中|休息中|open|closed',
                          description, re.I))


async def read_opening_hours(page, url, timeout_error, navigate=True):
    """Return (weekly text, status) from a place page, opening url if requested.

    timeout_error is the browser's timeout type. A late or partial table may
    still supply some weekdays after a wait expires.
    """
    if navigate:
        await page.goto(url, wait_until='domcontentloaded', timeout=NAVIGATION_TIMEOUT_MS)
        await page.locator('[role="main"] h1').first.wait_for(timeout=DETAIL_TIMEOUT_MS)
    try:
        await page.wait_for_function(
            """() => document.querySelector('[data-item-id="oh"]') ||
                document.querySelector('[role="main"] table') ||
                Array.from(document.querySelectorAll('[role="main"] [aria-label]'))
                  .some(el => /營業時間|营业时间|[Oo]pening hours/.test(el.getAttribute('aria-label')))""",
            timeout=HOURS_TIMEOUT_MS,
        )
    except timeout_error:
        pass

    closure = await page.evaluate(EXTRACT_TEMPORARILY_CLOSED)
    if closure in ('暫停營業', '永久停業') or closure is True:
        label = closure if isinstance(closure, str) else '暫停營業'
        return weekly_hours_text(dict.fromkeys(WEEKDAYS, label)), label

    hours = await page.evaluate(EXTRACT_HOURS)
    week = structured_hours(hours)
    if all(week.values()):
        return hours, '已取得'

    controls = page.locator(
        '[role="main"] [aria-label="顯示本週營業時間"], '
        '[role="main"] [aria-label="显示本周营业时间"], '
        '[role="main"] [aria-label="Show weekly hours"], '
        '[role="main"] [data-item-id="oh"], '
        '[role="main"] [aria-expanded], '
        '[role="main"] [role="button"][aria-expanded][aria-label]')
    for index in range(await controls.count()):
        control = controls.nth(index)
        if not await control.is_visible():
            continue
        label = await control.get_attribute('aria-label') or ''
        text = await control.inner_text(timeout=CONTROL_TIMEOUT_MS)
        item_id = await control.get_attribute('data-item-id')
        expanded = await control.get_attribute('aria-expanded')
        # Clicking an open panel would hide the table we still need to read.
        if expanded == 'true':
            if not is_hours_expander(item_id, label, text, 'false'):
                continue
        else:
            if not is_hours_expander(item_id, label, text, expanded):
                continue
            await control.click(timeout=CONTROL_TIMEOUT_MS)
        try:
            await page.wait_for_function(
                '() => { const raw = (' + EXTRACT_HOURS + ')(); '
                'return raw && raw.split("\\n").length >= 7; }',
                timeout=HOURS_TIMEOUT_MS)
        except timeout_error:
            pass
        merge_weekly_hours(week, await page.evaluate(EXTRACT_HOURS))
        hours = weekly_hours_text(week)
        if all(week.values()):
            return hours, '已取得'

    if not hours:
        return '', '未找到營業時間（可能未提供或頁面格式不同）'
    body = await page.locator('body').inner_text(timeout=CONTROL_TIMEOUT_MS)
    if re.search(r'Google 地圖目前只顯示部分內容|Google Maps.*(?:limited|partial)', body, re.I):
        return hours, 'Google 地圖限制內容：僅提供部分星期'
    return hours, '僅取得部分星期的營業時間'


def is_readonly_hours_control(label, item_id, expanded):
    return is_hours_expander(item_id, label, '', expanded)


async def launch_maps_browser(playwright, headless):
    """Use the same Chromium channel for visible and background sessions."""
    return await playwright.chromium.launch(channel='chromium', headless=headless)


class BrowserSession:
    """Own the browser and remember which detail records survived a restart."""

    def __init__(self, playwright, headless=False):
        self.headless = headless
        self.playwright = playwright
        self.browser = None
        self.context = None
        self.page = None
        self.completed = set()
        self.since_restart = 0

    async def start(self, storage_state=None):
        """Open a Taiwanese Maps page context, optionally restoring session cookies."""
        self.browser = await launch_maps_browser(self.playwright, self.headless)
        options = {'locale': 'zh-TW', 'viewport': {'width': 1440, 'height': 1000}}
        if storage_state is not None:
            options['storage_state'] = storage_state
        self.context = await self.browser.new_context(**options)
        self.context.set_default_navigation_timeout(NAVIGATION_TIMEOUT_MS)
        self.page = await self.context.new_page()

    async def restart(self, checkpoint, reason='已完成 50 個景點'):
        """Save progress and carry consent cookies into the replacement context."""
        checkpoint()
        state = await self.context.storage_state()
        await self.close()
        await asyncio.sleep(BROWSER_RESTART_WAIT_SECONDS)
        await self.start(state)
        self.since_restart = 0
        print(f'{reason}，已保存並重開瀏覽器；後續每區以最多兩個分頁讀取詳細資料。', flush=True)

    async def close(self):
        if self.browser is not None:
            await self.browser.close()


async def read_place_details(page, row, timeout_error):
    """Fill address, metadata and collection status in one attraction row."""
    await page.goto(row['url'], wait_until='domcontentloaded', timeout=NAVIGATION_TIMEOUT_MS)
    await page.locator('[role="main"] h1').first.wait_for(timeout=DETAIL_TIMEOUT_MS)
    try:
        await page.locator('[data-item-id="address"]').first.wait_for(timeout=CONTROL_TIMEOUT_MS)
    except timeout_error:
        # Places without an address can still have useful category and review data.
        pass
    address = await page.evaluate(EXTRACT_ADDRESS)
    metadata = await page.evaluate(EXTRACT_METADATA)
    if isinstance(metadata, dict):
        for name, value in metadata.items():
            if value:
                row[name] = value
    row['address'] = address
    row['address_status'] = '已取得' if address else '未找到地址'
    row.setdefault('opening_hours', None)
    row['hours_status'] = '等待營業時間階段'


async def stop_page_workers(tasks):
    """Wait for unfinished workers to stop before closing their pages."""
    for task in tasks:
        if not task.done():
            task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)


async def collect_opening_hours(context, rows, workers, timeout_error, browser_error, checkpoint=lambda: None):
    """Collect place details into rows before the separate weekly-hours stage.

    context tracks completed keys across restarts. workers limits the number
    of open pages. checkpoint saves completed rows before any retry.
    """
    pending = [(key, row) for key, row in rows.items() if key not in context.completed]
    recovery_attempts = 0

    async def read_batch(page, queue):
        """Drain rows on one page, marking each successful detail read before saving."""
        while not queue.empty():
            key, row = queue.get_nowait()
            try:
                await read_place_details(page, row, timeout_error)
            except (browser_error, timeout_error) as exc:
                row['hours_status'] = '讀取失敗'
                if row['address_status'] == '尚未讀取':
                    row['address_status'] = '讀取失敗'
                print(f'{row["name"]} 讀取失敗：{str(exc).splitlines()[0]}', file=sys.stderr)
                checkpoint()
                raise
            context.completed.add(key)
            context.since_restart += 1
            row['detail_attempted'] = True
            checkpoint()
            print(f'已處理 {len(context.completed)} 個景點；本次瀏覽器 '
                  f'{context.since_restart}/{PLACES_PER_BROWSER}：{row["name"]}', flush=True)
            await asyncio.sleep(random.uniform(MIN_DELAY_SECONDS, MAX_DELAY_SECONDS))

    while pending:
        remaining_slots = PLACES_PER_BROWSER - context.since_restart
        batch = pending[:remaining_slots]
        queue = asyncio.Queue()
        for item in batch:
            queue.put_nowait(item)
        pages = [context.page]
        tasks = []
        failure = None
        try:
            page_count = min(DETAIL_PAGES_PER_AREA, workers, len(batch))
            for _ in range(1, page_count):
                pages.append(await context.context.new_page())
            for page in pages:
                tasks.append(asyncio.create_task(read_batch(page, queue)))
            await asyncio.gather(*tasks)
        except (browser_error, timeout_error) as exc:
            failure = exc
        finally:
            await stop_page_workers(tasks)
            for page in pages[1:]:
                if not page.is_closed():
                    try:
                        await page.close()
                    except browser_error:
                        pass
            checkpoint()

        pending = [(key, row) for key, row in pending if key not in context.completed]
        if failure is not None:
            recovery_attempts += 1
            if recovery_attempts > DETAIL_RECOVERY_LIMIT:
                print('讀取重試兩次仍失敗，已保存並停止本輪。', file=sys.stderr)
                await context.close()
                raise failure
            reason = f'讀取失敗，重試 {recovery_attempts}/{DETAIL_RECOVERY_LIMIT}'
            await context.restart(checkpoint, reason=reason)
        elif context.since_restart == PLACES_PER_BROWSER:
            await context.restart(checkpoint)


async def save_hours_diagnostic(page, row, status, output_dir, headless):
    """Save the rendered page and its controls beside a partial-hours diagnostic.

    row identifies the place; status and headless describe the failed read.
    Capture errors are recorded separately so collection can continue.
    """
    stem = Path(output_dir) / uuid.uuid4().hex
    try:
        stem.parent.mkdir(parents=True, exist_ok=True)
        diagnostic = {
            'name': row['name'],
            'source_url': row['url'],
            'page_url': page.url,
            'headless': headless,
            'browser_channel': 'chromium',
            'status': status,
            'opening_hours': structured_hours(row.get('opening_hours')),
        }
        try:
            page_text = await page.locator('body').inner_text(timeout=CONTROL_TIMEOUT_MS)
            diagnostic['page_text'] = page_text[:DIAGNOSTIC_TEXT_LIMIT]
            diagnostic['controls'] = await page.locator('[role="main"] [aria-label]').evaluate_all(
                "els => els.map(el => ({label: el.getAttribute('aria-label'), "
                "expanded: el.getAttribute('aria-expanded'), item: el.getAttribute('data-item-id')}))")
        except Exception as exc:
            diagnostic['capture_error'] = str(exc)
        try:
            await page.screenshot(path=str(stem.with_suffix('.png')), timeout=SCREENSHOT_TIMEOUT_MS)
        except Exception as exc:
            diagnostic['screenshot_error'] = str(exc)
        atomic_write(stem.with_suffix('.json'), lambda file: json.dump(
            diagnostic, file, ensure_ascii=False, indent=2), allow_recovery=True)
        print(f'[營業時間診斷] {stem.with_suffix(".json").resolve()}', flush=True)
    except Exception as exc:
        print(f'[營業時間診斷保存失敗] {exc}', flush=True)


async def fill_place_hours(page, copies, timeout_error, browser_error, checkpoint):
    """Merge known weekdays for one place, retry gaps, and update all area copies.

    Return the combined week and its status. Save even a partial result when
    a read is interrupted, because different pages can expose different days.
    """
    row = copies[0]
    week = dict.fromkeys(WEEKDAYS)
    status = '未找到營業時間'
    for candidate in copies:
        merge_weekly_hours(week, candidate.get('opening_hours'))
    try:
        for attempt in range(1, HOURS_ATTEMPTS + 1):
            if all(week.values()):
                break
            try:
                raw, status = await read_opening_hours(page, row['url'], timeout_error, navigate=True)
                merge_weekly_hours(week, raw)
            except (browser_error, timeout_error) as exc:
                status = '營業時間讀取失敗：' + str(exc).splitlines()[0]
            if attempt < HOURS_ATTEMPTS and not all(week.values()):
                known_days = sum(bool(value) for value in week.values())
                print(f'[營業時間補抓 {attempt}/{HOURS_ATTEMPTS - 1}] {row["name"]}：'
                      f'{known_days}/7 天；立即重試。', flush=True)
    finally:
        if all(week.values()) and status not in CLOSED_STATUSES:
            status = '已取得'
        hours = weekly_hours_text(week)
        for candidate in copies:
            candidate.update(opening_hours=hours, hours_status=status, hours_attempted=True)
        checkpoint()
    return week, status


async def collect_round_hours(playwright, area_results, args, timeout_error, browser_error,
                              checkpoint=lambda: None, storage_state=None):
    """Read weekly hours once per place and update matching rows across areas.

    args controls page count, visibility and diagnostic output. storage_state
    can restore a previous browser context. checkpoint saves each merged week.
    """
    groups = {}
    for area in area_results.values():
        for key, row in area.attractions.items():
            groups.setdefault(key, []).append(row)
    items = list(enumerate(groups.values(), 1))
    diagnostics_saved = 0
    session = BrowserSession(playwright, headless=args.headless)

    async def read_batch(page, queue):
        """Read each queued place on this page and retain a few incomplete examples."""
        nonlocal diagnostics_saved
        while not queue.empty():
            index, copies = queue.get_nowait()
            row = copies[0]
            week, status = await fill_place_hours(page, copies, timeout_error, browser_error, checkpoint)
            known_days = sum(bool(value) for value in week.values())
            if known_days < len(WEEKDAYS):
                print(f'[營業時間略過] {row["name"]}：首次加三次重試仍不完整，保留已取得資料，繼續下一景點。', flush=True)
                if getattr(args, 'diagnostic_dir', None) and diagnostics_saved < MAX_HOURS_DIAGNOSTICS:
                    diagnostics_saved += 1
                    await save_hours_diagnostic(page, row, status, args.diagnostic_dir, args.headless)
            print(f'[營業時間 {index}/{len(groups)}] {row["name"]}：{known_days}/7 天；{status}', flush=True)
            await asyncio.sleep(random.uniform(MIN_DELAY_SECONDS, MAX_DELAY_SECONDS))

    try:
        if not items:
            return
        await session.start(storage_state)
        for start in range(0, len(items), PLACES_PER_BROWSER):
            end = start + PLACES_PER_BROWSER
            queue = asyncio.Queue()
            for item in items[start:end]:
                queue.put_nowait(item)
            pages = [session.page]
            tasks = []
            try:
                page_count = min(DETAIL_PAGES_PER_AREA, args.workers, queue.qsize())
                for _ in range(1, page_count):
                    pages.append(await session.context.new_page())
                for page in pages:
                    tasks.append(asyncio.create_task(read_batch(page, queue)))
                await asyncio.gather(*tasks)
            finally:
                await stop_page_workers(tasks)
                session.page = pages[0]
                for page in pages[1:]:
                    try:
                        await page.close()
                    except browser_error:
                        pass
            if end < len(items):
                await session.restart(checkpoint, reason='已處理 50 筆營業時間')
    finally:
        await session.close()


class AreaSearchFailed(RuntimeError):
    """Signal that collection failed for one area and other areas may continue."""


class SearchListUnavailable(AreaSearchFailed):
    """Mark a target for review when Maps never displays a usable list."""


async def wait_for_search_feed(page, feed, timeout_error):
    """Wait for a visible feed with a place link, or raise on a blocked or missing list."""
    verification_messages = (
        'unusual traffic', '異常流量', '异常流量', '不是機器人',
        "i’m not a robot", "i'm not a robot", 'before you continue to google',
    )
    for attempt in range(1, FEED_ATTEMPTS + 1):
        try:
            await feed.wait_for(state='visible', timeout=FEED_TIMEOUT_MS)
            await feed.locator('a[href*="/maps/place/"]').first.wait_for(timeout=DETAIL_TIMEOUT_MS)
            return
        except timeout_error:
            body = (await page.locator('body').inner_text(timeout=CONTROL_TIMEOUT_MS)).lower()
            url = page.url.lower()
            needs_input = '/sorry/' in url or 'consent.google.' in url
            if needs_input or any(message in body for message in verification_messages):
                raise RuntimeError('頁面需要人工驗證或同意；請查看瀏覽器診斷截圖。')
            if attempt < FEED_ATTEMPTS:
                print(f'尚未找到景點清單，等待後重試 {attempt}/{FEED_ATTEMPTS - 1}。', flush=True)
                await asyncio.sleep(FEED_RETRY_WAIT_SECONDS)
    raise SearchListUnavailable('等待三次仍未找到景點清單；可能是單一地點頁、無結果或頁面格式不同，並非確認沒有景點。')


AREA_SEARCH_ATTEMPTS = 3
MAX_COLLECTION_LIMIT = 100_000
QUIT_COMMANDS = ('q', 'quit', 'exit')


async def search_location(context, page, location, results, args, PlaywrightTimeout, Error,
                          query=None):
    """Collect one target into the shared result snapshot.

    Args:
        context: Browser context for detail workers.
        page: Reusable Maps search page.
        location: Qualified place name, or empty for manual selection.
        results: Mutable SearchResults shared by all targets.
        args: Collection limits and output configuration.
        PlaywrightTimeout: Timeout exception type.
        Error: Browser exception type.
        query: Planner-provided query preserving the selected language.
    Returns:
        None. Results and output checkpoints are updated in place.
    """
    def checkpoint():
        save_results(results, args.output)

    rows = results.attractions
    results.location = location
    stopped = '達到捲動次數上限，結果可能不完整。'
    if location:
        query = query or f'{location} 觀光景點'
        search_url = 'https://www.google.com/maps/search/?' + urlencode(
            {'api': '1', 'query': query, 'hl': 'zh-TW'})
        print(f'自動搜尋：{query}', flush=True)
        await page.goto(search_url, wait_until='domcontentloaded')
    else:
        await page.goto('https://www.google.com/maps?hl=zh-TW', wait_until='domcontentloaded')
        print('\n請在新開的瀏覽器中：\n'
              '1. 搜尋目標地區，例如「新北市淡水區」。\n'
              '2. 調整地圖範圍，點選上方「觀光景點」。\n'
              '3. 等左側出現多筆景點清單，再回到這裡。\n'
              '若遇到同意頁面或驗證，請自行完成。')
        input('準備好後按 Enter 開始抓取：')
    feed = page.locator('[role="feed"]').first
    try:
        await wait_for_search_feed(page, feed, PlaywrightTimeout)
    except (SearchListUnavailable, RuntimeError) as exc:
        diagnostic = args.output.parent / (args.output.stem + '_diagnostics')
        diagnostic.mkdir(parents=True, exist_ok=True)
        image_path = diagnostic / (uuid.uuid4().hex + '.png')
        screenshot = ''
        try:
            await page.screenshot(path=str(image_path), timeout=SCREENSHOT_TIMEOUT_MS)
            screenshot = str(image_path.resolve())
        except Exception:
            pass  # Preserve the original failure even if the browser cannot capture it.
        status = 'blocked'
        if isinstance(exc, SearchListUnavailable):
            status = 'needs_review'
        results.searches.append({
            'location': location,
            'query': query,
            'source_url': page.url,
            'status': status,
            'error': str(exc),
            'screenshot': screenshot,
            'searched_at': datetime.now().astimezone().isoformat(),
        })
        results.save_json(args.output.with_suffix('.json'))
        if screenshot:
            print(f'已保存頁面截圖：{screenshot}', flush=True)
        if getattr(args, 'noninteractive', False):
            raise
        print(str(exc))
        input('請在瀏覽器完成處理，讓左側出現景點清單後按 Enter 重試：')
        await wait_for_search_feed(page, feed, PlaywrightTimeout)
        results.searches[-1]['status'] = 'recovered_after_manual_action'
    source_url = page.url
    results.source_url = source_url

    results.searches.append({'location': location, 'source_url': source_url,
                             'searched_at': datetime.now().astimezone().isoformat()})
    batch = {}
    idle_rounds = 0
    for _ in range(args.max_scrolls):
        before = len(batch)
        for item in await feed.evaluate(EXTRACT_CARDS):
            key = url_key(item['url'])
            if key not in batch and len(batch) < args.limit:
                results.add(item, location=location, source_url=source_url)
                batch[key] = rows[key]
        # Maps may drop the current cards as soon as the next scroll begins.
        checkpoint()
        print(f'本輪 {len(batch)} 筆；累計 {len(rows)} 筆', flush=True)
        if len(batch) >= args.limit:
            stopped = '達到設定的筆數上限。'
            break
        if len(batch) == before:
            idle_rounds += 1
        else:
            idle_rounds = 0
        if idle_rounds >= MAX_IDLE_ROUNDS:
            stopped = '連續多次沒有新景點，已停止；這不代表已取得該區全部景點。'
            break
        await feed.evaluate(
            '(el, options) => el.scrollBy(0, Math.max(options.minimum, el.clientHeight * options.ratio))',
            {'minimum': MIN_SCROLL_PIXELS, 'ratio': SCROLL_VIEWPORT_RATIO})
        await page.wait_for_timeout(
            random.uniform(MIN_DELAY_SECONDS, MAX_DELAY_SECONDS) * 1000)
    pending = {}
    for key, row in batch.items():
        if not row.get('detail_attempted'):
            pending[key] = row
    await collect_opening_hours(context, pending, args.workers, PlaywrightTimeout, Error, checkpoint)
    checkpoint()
    print(stopped)
    if results.deferred_output is None:
        output_message = f'內部 JSON：{args.output.resolve()}'
    else:
        output_message = '已保存救援資料，整輪完成後才輸出 JSON。'
    print(f'本區完成，累計 {len(rows)} 筆。{output_message}', flush=True)


def plan_search(location, args, place_id=None):
    """Run the embedded offline planner before opening any Maps searches.

    Args:
        location: User-entered place name.
        args: Database path, country, depth, target limit, and language settings.
        place_id: Optional explicit identifier to resolve ambiguous names.
    Returns:
        The planner status dictionary; unsuccessful plans contain no targets.
    """
    with PlaceIndex(args.database) as index:
        return index.plan(location, place_id=place_id, country_code=args.country,
                          depth=args.depth, max_targets=args.max_targets,
                          language=args.language)


def display_place_candidates(location, candidates, stream=None):
    """Show qualified names and exact selectors for ambiguous place matches.

    Args:
        location: Original user input.
        candidates: Candidate records returned by PlaceIndex.resolve.
        stream: Optional output stream, defaulting to standard output.
    Returns:
        None. All candidates are displayed without choosing a default.
    """
    print(f'「{location}」找到 {len(candidates)} 個可能符合的地點（含別名）：', file=stream)
    kinds = {'administrative_area': '行政區', 'populated_place': '城市／聚落',
             'country': '國家'}
    search_name = normalize(location)
    for number, candidate in enumerate(candidates, 1):
        country = candidate['country_id'].removeprefix('country:')
        kind_code = candidate.get('kind')
        kind = kinds.get(kind_code, kind_code or '地點')
        print(f"\n{number}. {candidate['qualified_name']}", file=stream)
        print(f"   國家代碼：{country}；類型：{kind}", file=stream)
        print(f"   資料庫正式名稱：{candidate['name_en']}", file=stream)
        names = {normalize(candidate['name']), normalize(candidate['name_en'])}
        if search_name not in names:
            print('   比對方式：輸入名稱對應到此地點的別名。', file=stream)
        print(f"   完整搜尋名稱：{candidate['qualified_name']}", file=stream)
        print(f"   精確指定參數：--place-id {candidate['id']}", file=stream)
    print('\n同一城市可能同時有行政區與聚落資料；請依完整地名與類型選擇。', file=stream)
    print('完整名稱仍重複時，請選擇編號或使用 --place-id 精確指定。', file=stream)


def choose_place_candidate(location, candidates):
    """Return an explicitly selected place ID, or None when the user cancels.

    Args:
        location: Original ambiguous search text.
        candidates: Ordered candidate records to display and select from.
    Returns:
        A candidate ID selected by number; empty input or q cancels selection.
    """
    display_place_candidates(location, candidates)
    while True:
        choice = input('輸入編號選擇地點（Enter 或 q 取消，返回輸入地名）：').strip()
        if not choice or choice.lower() in QUIT_COMMANDS:
            return None
        # Require an explicit selection instead of guessing the most famous city.
        if choice.isascii() and choice.isdecimal():
            number = int(choice)
            if 1 <= number <= len(candidates):
                return candidates[number - 1]['id']
        print(f'請輸入 1～{len(candidates)} 的編號。')


def merge_snapshot(results, snapshot):
    """Merge an area's saved attractions and search history into results in place."""
    for incoming in snapshot.get('attractions', {}).values():
        key = results.add(incoming, location='', source_url='')
        row = results.attractions[key]
        for name in ('locations', 'source_urls'):
            for value in incoming.get(name, []):
                if value not in row[name]:
                    row[name].append(value)
        for name in ('name', 'rating_label', 'text', 'primary_category', 'plus_code',
                     'review_label', 'cost_text', 'detail_url', 'external_place_id', 'estimated_cost'):
            if not row.get(name) and incoming.get(name):
                row[name] = incoming[name]
        if row['address_status'] != '已取得' and incoming.get('address'):
            row['address'] = incoming['address']
            row['address_status'] = incoming.get('address_status', '尚未讀取')
        combined = structured_hours(row.get('opening_hours'))
        # An area may finish with only part of the week. Keep days from earlier visits.
        merge_weekly_hours(combined, incoming.get('opening_hours'))
        row['opening_hours'] = weekly_hours_text(combined) or None
        if incoming.get('hours_attempted'):
            row['hours_attempted'] = True
        if incoming.get('opening_hours') or incoming.get('hours_attempted'):
            row['hours_status'] = incoming.get('hours_status', '已取得')
        if incoming.get('detail_attempted'):
            row['detail_attempted'] = True
    for search in snapshot.get('searches', []):
        if search not in results.searches:
            results.searches.append(search)


async def collect_area_with_retries(playwright, target, results, args, timeout_error,
                                    browser_error, *, headless=False):
    """Collect a planned or manual target into results and checkpoint each attempt.

    The supplied Playwright error types distinguish browser failures from other
    errors. Exhausting the browser attempts raises AreaSearchFailed.
    """
    location = target['location']
    for attempt in range(1, AREA_SEARCH_ATTEMPTS + 1):
        session = BrowserSession(playwright, headless=headless)
        try:
            await session.start()
            await search_location(session, session.page, location, results,
                                  args, timeout_error, browser_error, query=target['query'])
            return
        except browser_error as exc:
            last_attempt = attempt == AREA_SEARCH_ATTEMPTS
            results.searches.append({
                'location': location,
                'query': target['query'],
                'status': 'area_failed' if last_attempt else 'area_retry',
                'attempt': attempt,
                'error': str(exc),
            })
            print(f'[{location}] 第 {attempt}/{AREA_SEARCH_ATTEMPTS} 次瀏覽器操作失敗：{exc}', flush=True)
            if last_attempt:
                raise AreaSearchFailed(f'此區瀏覽器重試兩次仍失敗：{exc}') from exc
        finally:
            save_results(results, args.output)
            try:
                await session.close()
            except browser_error as close_error:
                print(f'關閉舊瀏覽器時發生錯誤：{close_error}', flush=True)
        print(f'[{location}] 已保存，等待 {COOLDOWN_SECONDS} 秒後重開瀏覽器重試 '
              f'{attempt}/{AREA_SEARCH_ATTEMPTS - 1}。', flush=True)
        await asyncio.sleep(COOLDOWN_SECONDS)


async def area_pipeline(targets, details, hours, completed, failed):
    """Run detail and hours callbacks for each target in a list or async source.

    The completed callback receives a target and its area. The failed callback
    receives a target and its exception. Results are delivered through callbacks.
    """
    # A single pending area lets the two browsers overlap without a growing backlog.
    detail_queue = asyncio.Queue(maxsize=1)
    hours_queue = asyncio.Queue(maxsize=1)

    async def produce():
        """Queue targets in source order and signal when the source is exhausted."""
        if hasattr(targets, '__aiter__'):
            async for target in targets:
                await detail_queue.put(target)
        else:
            for target in targets:
                await detail_queue.put(target)
        await detail_queue.put(None)

    async def detail_worker():
        """Hand each collected area to the hours worker after its detail session ends."""
        while True:
            target = await detail_queue.get()
            if target is None:
                await hours_queue.put(None)
                return
            try:
                area = await details(target)
                await hours_queue.put((target, area))
            except Exception as exc:
                await failed(target, exc)

    async def hours_worker():
        """Notify the appropriate callback once the area's hours stage finishes."""
        while True:
            item = await hours_queue.get()
            if item is None:
                return
            target, area = item
            try:
                await hours(target, area)
                await completed(target, area)
            except Exception as exc:
                await failed(target, exc)

    tasks = [
        asyncio.create_task(produce()),
        asyncio.create_task(detail_worker()),
        asyncio.create_task(hours_worker()),
    ]
    try:
        await asyncio.gather(*tasks)
    finally:
        # A cancelled worker may leave another blocked on a full or empty queue.
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


async def run_search_round(args, results, targets):
    """Collect targets into results and submit each finished area to the optional outbox.

    An empty list starts a manual search. Scheduler sources can yield targets
    asynchronously. Partial area results are checkpointed before this returns.
    """
    from playwright.async_api import async_playwright, TimeoutError as PWTimeout, Error
    if isinstance(targets, list) and not targets:
        async with async_playwright() as playwright:
            await collect_area_with_retries(playwright, dict(location='', query=None), results,
                                            args, PWTimeout, Error, headless=args.headless)
        return
    detail_args = copy.copy(args)
    detail_args.headless = True
    detail_args.noninteractive = True
    detail_args.workers = DETAIL_PAGES_PER_AREA
    hours_args = copy.copy(detail_args)
    hours_args.headless = False
    areas = {}
    crawl_errors = {}

    def checkpoint():
        save_results(results, args.output)

    def save_area(area):
        """Save one area's recovery file and merge its progress into the round."""
        save_results(area, args.output)
        merge_snapshot(results, area.to_dict())
        checkpoint()

    async with async_playwright() as playwright:
        async def details(target):
            """Return a target's area, keeping collected details after a browser failure."""
            location = target['location']
            area = SearchResults(location=location)
            prepare_checkpoint(area, args.output, is_area=True)
            if target.get('administrative_area'):
                metadata = dict(target['administrative_area'], search_location=location)
                area.area_metadata[location] = metadata
                results.area_metadata.update(area.area_metadata)
            areas[target['place_id']] = area
            try:
                await collect_area_with_retries(playwright, target, area, detail_args,
                                                PWTimeout, Error, headless=True)
            except Exception as exc:
                crawl_errors.setdefault(target['place_id'], []).append(
                    dict(stage='details', error_type=type(exc).__name__))
                print(f'[部分保存] {target["location"]} 詳細資料重試後仍失敗，保留 {len(area.attractions)} 筆並繼續查營業時間。', flush=True)
            finally:
                save_area(area)
            return area

        async def hours(target, area):
            """Enrich the area's collected rows and record any stage-level failure."""
            print(f'[營業時間] {target["location"]}：開啟獨立可見視窗，最多兩個分頁。', flush=True)
            try:
                await collect_round_hours(playwright, {target['place_id']: area}, hours_args,
                                          PWTimeout, Error, checkpoint=lambda: save_area(area))
            except Exception as exc:
                crawl_errors.setdefault(target['place_id'], []).append(
                    dict(stage='hours', error_type=type(exc).__name__))
                print(f'[部分保存] {target["location"]} 營業時間未全部完成，仍匯入已取得資料。', flush=True)

        async def completed(target, area):
            """Save the finished area and pass its rows and stage errors to the outbox."""
            place_id = target['place_id']
            save_area(area)
            outbox = getattr(args, 'postgres_outbox', None)
            if outbox is not None:
                from WebCrawler_postgres import make_payload
                places = [public_place(row) for row in area.attractions.values()]
                payload = make_payload(place_id, target['location'], places)
                # Missing hours for one place do not mark the entire area as incomplete.
                payload['crawl_errors'] = crawl_errors.get(place_id, [])
                payload['crawl_complete'] = not payload['crawl_errors']
                await outbox.submit(payload)
            areas.pop(place_id, None)

        async def failed(target, exc):
            """Keep this target's local progress if the pipeline cannot finish the area."""
            print(f'[區域未完成] {target["location"]}：{type(exc).__name__}；保留檢查點，不匯入此區。', flush=True)
            area = areas.pop(target['place_id'], None)
            if area is not None:
                save_area(area)

        try:
            await area_pipeline(targets, details, hours, completed, failed)
        finally:
            for area in areas.values():
                save_area(area)
            checkpoint()


def prepare_checkpoint(results, output, *, is_area=False):
    """Assign a private checkpoint to this collection, separate from its public JSON."""
    results.deferred_output = output.resolve()
    scope = '_area_' if is_area else '_'
    filename = output.stem + scope + uuid.uuid4().hex + '.json'
    results.checkpoint_path = results.deferred_output.parent / '.duo_checkpoints' / filename


def build_search_parser():
    """Return the CLI parser shared by interactive and scheduled collections."""
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--location')
    mode.add_argument('--place-id')
    mode.add_argument('--manual', action='store_true')
    parser.add_argument('--once', action='store_true', help='執行指定地區一輪後返回，不詢問下一個地名')
    parser.add_argument('--database', type=Path, default=DEFAULT_DB)
    parser.add_argument('--prompt-db-password', action='store_true', help='啟動時隱藏輸入 PostgreSQL 密碼，不寫入檔案')
    parser.add_argument('--postgres', action='store_true', help='每區完成後寫入遠端 PostgreSQL；連線使用 PG 環境變數')
    parser.add_argument('--postgres-outbox', type=Path, default=Path(__file__).resolve().parent / '.postgres_outbox')
    parser.add_argument('--retry-postgres', action='store_true', help='只補傳本機待傳區域，不啟動爬蟲')
    parser.add_argument('--country')
    parser.add_argument('--depth', type=int, default=1)
    parser.add_argument('--max-targets', type=int, default=None)
    parser.add_argument('--language', choices=['auto', 'zh-Hant', 'en'], default='auto')
    parser.add_argument('--plan-only', action='store_true')
    parser.add_argument('--limit', type=int, default=DEFAULT_LIMIT)
    parser.add_argument('--max-scrolls', type=int, default=DEFAULT_MAX_SCROLLS)
    parser.add_argument('--detail-pages', dest='workers', type=int, choices=[1, 2],
                        default=DETAIL_PAGES_PER_AREA, help='手動搜尋的詳細資料分頁數')
    visibility = parser.add_mutually_exclusive_group()
    visibility.add_argument('--headless', dest='headless', action='store_true')
    visibility.add_argument('--show-browser', dest='headless', action='store_false')
    parser.set_defaults(headless=not SHOW_BROWSER)
    parser.add_argument('--output', type=Path, default=Path(
        'attractions_duo_' + datetime.now().strftime('%Y%m%d_%H%M%S') + '.json'))
    return parser


def select_round_targets(location, place_id, args):
    """Return planned targets, an empty list for a manual search, or None to skip a round."""
    if not location and not place_id:
        return []
    plan = plan_search(location, args, place_id)
    if plan['status'] == 'ambiguous':
        selected = choose_place_candidate(location, plan['candidates'])
        if selected is None:
            return None
        plan = plan_search(location, args, selected)
    if plan['status'] != 'ready':
        print(json.dumps(plan, ensure_ascii=False, indent=2))
        return None
    targets = plan['targets']
    for warning in plan.get('warnings', []):
        print(warning)
    print(f'已規劃 {len(targets)} 區；電腦執行：一個隱藏景點視窗＋一個可見營業時間視窗。')
    return targets or None


async def main(argv=None, *, target_source=None):
    """Parse CLI arguments, collect search rounds and return the process exit code.

    A scheduler can pass its own iterable or asynchronous target source. The
    public export is written after each completed round.
    """
    parser = build_search_parser()
    args = parser.parse_args(argv)
    if args.prompt_db_password and (args.postgres or args.retry_postgres) and not args.plan_only:
        os.environ['PGPASSWORD'] = getpass.getpass('PostgreSQL travel_writer 密碼：')
    if args.retry_postgres:
        from WebCrawler_postgres import Outbox
        transferred = await Outbox(args.postgres_outbox).flush()
        return 0 if transferred else 1
    if not 1 <= args.limit <= MAX_COLLECTION_LIMIT or not 1 <= args.max_scrolls <= MAX_COLLECTION_LIMIT:
        parser.error(f'--limit 與 --max-scrolls 必須介於 1 與 {MAX_COLLECTION_LIMIT}')
    if args.depth < 1 or (args.max_targets is not None and args.max_targets < 1):
        parser.error('depth、max-targets 必須大於 0')
    if args.plan_only and (args.manual or not (args.location or args.place_id)):
        parser.error('--plan-only 需要 --location 或 --place-id')
    if args.output.suffix.lower() != '.json':
        parser.error('--output 必須是 .json 檔案')
    location = (args.location or '').strip()
    if args.location is not None and not location:
        parser.error('--location 不可空白')
    if not args.manual and not location and not args.place_id:
        location = input('輸入地名（Enter 手動模式；q 結束）：').strip()
        if location.lower() in QUIT_COMMANDS:
            return 0
    if args.headless and (args.manual or (not location and not args.place_id)):
        parser.error('手動模式需要顯示視窗，請使用 --show-browser')
    if args.plan_only:
        plan = plan_search(location, args, args.place_id)
        print(json.dumps(plan, ensure_ascii=False, indent=2))
        return 0 if plan['status'] == 'ready' else 1
    if args.postgres:
        if args.manual or (not location and not args.place_id):
            parser.error('--postgres 需要明確地名或 --place-id，手動搜尋無法確認地區')
        from WebCrawler_postgres import Outbox
        args.postgres_outbox = Outbox(args.postgres_outbox)
        await args.postgres_outbox.flush()
    else:
        args.postgres_outbox = None
    # Validate output only once: later rounds intentionally update these files.
    if args.output.exists() or args.output.with_suffix('.json').exists():
        parser.error(f'檔案已存在，請更換 --output：{args.output}')
    results = SearchResults(location=location)
    prepare_checkpoint(results, args.output)
    print(f'整輪完成後才生成正式 JSON；中途救援資料：{results.checkpoint_path}', flush=True)
    place_id = args.place_id
    try:
        while True:
            if target_source is not None:
                targets = target_source
            else:
                targets = select_round_targets(location, place_id, args)
            if targets is not None and args.postgres and not targets:
                print('資料庫模式需要明確地區，略過手動搜尋；請輸入地名。', flush=True)
                targets = None
            if targets is not None:
                await run_search_round(args, results, targets)
                export_completed_results(results, args.output)
                print(f'本輪完成，本次執行累計 {len(results.attractions)} 筆；輸出：{args.output.resolve()}', flush=True)
            if args.once:
                break
            # Initial CLI selectors apply only to the first round.
            place_id = None
            try:
                location = input('輸入下一個地名（Enter 手動模式；q 結束並存檔）：').strip()
            except EOFError:
                break
            if location.lower() in QUIT_COMMANDS:
                break
            while not location and args.headless:
                location = input('無視窗模式請輸入地名（q 結束）：').strip()
            if location.lower() in QUIT_COMMANDS:
                break
    finally:
        save_results(results, args.output)
    print(f'已結束，本次執行累計 {len(results.attractions)} 筆景點。')
    return 0


if __name__ == '__main__':
    try:
        code = asyncio.run(main())
    except (KeyboardInterrupt, EOFError):
        print('已停止。請查看輸出目錄中的 .duo_checkpoints 救援資料。', file=sys.stderr)
        code = 130
    except Exception as exc:
        print(f'執行失敗：{exc}', file=sys.stderr)
        code = 1
    raise SystemExit(code)
