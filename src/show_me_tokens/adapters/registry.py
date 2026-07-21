"""Adapter registry."""

from __future__ import annotations

from show_me_tokens.adapters.base import AgentAdapter
from show_me_tokens.adapters.qoder import QoderAdapter
from show_me_tokens.adapters.qoderwork import QoderWorkAdapter

ADAPTERS: dict[str, type[AgentAdapter]] = {
    QoderAdapter.name: QoderAdapter,
    QoderWorkAdapter.name: QoderWorkAdapter,
}


def get_adapter(name: str) -> type[AgentAdapter]:
    """Return the adapter class registered under ``name``.

    Raises:
        KeyError: if no adapter is registered for ``name``.
    """
    try:
        return ADAPTERS[name]
    except KeyError as exc:
        raise KeyError(
            f"Unknown agent: {name!r}. "
            f"Supported agents: {', '.join(sorted(ADAPTERS))}"
        ) from exc


def list_adapter_names() -> list[str]:
    """Return supported adapter names in alphabetical order."""
    return sorted(ADAPTERS)
