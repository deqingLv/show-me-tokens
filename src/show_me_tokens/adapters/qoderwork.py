"""Adapter for QoderWork local agents database."""

from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, ClassVar

from show_me_tokens.adapters.base import AgentAdapter
from show_me_tokens.models import SessionFilters, SessionUsage, TokenSummary

_TOKEN_KEY_RE = re.compile(r"(^|_)(prompt|input|completion|output|generated|total|cached)_?tokens?$", re.IGNORECASE)


class QoderWorkAdapter(AgentAdapter):
    """Reads QoderWork ``data/agents.db``."""

    name: ClassVar[str] = "qoderwork"

    def default_db_path(self) -> Path:
        return (
            Path.home()
            / "Library"
            / "Application Support"
            / "QoderWork"
            / "data"
            / "agents.db"
        )

    def collect_sessions(
        self,
        db_path: Path,
        filters: SessionFilters,
    ) -> list[SessionUsage]:
        conn = self._connect_readonly(db_path)
        try:
            rows = conn.execute(
                """
                SELECT
                    sc.id AS sub_chat_id,
                    sc.name AS sub_chat_name,
                    sc.chat_id,
                    sc.session_id,
                    sc.mode,
                    sc.model_level,
                    sc.created_at AS sub_chat_created_at,
                    sc.updated_at AS sub_chat_updated_at,
                    c.name AS chat_name,
                    c.worktree_path,
                    c.chat_type,
                    p.name AS project_name,
                    p.path AS project_path
                FROM sub_chats sc
                JOIN chats c ON c.id = sc.chat_id
                JOIN projects p ON p.id = c.project_id
                ORDER BY COALESCE(sc.updated_at, sc.created_at, 0) DESC
                """
            ).fetchall()

            sessions: list[SessionUsage] = []
            for row in rows:
                usage = self._build_session(conn, dict(row), filters)
                if usage is not None:
                    sessions.append(usage)
            return sessions
        finally:
            conn.close()

    def _connect_readonly(self, db_path: Path) -> sqlite3.Connection:
        if not db_path.exists():
            raise FileNotFoundError(f"QoderWork database not found: {db_path}")
        uri = f"file:{db_path}?mode=ro"
        conn = sqlite3.connect(uri, uri=True)
        conn.row_factory = sqlite3.Row
        return conn

    def _build_session(
        self,
        conn: sqlite3.Connection,
        row: dict[str, Any],
        filters: SessionFilters,
    ) -> SessionUsage | None:
        sub_chat_id = row["sub_chat_id"]
        session_id = row["session_id"] or sub_chat_id

        if filters.session_id is not None:
            if filters.session_id not in (sub_chat_id, session_id):
                return None

        workspace_path = self._normalize_path(
            row.get("worktree_path") or row.get("project_path")
        )
        if filters.workspace is not None:
            if workspace_path is None:
                return None
            try:
                if Path(workspace_path).resolve() != filters.workspace.resolve():
                    return None
            except OSError:
                return None

        created_at = self._epoch_to_datetime(row.get("sub_chat_created_at"))
        updated_at = self._epoch_to_datetime(
            row.get("sub_chat_updated_at") or row.get("sub_chat_created_at")
        )

        if not self._in_date_range(updated_at, filters):
            return None

        messages = conn.execute(
            """
            SELECT sequence, role, parts, metadata
            FROM messages
            WHERE sub_chat_id = ?
            ORDER BY sequence ASC
            """,
            (sub_chat_id,),
        ).fetchall()

        token_summary = TokenSummary()
        model_name: str | None = None
        event_count = 0

        for msg in messages:
            parts = self._try_json(msg["parts"])
            metadata = self._try_json(msg["metadata"])
            events: list[dict[str, Any]] = []
            self._collect_token_events(parts, events)
            self._collect_token_events(metadata, events)

            for event in events:
                input_tokens = self._numeric(
                    event.get("prompt_tokens")
                    or event.get("input_tokens")
                    or event.get("promptTokens")
                    or event.get("inputTokens")
                )
                output_tokens = self._numeric(
                    event.get("completion_tokens")
                    or event.get("output_tokens")
                    or event.get("generated_tokens")
                    or event.get("completionTokens")
                    or event.get("outputTokens")
                    or event.get("generatedTokens")
                )
                total_tokens = self._numeric(
                    event.get("total_tokens") or event.get("totalTokens")
                )
                cached_tokens = self._numeric(
                    event.get("cached_tokens") or event.get("cachedTokens")
                )

                token_summary.input_tokens += input_tokens
                token_summary.output_tokens += output_tokens
                if total_tokens:
                    token_summary.total_tokens = (
                        token_summary.total_tokens or 0
                    ) + total_tokens
                if cached_tokens:
                    token_summary.cache_read_input_tokens = (
                        token_summary.cache_read_input_tokens or 0
                    ) + cached_tokens
                event_count += 1

            if model_name is None:
                for source in (metadata, parts):
                    name = self._extract_model_name(source)
                    if name:
                        model_name = name
                        break

        token_summary.recompute_total()

        if model_name is None:
            model_name = row.get("model_level")

        note: str | None = None
        if event_count == 0:
            note = (
                "Token usage unavailable: no comparable token fields found "
                "in local agents.db"
            )
            token_summary.total_tokens = None

        return SessionUsage(
            agent=self.name,
            session_id=session_id,
            chat_id=row.get("chat_id"),
            project_name=row.get("project_name"),
            workspace_path=workspace_path,
            model_name=model_name,
            created_at=created_at,
            updated_at=updated_at,
            tokens=token_summary,
            note=note,
            raw_source={"sub_chat_id": sub_chat_id, "mode": row.get("mode")},
        )

    @staticmethod
    def _collect_token_events(value: Any, events: list[dict[str, Any]]) -> None:
        if value is None:
            return
        if isinstance(value, list):
            for item in value:
                QoderWorkAdapter._collect_token_events(item, events)
            return
        if not isinstance(value, dict):
            return

        keys = value.keys()
        if any(_TOKEN_KEY_RE.search(key) for key in keys):
            events.append(value)

        for nested in value.values():
            QoderWorkAdapter._collect_token_events(nested, events)

    @staticmethod
    def _normalize_path(value: str | None) -> str | None:
        if not value:
            return None
        try:
            return str(Path(value).resolve())
        except (OSError, ValueError):
            return value

    @staticmethod
    def _epoch_to_datetime(value: int | None) -> datetime | None:
        if value is None:
            return None
        try:
            number = int(value)
            if not number:
                return None
            ms = number if number > 100000000000 else number * 1000
            return datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
        except (OSError, ValueError, OverflowError):
            return None

    @staticmethod
    def _in_date_range(value: datetime | None, filters: SessionFilters) -> bool:
        if value is None:
            return True
        if filters.since is not None and value.date() < filters.since.date():
            return False
        if filters.until is not None and value.date() > filters.until.date():
            return False
        return True

    @staticmethod
    def _try_json(text: str | None) -> Any:
        if not text:
            return None
        try:
            return json.loads(text)
        except Exception:
            return None

    @staticmethod
    def _numeric(value: Any) -> int:
        if value is None:
            return 0
        try:
            number = int(value)
            return number if number >= 0 else 0
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _extract_model_name(data: Any) -> str | None:
        if not isinstance(data, dict):
            return None
        for key in ("model_name", "model", "modelId", "model_id", "modelLevel"):
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None
