from fastapi import APIRouter, Query

from .database import get_connection


router = APIRouter(prefix="/regions", tags=["Regions"])


@router.get("/")
def get_regions(
    keyword: str | None = None,
    country_id: str | None = None,
    parent_id: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
):
    # Build the SQL query with optional filters
    sql = """
        SELECT
            region_id,
            country_id,
            parent_id,
            kind,
            name,
            name_zh_hant,
            name_en
        FROM public.regions
        WHERE enabled = TRUE
    """

    params = []

    if keyword:
        # Search region names using partial text matching
        sql += """
            AND (
                name ILIKE %s
                OR name_zh_hant ILIKE %s
                OR name_en ILIKE %s
            )
        """
        search_term = f"%{keyword}%"
        params.extend([search_term, search_term, search_term])

    if country_id:
        sql += " AND country_id = %s"
        params.append(country_id)

    if parent_id:
        sql += " AND parent_id = %s"
        params.append(parent_id)

    if not keyword and not country_id and not parent_id:
        # Return top-level regions when no filters are provided
        sql += " AND parent_id IS NULL"

    sql += " ORDER BY name LIMIT %s"
    params.append(limit)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    # Convert database rows into JSON-compatible objects
    regions = []

    for row in rows:
        regions.append(
            {
                "region_id": row[0],
                "country_id": row[1],
                "parent_id": row[2],
                "kind": row[3],
                "name": row[4],
                "name_zh_hant": row[5],
                "name_en": row[6],
                "display_name": row[5] or row[4],
            }
        )

    return regions