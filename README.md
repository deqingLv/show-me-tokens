# show-me-tokens

A command-line tool and local web dashboard for reading AI IDE session history (currently supports Qoder and QoderWork) and reporting per-session token usage, including input, cache read, and output tokens.

## Disclaimer

This project (show-me-tokens) is for personal learning, research, and communication purposes only.

- This project is not affiliated with Qoder, ByteDance, or any other AI IDE vendor, nor is it endorsed by them.
- It only reads local SQLite database files already present on your device and does not connect to remote services, APIs, or user accounts.
- It does not upload, modify, or delete the data it reads.
- Before using this project, please ensure you have the right to access the relevant local data and comply with the terms of service of the corresponding software and applicable laws.
- This project is provided "as is" without warranty.

## Installation from source

The npm package has not been published yet. For now, clone this repository and run it locally:

```bash
git clone https://github.com/lvdeqing/show-me-tokens.git
cd show-me-tokens
npm install
npm run build
```

Requirements:

- Node.js 20+
- macOS default database paths are supported out of the box; use `--db` if your database is elsewhere.

## Web Dashboard

Start the local web UI from the repository directory:

```bash
# Default: starts the server on http://localhost:3456 and opens the browser
npx .

# Advanced: start without automatically opening the browser
npx . --serve

# Advanced: custom port and auto-open
npx . --serve --port 3456 --open
```

The dashboard lets you:

- Switch between agents (Qoder / QoderWork)
- Filter by workspace, session id, model, and date range
- View summary cards and a token breakdown chart
- Browse sessions with cache/input, output/input, and estimated Hugging Face cost columns
- Export results as JSON or CSV

## CLI Usage

Run CLI commands from the repository directory:

```bash
# List supported agents
npx . agents

# Report Qoder token usage (default table output)
npx . qoder

# Filter by workspace, model, or session id
npx . qoder --workspace /path/to/project
npx . qoder --ws /path/to/project
npx . qoder --model glm-5
npx . qoder --session-id abc-123
npx . qoder -s abc-123

# Date range filters
npx . qoder --since 2026-07-01 --until 2026-07-21

# Output formats
npx . qoder --format json
npx . qoder --format csv

# Specify a database path
npx . qoder --db /path/to/local.db

# QoderWork adapter
npx . qoderwork
```

You can also run the built CLI directly:

```bash
node dist/cli.js agents
node dist/cli.js qoder
```

## Cost estimation

For matching GLM models, show-me-tokens estimates cost in USD using an embedded snapshot of Hugging Face Inference Providers prices. The table header links to the current Hugging Face pricing page: https://huggingface.co/inference/models

Current built-in matches:

| Model match | Hugging Face model | Provider | Input USD / 1M | Output USD / 1M |
| ----------- | ------------------ | -------- | -------------- | --------------- |
| `gm51`, `GLM-5.1` | `zai-org/GLM-5.1-FP8` | `fireworks-ai` | `$1.40` | `$4.40` |
| `glm52`, `GLM-5.2` | `zai-org/GLM-5.2` | `deepinfra` | `$0.93` | `$3.00` |

Unknown models display `-` for cost. Cache read tokens are treated as part of input tokens and are not added again.

## Publishing to npm

This repository includes a GitHub Actions workflow at `.github/workflows/publish-npm.yml`.

### 1. Create an npm automation token

Create a token from npm:

```text
https://www.npmjs.com/settings/<your-npm-username>/tokens
```

Use an **Automation** token if your npm account has 2FA enabled.

### 2. Add the token to GitHub Secrets

In GitHub:

```text
Repository → Settings → Secrets and variables → Actions → New repository secret
```

Create this secret:

```text
NPM_TOKEN=<your npm token>
```

### 3. Publish a release

Bump the package version, commit it, then push a version tag:

```bash
npm version patch
git push --follow-tags
```

Any tag matching `v*` triggers the workflow and publishes the package with npm provenance enabled.

You can also trigger it manually from:

```text
GitHub → Actions → Publish to npm → Run workflow
```

## Development

```bash
# Start the backend and frontend dev servers
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start the production server
npm start
```

## Supported Agents

| Agent       | Default Data Source                                                              |
| ----------- | -------------------------------------------------------------------------------- |
| `qoder`     | `~/Library/Application Support/Qoder/SharedClientCache/cache/db/local.db`        |
| `qoderwork` | `~/Library/Application Support/QoderWork/data/agents.db`                         |

## License

MIT
