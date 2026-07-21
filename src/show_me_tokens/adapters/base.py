"""Abstract adapter interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import ClassVar

from show_me_tokens.models import SessionFilters, SessionUsage


class AgentAdapter(ABC):
    """Base class for all agent/IDE adapters."""

    name: ClassVar[str]

    @abstractmethod
    def default_db_path(self) -> Path:
        """Return the default local database path for this agent."""

    @abstractmethod
    def collect_sessions(
        self,
        db_path: Path,
        filters: SessionFilters,
    ) -> list[SessionUsage]:
        """Read the local database and return normalized session usage rows."""
