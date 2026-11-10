import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent

DATABASE_PATH = BASE_DIR / "security.db"


def get_connection():

    return sqlite3.connect(
        DATABASE_PATH
    )


def init_database():

    conn = get_connection()

    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS scans (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        target TEXT NOT NULL,

        scan_type TEXT NOT NULL,

        score INTEGER,

        result TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reports (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        report_name TEXT,

        report_type TEXT,

        report_path TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()
    conn.close()


def save_scan(
    target,
    scan_type,
    score,
    result
):

    conn = get_connection()

    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO scans
        (
            target,
            scan_type,
            score,
            result
        )
        VALUES
        (
            ?,
            ?,
            ?,
            ?
        )
        """,
        (
            target,
            scan_type,
            score,
            str(result)
        )
    )

    conn.commit()
    conn.close()


def save_report(
    report_name,
    report_type,
    report_path
):

    conn = get_connection()

    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO reports
        (
            report_name,
            report_type,
            report_path
        )
        VALUES
        (
            ?,
            ?,
            ?
        )
        """,
        (
            report_name,
            report_type,
            report_path
        )
    )

    conn.commit()
    conn.close()


def get_scans():

    conn = get_connection()

    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT *
        FROM scans
        ORDER BY id DESC
        """
    )

    rows = cursor.fetchall()

    conn.close()

    return rows


def get_reports():

    conn = get_connection()

    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT *
        FROM reports
        ORDER BY id DESC
        """
    )

    rows = cursor.fetchall()

    conn.close()

    return rows