"""Tests for data models."""

from __future__ import annotations

from show_me_tokens.models import TokenSummary


def test_token_summary_computes_total():
    tokens = TokenSummary(input_tokens=10, output_tokens=5)
    assert tokens.total_tokens == 15


def test_token_summary_preserves_explicit_total():
    tokens = TokenSummary(input_tokens=10, output_tokens=5, total_tokens=100)
    assert tokens.total_tokens == 100


def test_token_summary_zero_total_is_none():
    tokens = TokenSummary()
    assert tokens.total_tokens is None
