from fastapi import APIRouter, Query

from .database import get_connection


router = APIRouter(
    prefix="/countries",
    tags=["Countries"]
)


@router.get("/")
def get_countries(
    keyword: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
):
    # Build the SQL query
    sql = """
        SELECT
            country_id,
            iso2,
            iso3,
            name,
            name_zh_hant
        FROM public.region_countries
        WHERE 1 = 1
    """

    params = []

    if keyword:
        # Search countries using partial text matching
        sql += """
            AND (
                name ILIKE %s
                OR name_zh_hant ILIKE %s
                OR iso2 ILIKE %s
                OR iso3 ILIKE %s
            )
        """

        search_term = f"%{keyword}%"
        params.extend([search_term] * 4)

    sql += " ORDER BY name LIMIT %s"
    params.append(limit)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    # Convert database rows into JSON-compatible objects
    countries = []

    for row in rows:
        countries.append(
            {
                "country_id": row[0],
                "iso2": row[1],
                "iso3": row[2],
                "name": row[3],
                "name_zh_hant": row[4],
                "display_name": row[4] or row[3],
            }
        )

    return countries