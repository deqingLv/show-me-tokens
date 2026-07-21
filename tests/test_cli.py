"""Tests for the CLI."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from show_me_tokens.cli import main


def _create_minimal_db(path: Path) -> None:
    conn = sqlite3.connect(path)
    conn.executescript(
        """
        CREATE TABLE chat_session (
            session_id TEXT PRIMARY KEY,
            session_title TEXT,
            preferred_model_info TEXT,
            project_uri TEXT,
            project_id TEXT,
            project_name TEXT,
            gmt_create INTEGER,
            gmt_modified INTEGER,
            status TEXT
        );
        CREATE TABLE chat_message (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            token_info TEXT,
            model_info TEXT,
            gmt_create INTEGER
        );
        """
    )
    conn.execute(
        "INSERT INTO chat_session VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ("s1", "Hello", '{"preferred_model": "gm51model"}', "file:///Users/alice/proj", "p1", "proj", 1781652000000, 1781652000000, "complete"),
    )
    conn.execute(
        "INSERT INTO chat_message VALUES (?, ?, ?, ?, ?, ?)",
        ("m1", "s1", "assistant", '{"prompt_tokens": 10, "completion_tokens": 2}', '{"model": "m"}', 1781652000000),
    )
    conn.commit()
    conn.close()


def test_agents_subcommand(capsys):
    assert main(["agents"]) == 0
    captured = capsys.readouterr()
    assert "qoder" in captured.out
    assert "qoderwork" in captured.out


def test_qoder_report(capsys, tmp_path: Path):
    db = tmp_path / "local.db"
    _create_minimal_db(db)
    assert main(["qoder", "--db", str(db), "--format", "json"]) == 0
    captured = capsys.readouterr()
    assert '"session_id": "s1"' in captured.out


def test_qoder_missing_db(capsys, tmp_path: Path):
    db = tmp_path / "does-not-exist.db"
    assert main(["qoder", "--db", str(db)]) == 2
    captured = capsys.readouterr()
    assert "not found" in captured.err


def test_no_matching_sessions(capsys, tmp_path: Path):
    db = tmp_path / "local.db"
    _create_minimal_db(db)
    assert main(["qoder", "--db", str(db), "--session-id", "unknown"]) == 0
    captured = capsys.readouterr()
    assert "No sessions" in captured.err


def test_limit_table_default_top_n(capsys, tmp_path: Path):
    db = tmp_path / "local.db"
    conn = sqlite3.connect(db)
    conn.executescript(
        """
        CREATE TABLE chat_session (
            session_id TEXT PRIMARY KEY,
            session_title TEXT,
            preferred_model_info TEXT,
            project_uri TEXT,
            project_id TEXT,
            project_name TEXT,
            gmt_create INTEGER,
            gmt_modified INTEGER,
            status TEXT
        );
        CREATE TABLE chat_message (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            token_info TEXT,
            model_info TEXT,
            gmt_create INTEGER
        );
        """
    )
    conn.execute(
        "INSERT INTO chat_session VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ("s1", "A", '{}', "file:///p", "p", "p", 0, 0, "complete"),
    )
    conn.execute(
        "INSERT INTO chat_session VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ("s2", "B", '{}', "file:///p", "p", "p", 0, 0, "complete"),
    )
    conn.execute(
        "INSERT INTO chat_message VALUES (?, ?, ?, ?, ?, ?)",
        ("m1", "s1", "assistant", '{"prompt_tokens": 10, "completion_tokens": 1}', '{}', 0),
    )
    conn.execute(
        "INSERT INTO chat_message VALUES (?, ?, ?, ?, ?, ?)",
        ("m2", "s2", "assistant", '{"prompt_tokens": 5, "completion_tokens": 1}', '{}', 0),
    )
    conn.commit()
    conn.close()

    assert main(["qoder", "--db", str(db), "--limit", "1"]) == 0
    captured = capsys.readouterr()
    # s1 has higher total, should appear
    assert "s1" in captured.out
    assert "s2" not in captured.out
