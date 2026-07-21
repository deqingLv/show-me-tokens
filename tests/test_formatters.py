"""Tests for output formatters."""

from __future__ import annotations

from datetime import datetime, timezone

from show_me_tokens.formatters.csv import format_csv
from show_me_tokens.formatters.json import format_json
from show_me_tokens.formatters.table import format_table
from show_me_tokens.models import SessionUsage, TokenSummary


def _sample_sessions() -> list[SessionUsage]:
    return [
        SessionUsage(
            agent="qoder",
            session_id="session-1",
            title="Hello world",
            model_name="GLM-5.1",
            updated_at=datetime(2026, 7, 21, 12, 0, 0, tzinfo=timezone.utc),
            tokens=TokenSummary(
                input_tokens=100,
                output_tokens=20,
                cache_read_input_tokens=50,
                total_tokens=120,
            ),
        )
    ]


def test_format_table_includes_headers_and_total():
    text = format_table(_sample_sessions())
    assert "Agent" in text
    assert "Title" in text
    assert "session-1" in text
    assert "Hello world" in text
    assert "GLM-5.1" in text
    assert "120" in text
    assert "Total" in text


def test_format_json():
    text = format_json(_sample_sessions())
    assert '"agent": "qoder"' in text
    assert '"input_tokens": 100' in text


def test_format_csv():
    text = format_csv(_sample_sessions())
    lines = text.strip().split("\n")
    assert lines[0].startswith("agent,session_id")
    assert "qoder,session-1" in lines[1]


def test_format_table_no_sessions():
    assert "No sessions" in format_table([])
