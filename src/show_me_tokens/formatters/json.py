"""JSON formatter."""

from __future__ import annotations

import json

from show_me_tokens.formatters import usage_to_dict
from show_me_tokens.models import SessionUsage


def format_json(sessions: list[SessionUsage]) -> str:
    """Render sessions as a JSON array."""
    data = [usage_to_dict(usage) for usage in sessions]
    return json.dumps(data, ensure_ascii=False, indent=2)
