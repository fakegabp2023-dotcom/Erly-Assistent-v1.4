import sqlite3
import os
from datetime import datetime


DB_FILE = "memory.db"

# Límite conceptual de almacenamiento: 3 GB
MAX_DATABASE_SIZE = 3_000_000_000


def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def create_table(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            important INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    conn.commit()


def repair_database(conn):
    """
    Comprueba si la base de datos antigua tiene
    la estructura correcta.

    Si 'key' no tiene una restricción UNIQUE,
    reconstruye la tabla conservando las memorias.
    """

    columns = conn.execute(
        "PRAGMA table_info(memories)"
    ).fetchall()

    if not columns:
        create_table(conn)
        return

    column_names = [column["name"] for column in columns]

    # Si la tabla ni siquiera tiene key,
    # necesitamos migrarla.
    if "key" not in column_names:

        conn.execute("""
            ALTER TABLE memories
            RENAME TO memories_old
        """)

        create_table(conn)

        old_columns = [
            column["name"]
            for column in columns
        ]

        if "value" in old_columns:

            rows = conn.execute(
                "SELECT * FROM memories_old"
            ).fetchall()

            for row in rows:

                value = row["value"]

                key = (
                    f"legacy_{row['id']}"
                    if "id" in old_columns
                    else f"legacy_{datetime.now().timestamp()}"
                )

                conn.execute("""
                    INSERT OR IGNORE INTO memories
                    (key, value, category, important, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    key,
                    value,
                    "general",
                    0,
                    datetime.now().isoformat(),
                    datetime.now().isoformat()
                ))

        conn.execute(
            "DROP TABLE memories_old"
        )

        conn.commit()

        return

    # Comprobar índices UNIQUE
    indexes = conn.execute(
        "PRAGMA index_list(memories)"
    ).fetchall()

    key_is_unique = False

    for index in indexes:

        if index["unique"]:

            index_columns = conn.execute(
                f"PRAGMA index_info('{index['name']}')"
            ).fetchall()

            names = [
                item["name"]
                for item in index_columns
            ]

            if names == ["key"]:
                key_is_unique = True
                break

    if key_is_unique:
        return

    # La tabla existe pero key no es UNIQUE.
    # La reconstruimos.
    conn.execute("""
        ALTER TABLE memories
        RENAME TO memories_old
    """)

    create_table(conn)

    old_columns = [
        column["name"]
        for column in columns
    ]

    rows = conn.execute(
        "SELECT * FROM memories_old"
    ).fetchall()

    for row in rows:

        key = (
            row["key"]
            if "key" in old_columns
            else f"legacy_{row['id']}"
        )

        value = (
            row["value"]
            if "value" in old_columns
            else ""
        )

        category = (
            row["category"]
            if "category" in old_columns
            else "general"
        )

        important = (
            row["important"]
            if "important" in old_columns
            else 0
        )

        created_at = (
            row["created_at"]
            if "created_at" in old_columns
            else datetime.now().isoformat()
        )

        updated_at = (
            row["updated_at"]
            if "updated_at" in old_columns
            else datetime.now().isoformat()
        )

        conn.execute("""
            INSERT OR IGNORE INTO memories
            (key, value, category, important, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            key,
            value,
            category,
            important,
            created_at,
            updated_at
        ))

    conn.execute(
        "DROP TABLE memories_old"
    )

    conn.commit()


def initialize():
    conn = get_connection()

    try:
        repair_database(conn)

    finally:
        conn.close()


def save_memory(
    key,
    value,
    category="general",
    important=False
):
    """
    Guarda o actualiza una memoria.
    """

    conn = get_connection()

    try:

        # Asegurarnos de que la estructura esté correcta
        repair_database(conn)

        now = datetime.now().isoformat()

        conn.execute("""
            INSERT INTO memories
            (key, value, category, important, created_at, updated_at)

            VALUES (?, ?, ?, ?, ?, ?)

            ON CONFLICT(key)
            DO UPDATE SET
                value = excluded.value,
                category = excluded.category,
                important = excluded.important,
                updated_at = excluded.updated_at
        """, (
            key,
            value,
            category,
            1 if important else 0,
            now,
            now
        ))

        conn.commit()

        return True

    except Exception as error:

        print(
            "Error guardando memoria:",
            error
        )

        return False

    finally:
        conn.close()


def get_important_memories():
    """
    Devuelve las memorias importantes.
    """

    conn = get_connection()

    try:

        rows = conn.execute("""
            SELECT key, value, category
            FROM memories
            WHERE important = 1
            ORDER BY updated_at DESC
        """).fetchall()

        return [
            {
                "key": row["key"],
                "value": row["value"],
                "category": row["category"]
            }
            for row in rows
        ]

    finally:
        conn.close()


def search_memories(query, limit=15):
    """
    Busca recuerdos relacionados con una consulta.
    """

    conn = get_connection()

    try:

        words = [
            word.strip().lower()
            for word in query.split()
            if len(word.strip()) > 2
        ]

        if not words:
            return []

        conditions = []
        parameters = []

        for word in words:

            conditions.append(
                "(LOWER(key) LIKE ? OR LOWER(value) LIKE ?)"
            )

            pattern = f"%{word}%"

            parameters.extend([
                pattern,
                pattern
            ])

        sql = f"""
            SELECT key, value, category, important
            FROM memories
            WHERE {" OR ".join(conditions)}
            ORDER BY important DESC, updated_at DESC
            LIMIT ?
        """

        parameters.append(limit)

        rows = conn.execute(
            sql,
            parameters
        ).fetchall()

        return [
            {
                "key": row["key"],
                "value": row["value"],
                "category": row["category"],
                "important": row["important"]
            }
            for row in rows
        ]

    finally:
        conn.close()


def get_memory_context():
    """
    Convierte las memorias importantes
    en texto para que Erly pueda utilizarlas.
    """

    memories = get_important_memories()

    if not memories:
        return "No hay recuerdos importantes almacenados."

    lines = []

    for memory in memories:

        lines.append(
            f"- {memory['key']}: {memory['value']}"
        )

    return "\n".join(lines)


def get_database_size():
    """
    Devuelve el tamaño actual de memory.db.
    """

    try:

        if os.path.exists(DB_FILE):
            return os.path.getsize(DB_FILE)

    except Exception:
        pass

    return 0


# Inicializar automáticamente
initialize()