"""Human-readable table formatter."""

from __future__ import annotations

from show_me_tokens.models import SessionUsage


def format_table(sessions: list[SessionUsage]) -> str:
    """Render a list of SessionUsage rows as a plain-text table."""
    if not sessions:
        return "No sessions matched the filters."

    headers = [
        "Agent",
        "Session ID",
        "Model",
        "Input",
        "Cache Read",
        "Output",
        "Total",
    ]
    rows: list[list[str]] = []
    for usage in sessions:
        tokens = usage.tokens
        rows.append(
            [
                usage.agent,
                _shorten(usage.session_id, 24),
                usage.model_name or "-",
                _fmt(tokens.input_tokens),
                _fmt(tokens.cache_read_input_tokens),
                _fmt(tokens.output_tokens),
                _fmt(tokens.total_tokens),
            ]
        )

    totals = _compute_totals(sessions)
    rows.append(["-" * len(cell) for cell in rows[0]])
    rows.append(
        [
            "Total",
            "",
            "",
            _fmt(totals["input_tokens"]),
            _fmt(totals["cache_read_input_tokens"]),
            _fmt(totals["output_tokens"]),
            _fmt(totals["total_tokens"]),
        ]
    )

    widths = [len(h) for h in headers]
    for row in rows:
        widths = [max(widths[i], len(row[i])) for i in range(len(headers))]

    lines: list[str] = []
    lines.append("  ".join(headers[i].ljust(widths[i]) for i in range(len(headers))))
    for row in rows:
        lines.append("  ".join(row[i].ljust(widths[i]) for i in range(len(headers))))

    notes = [u.note for u in sessions if u.note]
    if notes:
        lines.append("")
        lines.append("Notes:")
        for note in notes:
            lines.append(f"  - {note}")

    return "\n".join(lines)


def _fmt(value: int | None) -> str:
    if value is None:
        return "-"
    return f"{value:,}"


def _shorten(value: str, max_len: int) -> str:
    if len(value) <= max_len:
        return value
    return value[: max_len - 3] + "..."


def _compute_totals(sessions: list[SessionUsage]) -> dict[str, int | None]:
    input_tokens = sum(u.tokens.input_tokens for u in sessions)
    output_tokens = sum(u.tokens.output_tokens for u in sessions)
    cache_read = sum(
        (u.tokens.cache_read_input_tokens or 0) for u in sessions
    )
    cache_creation = sum(
        (u.tokens.cache_creation_input_tokens or 0) for u in sessions
    )
    total_tokens = sum(
        (u.tokens.total_tokens or 0) for u in sessions
    ) or None
    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cache_read_input_tokens": cache_read or None,
        "cache_creation_input_tokens": cache_creation or None,
        "total_tokens": total_tokens,
    }
