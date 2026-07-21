"""Output formatters for session usage reports."""

from __future__ import annotations

from dataclasses import asdict
from datetime import datetime
from typing import Any

from show_me_tokens.models import SessionUsage, TokenSummary


def usage_to_dict(usage: SessionUsage) -> dict[str, Any]:
    """Convert a SessionUsage instance to a plain dictionary."""
    result: dict[str, Any] = {}
    for key, value in asdict(usage).items():
        if isinstance(value, TokenSummary):
            result[key] = token_summary_to_dict(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result


def token_summary_to_dict(tokens: TokenSummary) -> dict[str, Any]:
    return {
        "input_tokens": tokens.input_tokens,
        "output_tokens": tokens.output_tokens,
        "cache_read_input_tokens": tokens.cache_read_input_tokens,
        "cache_creation_input_tokens": tokens.cache_creation_input_tokens,
        "total_tokens": tokens.total_tokens,
    }
