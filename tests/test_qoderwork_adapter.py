"""Tests for the QoderWork adapter."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

from show_me_tokens.adapters.qoderwork import QoderWorkAdapter
from show_me_tokens.models import SessionFilters


def _create_qoderwork_db(path: Path) -> None:
    conn = sqlite3.connect(path)
    conn.executescript(
        """
        CREATE TABLE projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            created_at INTEGER,
            updated_at INTEGER
        );
        CREATE TABLE chats (
            id TEXT PRIMARY KEY,
            name TEXT,
            project_id TEXT NOT NULL,
            created_at INTEGER,
            updated_at INTEGER,
            worktree_path TEXT,
            chat_type TEXT
        );
        CREATE TABLE sub_chats (
            id TEXT PRIMARY KEY,
            name TEXT,
            chat_id TEXT NOT NULL,
            session_id TEXT,
            mode TEXT,
            messages TEXT,
            created_at INTEGER,
            updated_at INTEGER,
            model_level TEXT,
            ext TEXT
        );
        CREATE TABLE messages (
            id TEXT PRIMARY KEY,
            message_id TEXT NOT NULL,
            chat_id TEXT NOT NULL,
            sub_chat_id TEXT NOT NULL,
            sequence INTEGER NOT NULL,
            role TEXT NOT NULL,
            parts TEXT,
            metadata TEXT,
            searchable_text TEXT,
            created_at INTEGER
        );
        """
    )
    conn.execute(
        "INSERT INTO projects (id, name, path) VALUES (?, ?, ?)",
        ("proj-1", "project-a", "/Users/alice/project-a"),
    )
    conn.execute(
        "INSERT INTO chats (id, name, project_id, worktree_path) VALUES (?, ?, ?, ?)",
        ("chat-1", "hello", "proj-1", "/Users/alice/project-a"),
    )
    conn.execute(
        """
        INSERT INTO sub_chats (id, name, chat_id, session_id, mode, created_at, updated_at, model_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ("sub-1", "agent", "chat-1", "session-1", "agent", 1781652000, 1781652200, "Auto"),
    )
    parts = json.dumps(
        [
            {
                "type": "usage",
                "prompt_tokens": 100,
                "completion_tokens": 20,
                "cached_tokens": 30,
            }
        ]
    )
    metadata = json.dumps({"model": "GLM-5.2"})
    conn.execute(
        """
        INSERT INTO messages (id, message_id, chat_id, sub_chat_id, sequence, role, parts, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ("msg-1", "m1", "chat-1", "sub-1", 1, "assistant", parts, metadata, 1781652100),
    )
    conn.commit()
    conn.close()


def test_collect_sessions(tmp_path: Path):
    db = tmp_path / "agents.db"
    _create_qoderwork_db(db)

    adapter = QoderWorkAdapter()
    sessions = adapter.collect_sessions(db, SessionFilters())

    assert len(sessions) == 1
    usage = sessions[0]
    assert usage.agent == "qoderwork"
    assert usage.session_id == "session-1"
    assert usage.model_name == "GLM-5.2"
    assert usage.tokens.input_tokens == 100
    assert usage.tokens.output_tokens == 20
    assert usage.tokens.cache_read_input_tokens == 30
    assert usage.tokens.total_tokens == 120


def test_unavailable_token_status(tmp_path: Path):
    db = tmp_path / "agents.db"
    _create_qoderwork_db(db)
    conn = sqlite3.connect(db)
    conn.execute("UPDATE messages SET parts = ?, metadata = ?", ("[]", "{}"))
    conn.commit()
    conn.close()

    adapter = QoderWorkAdapter()
    sessions = adapter.collect_sessions(db, SessionFilters())

    assert len(sessions) == 1
    assert sessions[0].tokens.total_tokens is None
    assert "unavailable" in (sessions[0].note or "").lower()
