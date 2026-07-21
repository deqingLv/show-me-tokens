"""Normalized data models for show-me-tokens."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any


@dataclass
class TokenSummary:
    """Aggregated token usage for a single session."""

    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_input_tokens: int | None = None
    cache_creation_input_tokens: int | None = None
    total_tokens: int | None = None

    def __post_init__(self) -> None:
        self.recompute_total()

    def recompute_total(self) -> None:
        """Set total_tokens from input + output only when not explicitly set."""
        if self.total_tokens is not None:
            return
        total = self.input_tokens + self.output_tokens
        self.total_tokens = total if total > 0 else None


@dataclass
class SessionUsage:
    """Normalized per-session token report returned by every adapter."""

    agent: str
    session_id: str
    title: str | None = None
    chat_id: str | None = None
    project_name: str | None = None
    workspace_path: str | None = None
    model_name: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    tokens: TokenSummary = field(default_factory=TokenSummary)
    note: str | None = None
    raw_source: dict[str, Any] | None = None


@dataclass
class SessionFilters:
    """User-supplied filters applied to session collection."""

    since: datetime | None = None
    until: datetime | None = None
    workspace: Path | None = None
    session_id: str | None = None
