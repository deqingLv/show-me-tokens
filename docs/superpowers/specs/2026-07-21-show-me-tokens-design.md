# show-me-tokens Design

**Status:** Pending final review  
**Date:** 2026-07-21  
**Topic:** Python CLI for reporting per-session token usage of AI IDE agents, starting with Qoder.

## Context

AI IDE tools such as Qoder store local chat/session history in SQLite databases on the user's machine. Token usage is often buried in these databases in provider-specific columns and JSON blobs, making it hard for users to answer simple questions like:

- How many input/output/cache tokens did I consume today?
- Which workspace or session used the most tokens?
- What model was used for a given session?

The `trae_2b_eval` project already contains working collectors (`export-qoder-session.py`, `export-qoder-work-session.js`) that read these SQLite files and produce normalized artifacts. `show-me-tokens` turns that knowledge into a standalone, installable, extensible CLI.

## Goals

- Provide a single command, `show-me-tokens <agent>`, that prints a human-readable table of per-session token usage.
- Support Qoder IDE (`local.db`) and QoderWork (`agents.db`) in the first version.
- Expose normalized token fields: `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `total_tokens`.
- Allow filtering by date range, workspace/project path, and session/chat ID.
- Be designed so adding a future agent (Cursor, Trae, Kiro, CodeBuddy, etc.) only requires a new adapter module.

## Non-goals

- Decrypt or display message content. We only read public token fields and metadata, avoiding any cryptography dependency.
- Report per-request or per-model-call granularity in v1.
- Support non-macOS default paths in v1 (overrides via `--db` still work).
- Publish to PyPI in v1 (the package is structured so it can be published later).

## Architecture & package layout

```
show-me-tokens/
├── pyproject.toml
├── README.md
├── src/
│   └── show_me_tokens/
│       ├── __init__.py
│       ├── cli.py              # argument parsing, command dispatch
│       ├── models.py           # SessionUsage, TokenSummary dataclasses
│       ├── formatters/         # output renderers
│       │   ├── __init__.py
│       │   ├── table.py        # default human-readable table
│       │   ├── json.py
│       │   └── csv.py
│       └── adapters/           # one per agent / IDE
│           ├── __init__.py
│           ├── base.py         # AgentAdapter abstract interface
│           ├── registry.py     # name -> adapter class
│           ├── qoder.py        # Qoder IDE local.db
│           └── qoderwork.py    # QoderWork agents.db
└── tests/
```

Core flow: `cli.py` parses the agent name, looks it up in `adapters.registry`, calls `adapter.collect_sessions(filters)`, receives normalized `SessionUsage` objects, and passes them to a formatter.

## Components & interfaces

### Data models (`models.py`)

```python
@dataclass
class TokenSummary:
    input_tokens: int
    output_tokens: int
    cache_read_input_tokens: int | None
    cache_creation_input_tokens: int | None
    total_tokens: int | None

@dataclass
class SessionUsage:
    agent: str                # "qoder" | "qoderwork"
    session_id: str
    chat_id: str | None
    project_name: str | None
    workspace_path: str | None
    model_name: str | None
    created_at: datetime | None
    updated_at: datetime | None
    tokens: TokenSummary
    note: str | None = None   # e.g. "token usage unavailable" for qoderwork
    raw_source: dict | None = None   # optional audit/debug info

@dataclass
class SessionFilters:
    since: datetime | None
    until: datetime | None
    workspace: Path | None
    session_id: str | None
```

### Adapter interface (`adapters/base.py`)

```python
class AgentAdapter(ABC):
    name: str

    @abstractmethod
    def default_db_path(self) -> Path: ...

    @abstractmethod
    def collect_sessions(
        self,
        db_path: Path,
        filters: SessionFilters,
    ) -> list[SessionUsage]: ...
```

### Registry (`adapters/registry.py`)

```python
ADAPTERS: dict[str, type[AgentAdapter]] = {
    "qoder": QoderAdapter,
    "qoderwork": QoderWorkAdapter,
}
```

### Formatters (`formatters/`)

- `table.py`: one row per session, columns `agent`, `session_id`, `model_name`, `input_tokens`, `cache_read_input_tokens`, `output_tokens`, `total_tokens`, plus a final totals row.
- `json.py`: JSON array of `SessionUsage` dicts.
- `csv.py`: CSV rows with the same fields as the table.

## Data flow & CLI commands

```bash
show-me-tokens qoder
show-me-tokens qoder --workspace /path/to/project --since 2026-07-01
show-me-tokens qoderwork --session-id <uuid> --format json
show-me-tokens agents          # list supported agents
```

Flow:

1. Parse the subcommand (`qoder` / `qoderwork`) and shared filters (`--db`, `--since`, `--until`, `--workspace`, `--session-id`, `--format`).
   - Date range is inclusive and applies to `updated_at` (last activity).
   - Workspace filter matches the resolved `workspace_path` or `project_path`.
2. Resolve DB path using `default_db_path()` unless `--db` is provided.
3. Validate the SQLite file exists and is readable.
4. Call `adapter.collect_sessions(db_path, filters)`.
5. Sort results by `updated_at` descending.
6. Render with the selected formatter (default `table`).

### Adapter-specific behavior

**QoderAdapter**

- Reads `chat_session` to enumerate sessions.
- Reads `chat_message` per session, parses the `token_info` JSON column.
- Token mapping:
  - `prompt_tokens` → `input_tokens`
  - `completion_tokens` → `output_tokens`
  - `cached_tokens` → `cache_read_input_tokens`
  - `total_tokens` computed as `input_tokens + output_tokens` when not explicitly present.
- No decryption is performed; message `content` is ignored.

**QoderWorkAdapter**

- Reads `sub_chats` joined to `chats` and `projects`.
- Iterates messages and recursively scans `parts` and `metadata` for dicts containing token-shaped keys (`prompt_tokens`, `input_tokens`, `completion_tokens`, `output_tokens`, `cached_tokens`, etc.).
- If no comparable token fields are found, the adapter returns sessions with `tokens.total_tokens = None` and `note = "Token usage unavailable: no comparable token fields found in local agents.db"`.

## Error handling

- **Missing DB:** Print the resolved path and a hint to use `--db <path>`, exit code `2`.
- **No matching sessions:** Exit code `0`, print "No sessions matched the filters" to stderr.
- **Token data unavailable:** Rows still appear with empty token columns and a `note` or stderr warning.
- **Read-only access:** All SQLite connections use `file:<db>?mode=ro` URI mode to avoid locking or mutating the IDE database.
- **Unexpected errors:** Print a concise message; `--verbose` shows the full traceback.

## Testing strategy

- pytest runner under `tests/`.
- Adapter tests build temporary SQLite databases matching the Qoder and QoderWork schemas, insert sample rows, and assert the returned `SessionUsage` list.
- Token normalization tests cover missing fields, zero values, and `cached_tokens` mapping.
- Formatter tests capture stdout and assert expected columns and totals.
- CLI tests verify subcommand dispatch, filter parsing, and exit codes.
- No real IDE database is required; all access is against ephemeral fixtures.

## README disclaimer

The `README.md` must open with a clear disclaimer that the project is for learning and research use only, to mitigate legal risk around reading local IDE data structures:

```markdown
## 免责声明 / Disclaimer

本项目（show-me-tokens）仅供个人学习、研究和交流使用。

- 本项目不隶属于 Qoder、ByteDance 或任何其他 AI IDE 工具的开发商，也不受其认可。
- 本项目仅读取用户本地设备上已存在的 SQLite 数据库文件，不会连接任何远程服务、API 或用户账户。
- 本项目不对读取的数据进行上传、修改或删除操作。
- 使用本项目前，请确保您拥有访问相关本地数据的合法权利，并遵守相应软件的服务条款及所在地法律法规。
- 本项目按“原样”提供，作者不对使用本项目产生的任何直接或间接后果承担责任。

This project is provided for personal learning, research, and communication purposes only. It is not affiliated with or endorsed by Qoder, ByteDance, or any other AI IDE vendor. It only reads local SQLite files already present on your device and does not connect to remote services, APIs, or user accounts. Please ensure you have the right to access the relevant local data and comply with the terms of service of the corresponding software and applicable laws. This project is provided "as is" without warranty.
```

## Future work

- Add new adapters by implementing `AgentAdapter` and registering the class: Cursor, Trae CN, Kiro, CodeBuddy, etc.
- Optional per-request granularity (`--detail request`).
- Cost estimation from token counts and model pricing tables.
- Configuration file / environment variable defaults.
- Windows/Linux default path detection.

## Decisions log

| Decision | Rationale |
|---|---|
| Two adapters: `qoder` and `qoderwork` | The eval project exposes two distinct Qoder SQLite schemas; treating them separately keeps each adapter focused. |
| Default output: human-readable table | Quick inspection is the primary use case. |
| One row per session with grand total | Directly answers "how many tokens did I use?" without overwhelming detail. |
| Auto-detect macOS default paths, allow `--db` override | Convenience for the common case, flexibility for custom installs. |
| Filters: date range, workspace, session/chat ID | Covers the most common ways users want to narrow results. |
| Standard `pyproject.toml` pip package | Easy to install, test, and eventually publish. |
| Skip content decryption | Token fields are stored unencrypted; avoiding decryption removes a cryptography dependency. |
