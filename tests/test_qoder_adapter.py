"""Tests for the Qoder IDE adapter."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from show_me_tokens.adapters.qoder import QoderAdapter
from show_me_tokens.models import SessionFilters


def _create_qoder_db(path: Path) -> None:
    conn = sqlite3.connect(path)
    conn.executescript(
        """
        CREATE TABLE chat_session (
            session_id TEXT PRIMARY KEY,
            project_uri TEXT,
            project_id TEXT,
            gmt_create INTEGER,
            gmt_modified INTEGER,
            last_user_query_at INTEGER,
            status TEXT
        );
        CREATE TABLE chat_message (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            request_id TEXT,
            role TEXT NOT NULL,
            content TEXT,
            summary TEXT,
            tool_result TEXT,
            token_info TEXT,
            model_info TEXT,
            extra TEXT,
            gmt_create INTEGER
        );
        """
    )
    conn.execute(
        """
        INSERT INTO chat_session
        (session_id, project_uri, project_id, gmt_create, gmt_modified, status)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        ("session-1", "file:///Users/alice/project-a", "proj-1", 1781652000000, 1781652200000, "complete"),
    )
    conn.execute(
        """
        INSERT INTO chat_session
        (session_id, project_uri, project_id, gmt_create, gmt_modified, status)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        ("session-2", "file:///Users/alice/project-b", "proj-2", 1781652000000, 1781652000000, "complete"),
    )
    conn.execute(
        """
        INSERT INTO chat_message
        (id, session_id, role, token_info, model_info, gmt_create)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            "msg-1",
            "session-1",
            "assistant",
            '{"prompt_tokens": 100, "completion_tokens": 20, "cached_tokens": 50}',
            '{"model_name": "GLM-5.1"}',
            1781652100000,
        ),
    )
    conn.execute(
        """
        INSERT INTO chat_message
        (id, session_id, role, token_info, model_info, gmt_create)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            "msg-2",
            "session-1",
            "assistant",
            '{"prompt_tokens": 80, "completion_tokens": 10}',
            '{}',
            1781652200000,
        ),
    )
    conn.commit()
    conn.close()


def test_collect_sessions(tmp_path: Path):
    db = tmp_path / "local.db"
    _create_qoder_db(db)

    adapter = QoderAdapter()
    sessions = adapter.collect_sessions(db, SessionFilters())

    assert len(sessions) == 2
    first = sessions[0]
    assert first.agent == "qoder"
    assert first.session_id == "session-1"
    assert first.model_name == "GLM-5.1"
    assert first.tokens.input_tokens == 180
    assert first.tokens.output_tokens == 30
    assert first.tokens.cache_read_input_tokens == 50
    assert first.tokens.total_tokens == 210
    assert "project-a" in (first.workspace_path or "")


def test_filter_by_session_id(tmp_path: Path):
    db = tmp_path / "local.db"
    _create_qoder_db(db)

    adapter = QoderAdapter()
    sessions = adapter.collect_sessions(db, SessionFilters(session_id="session-2"))

    assert len(sessions) == 1
    assert sessions[0].session_id == "session-2"


def test_filter_by_workspace(tmp_path: Path):
    db = tmp_path / "local.db"
    _create_qoder_db(db)

    adapter = QoderAdapter()
    workspace = Path("/Users/alice/project-a").resolve()
    sessions = adapter.collect_sessions(db, SessionFilters(workspace=workspace))

    assert len(sessions) == 1
    assert sessions[0].session_id == "session-1"


def test_default_db_path_exists():
    adapter = QoderAdapter()
    assert "Qoder" in str(adapter.default_db_path())
