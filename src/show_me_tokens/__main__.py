"""Allow running ``python -m show_me_tokens``."""

from __future__ import annotations

import sys

from show_me_tokens.cli import main

if __name__ == "__main__":
    sys.exit(main())
