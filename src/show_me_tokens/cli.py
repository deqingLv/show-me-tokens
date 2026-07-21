"""Command-line interface for show-me-tokens."""

from __future__ import annotations

import argparse
import sys
import traceback
from datetime import datetime
from pathlib import Path
from typing import Callable, Sequence

from show_me_tokens.adapters.base import AgentAdapter
from show_me_tokens.adapters.registry import get_adapter, list_adapter_names
from show_me_tokens.formatters.csv import format_csv
from show_me_tokens.formatters.json import format_json
from show_me_tokens.formatters.table import format_table
from show_me_tokens.models import SessionFilters, SessionUsage


FORMATTERS: dict[str, Callable[[list[SessionUsage]], str]] = {
    "table": format_table,
    "json": format_json,
    "csv": format_csv,
}


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    raise argparse.ArgumentTypeError(
        f"Invalid date {value!r}. Expected YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS."
    )


def _parse_workspace(value: str | None) -> Path | None:
    if not value:
        return None
    return Path(value).expanduser().resolve()


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="show-me-tokens",
        description="Report per-session token usage of AI IDE agents.",
    )
    parser.add_argument(
        "--verbose", action="store_true", help="Show full traceback on errors."
    )
    subparsers = parser.add_subparsers(dest="agent", required=True)

    agents_parser = subparsers.add_parser(
        "agents", help="List supported agent adapters."
    )
    agents_parser.set_defaults(func=_run_agents)

    for name in list_adapter_names():
        adapter = get_adapter(name)
        sub = subparsers.add_parser(
            name,
            help=f"Report token usage from {adapter.__name__}.",
        )
        sub.add_argument(
            "--db",
            type=Path,
            help="Path to the local SQLite database (default: auto-detect).",
        )
        sub.add_argument(
            "--since",
            type=_parse_date,
            metavar="DATE",
            help="Include sessions updated on or after this date (YYYY-MM-DD).",
        )
        sub.add_argument(
            "--until",
            type=_parse_date,
            metavar="DATE",
            help="Include sessions updated on or before this date (YYYY-MM-DD).",
        )
        sub.add_argument(
            "--workspace",
            type=_parse_workspace,
            metavar="PATH",
            help="Filter by workspace/project path.",
        )
        sub.add_argument(
            "--session-id",
            help="Filter by session ID.",
        )
        sub.add_argument(
            "--format",
            choices=list(FORMATTERS),
            default="table",
            help="Output format (default: table).",
        )
        sub.add_argument(
            "--limit",
            type=int,
            metavar="N",
            help=(
                "Maximum number of sessions to display. "
                "For table output the default is 20; use 0 for unlimited."
            ),
        )
        sub.set_defaults(func=_run_agent)

    return parser


def _run_agents(_args: argparse.Namespace) -> int:
    print("Supported agents:")
    for name in list_adapter_names():
        print(f"  - {name}")
    return 0


def _run_agent(args: argparse.Namespace) -> int:
    adapter_cls = get_adapter(args.agent)
    adapter: AgentAdapter = adapter_cls()
    db_path = args.db or adapter.default_db_path()

    filters = SessionFilters(
        since=args.since,
        until=args.until,
        workspace=args.workspace,
        session_id=args.session_id,
    )

    sessions = adapter.collect_sessions(db_path, filters)
    if not sessions:
        print("No sessions matched the filters.", file=sys.stderr)
        return 0

    limit = args.limit
    if limit is None and args.format == "table":
        limit = 20

    if limit is not None and limit > 0:
        sessions = _sort_by_total(sessions)[:limit]

    formatter = FORMATTERS[args.format]
    print(formatter(sessions))
    return 0


def _sort_by_total(sessions: list[SessionUsage]) -> list[SessionUsage]:
    """Return sessions sorted by total token usage descending."""
    return sorted(
        sessions,
        key=lambda u: u.tokens.total_tokens or 0,
        reverse=True,
    )


def main(argv: Sequence[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except FileNotFoundError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        print(
            "Hint: use --db <path> to specify the database location.",
            file=sys.stderr,
        )
        return 2
    except KeyError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:  # pragma: no cover - general safety net
        print(f"Error: {exc}", file=sys.stderr)
        if args.verbose:
            traceback.print_exc()
        return 1
