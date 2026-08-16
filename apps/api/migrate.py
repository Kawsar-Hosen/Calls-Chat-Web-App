#!/usr/bin/env python3
"""Migrate data from SQLite to Neon PostgreSQL."""
import sqlite3, asyncio, re, ssl
from datetime import datetime
from app.config import settings
from app.db import engine
from sqlalchemy import text

require_ssl = ssl.create_default_context()
sqlite_conn = sqlite3.connect('xyteee.db')
sqlite_conn.row_factory = sqlite3.Row

TABLE_ORDER = [
    'users','auth_sessions','blocks','friendships','friend_requests',
    'conversations','conversation_members','groups','group_members','group_applications',
    'messages','message_reads','media_attachments','reactions','devices',
    'account_deletions','call_offers',
]

NOT_NULL_DEFAULTS = {
    'is_online': False, 'is_admin': False, 'is_superuser': False, 'is_active': True,
    'is_approved': True, 'consumed': False, 'muted': False, 'deleted': False,
    'accepted': False, 'read': False, 'kind': 'audio',
}

BOOL_COLS = {'is_online', 'is_admin', 'is_superuser', 'is_active', 'is_approved',
             'consumed', 'muted', 'deleted', 'accepted', 'read'}

PG_TS_COLS: dict[str, set[str]] = {}
TS_RE = re.compile(r'^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}')

def parse_ts(v):
    if v is None or not isinstance(v, str):
        return v
    if TS_RE.match(v):
        try:
            return datetime.fromisoformat(v.replace(' ', 'T'))
        except Exception:
            return v
    return v

def convert(c, v, ts_cols):
    if v is None and c in NOT_NULL_DEFAULTS:
        v = NOT_NULL_DEFAULTS[c]
    if c in ts_cols:
        v = parse_ts(v)
    if v is not None and isinstance(v, int) and c in BOOL_COLS:
        v = bool(v)
    return v


async def migrate():
    import asyncpg

    conn = await asyncpg.connect(
        dsn=settings.database_url.replace('postgresql+asyncpg://', 'postgresql://'),
        ssl=require_ssl,
    )

    tables = await conn.fetch(
        "SELECT tablename FROM pg_tables WHERE schemaname='public'"
    )
    for t in tables:
        await conn.execute(f'DROP TABLE IF EXISTS "{t["tablename"]}" CASCADE')
    print('All tables dropped')

    from app.db import Base
    import app.models
    async with engine.begin() as eng:
        await eng.run_sync(Base.metadata.create_all)
    print('Tables recreated')

    conrows = await conn.fetch(
        "SELECT conrelid::regclass AS table_name, conname AS constraint_name "
        "FROM pg_constraint WHERE contype='f' AND connamespace = 'public'::regnamespace"
    )
    for r in conrows:
        await conn.execute(f'ALTER TABLE "{r["table_name"]}" DROP CONSTRAINT IF EXISTS "{r["constraint_name"]}"')
    print(f'Dropped {len(conrows)} FK constraints')

    pg_cols: dict[str, dict[str, str]] = {}
    rows = await conn.fetch(
        "SELECT table_name, column_name, data_type FROM information_schema.columns "
        "WHERE table_schema='public' ORDER BY table_name, ordinal_position"
    )
    for r in rows:
        pg_cols.setdefault(r['table_name'], {})[r['column_name']] = r['data_type']
        if 'timestamp' in r['data_type']:
            PG_TS_COLS.setdefault(r['table_name'], set()).add(r['column_name'])

    for table in TABLE_ORDER:
        sqlite_cols = [d[1] for d in sqlite_conn.execute(f'PRAGMA table_info({table})')]
        shared = [c for c in pg_cols.get(table, {}) if c in sqlite_cols]
        if not shared:
            print(f'{table}: skip')
            continue

        srows = sqlite_conn.execute(f'SELECT * FROM {table}').fetchall()
        if not srows:
            print(f'{table}: 0')
            continue

        ts_cols = PG_TS_COLS.get(table, set())
        inserted = 0
        for row in srows:
            vals = {}
            for c in shared:
                vals[c] = convert(c, row[c] if c in sqlite_cols else None, ts_cols)
            placeholders = ', '.join(['$' + str(j+1) for j in range(len(shared))])
            col_names = ', '.join(shared)
            args = [vals[c] for c in shared]
            try:
                await conn.execute(
                    f'INSERT INTO "{table}" ({col_names}) VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING',
                    *args
                )
                inserted += 1
            except Exception as e:
                pass
        print(f'{table}: {inserted}/{len(srows)}')

    await conn.close()
    print('\nDONE')

asyncio.run(migrate())
sqlite_conn.close()
