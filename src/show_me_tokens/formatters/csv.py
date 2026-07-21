"""CSV formatter."""

from __future__ import annotations

import csv
import io

from show_me_tokens.models import SessionUsage


def format_csv(sessions: list[SessionUsage]) -> str:
    """Render sessions as CSV rows."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "agent",
            "session_id",
            "chat_id",
            "project_name",
            "workspace_path",
            "model_name",
            "created_at",
            "updated_at",
            "input_tokens",
            "output_tokens",
            "cache_read_input_tokens",
            "cache_creation_input_tokens",
            "total_tokens",
            "note",
        ]
    )
    for usage in sessions:
        writer.writerow(
            [
                usage.agent,
                usage.session_id,
                usage.chat_id or "",
                usage.project_name or "",
                usage.workspace_path or "",
                usage.model_name or "",
                usage.created_at.isoformat() if usage.created_at else "",
                usage.updated_at.isoformat() if usage.updated_at else "",
                usage.tokens.input_tokens,
                usage.tokens.output_tokens,
                usage.tokens.cache_read_input_tokens or "",
                usage.tokens.cache_creation_input_tokens or "",
                usage.tokens.total_tokens if usage.tokens.total_tokens is not None else "",
                usage.note or "",
            ]
        )
    return output.getvalue()
