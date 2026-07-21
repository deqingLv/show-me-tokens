"""Adapter for Qoder IDE local database."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, ClassVar
from urllib.parse import unquote, urlparse

from show_me_tokens.adapters.base import AgentAdapter
from show_me_tokens.models import SessionFilters, SessionUsage, TokenSummary


class QoderAdapter(AgentAdapter):
    """Reads Qoder IDE ``SharedClientCache/cache/db/local.db``."""

    name: ClassVar[str] = "qoder"

    def default_db_path(self) -> Path:
        return (
            Path.home()
            / "Library"
            / "Application Support"
            / "Qoder"
            / "SharedClientCache"
            / "cache"
            / "db"
            / "local.db"
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
                    session_id,
                    session_title,
                    preferred_model_info,
                    project_uri,
                    project_id,
                    project_name,
                    gmt_create,
                    gmt_modified,
                    status
                FROM chat_session
                ORDER BY COALESCE(gmt_modified, gmt_create, 0) DESC
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
            raise FileNotFoundError(f"Qoder database not found: {db_path}")
        uri = f"file:{db_path}?mode=ro"
        conn = sqlite3.connect(uri, uri=True)
        conn.row_factory = sqlite3.Row
        return conn

    def _build_session(
        self,
        conn: sqlite3.Connection,
        session_row: dict[str, Any],
        filters: SessionFilters,
    ) -> SessionUsage | None:
        session_id = session_row["session_id"]

        if filters.session_id is not None and filters.session_id != session_id:
            return None

        workspace_path = self._normalize_workspace(session_row.get("project_uri"))
        if filters.workspace is not None:
            if workspace_path is None:
                return None
            try:
                if Path(workspace_path).resolve() != filters.workspace.resolve():
                    return None
            except OSError:
                return None

        created_at = self._ms_to_datetime(session_row.get("gmt_create"))
        updated_at = self._ms_to_datetime(
            session_row.get("gmt_modified") or session_row.get("gmt_create")
        )

        if not self._in_date_range(updated_at, filters):
            return None

        title = self._extract_title(session_row)
        preferred_model = self._try_json(session_row.get("preferred_model_info"))
        model_name = self._extract_preferred_model(preferred_model)

        messages = conn.execute(
            """
            SELECT
                id,
                role,
                token_info,
                model_info,
                gmt_create
            FROM chat_message
            WHERE session_id = ?
            ORDER BY gmt_create, id
            """,
            (session_id,),
        ).fetchall()

        token_summary = TokenSummary()

        for msg in messages:
            token_info = self._try_json(msg["token_info"])
            if isinstance(token_info, dict):
                token_summary.input_tokens += int(token_info.get("prompt_tokens") or 0)
                token_summary.output_tokens += int(
                    token_info.get("completion_tokens") or 0
                )
                cache = token_info.get("cached_tokens")
                if cache is not None:
                    token_summary.cache_read_input_tokens = (
                        token_summary.cache_read_input_tokens or 0
                    ) + int(cache)

            if model_name is None:
                message_model_info = self._try_json(msg["model_info"])
                model_name = self._extract_model_name(message_model_info)
                if model_name is None and isinstance(token_info, dict):
                    model_name = self._extract_model_name(token_info)

        token_summary.recompute_total()

        return SessionUsage(
            agent=self.name,
            session_id=session_id,
            title=title,
            workspace_path=workspace_path,
            model_name=model_name,
            created_at=created_at,
            updated_at=updated_at,
            tokens=token_summary,
            raw_source={"project_id": session_row.get("project_id")},
        )

    @staticmethod
    def _extract_title(session_row: dict[str, Any]) -> str:
        title = session_row.get("session_title")
        if isinstance(title, str) and title.strip():
            return title.strip()
        return session_row.get("session_id", "")

    @staticmethod
    def _extract_preferred_model(data: Any) -> str | None:
        if not isinstance(data, dict):
            return None
        value = data.get("preferred_model")
        if isinstance(value, str) and value.strip():
            return value.strip()
        return None

    @staticmethod
    def _normalize_workspace(value: str | None) -> str | None:
        if not value:
            return None
        text = str(value).strip()
        if text.startswith("file://"):
            parsed = urlparse(text)
            text = unquote(parsed.path)
        try:
            return str(Path(text).resolve())
        except (OSError, ValueError):
            return text

    @staticmethod
    def _ms_to_datetime(value: int | None) -> datetime | None:
        if value is None:
            return None
        try:
            return datetime.fromtimestamp(value / 1000, tz=timezone.utc)
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
    def _extract_model_name(data: Any) -> str | None:
        if not isinstance(data, dict):
            return None
        for key in ("model_name", "model_key", "model", "modelId", "model_id"):
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None
