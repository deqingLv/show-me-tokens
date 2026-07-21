# show-me-tokens

一个命令行工具，用于读取本地 AI IDE（当前支持 Qoder）的会话历史，统计每个会话消耗的 token 数量，包括 input、cache input、output 等。

A command-line tool that reads local AI IDE session history (currently supports Qoder) and reports per-session token usage, including input, cache input, and output tokens.

## 免责声明 / Disclaimer

本项目（show-me-tokens）仅供个人学习、研究和交流使用。

- 本项目不隶属于 Qoder、ByteDance 或任何其他 AI IDE 工具的开发商，也不受其认可。
- 本项目仅读取用户本地设备上已存在的 SQLite 数据库文件，不会连接任何远程服务、API 或用户账户。
- 本项目不对读取的数据进行上传、修改或删除操作。
- 使用本项目前，请确保您拥有访问相关本地数据的合法权利，并遵守相应软件的服务条款及所在地法律法规。
- 本项目按“原样”提供，作者不对使用本项目产生的任何直接或间接后果承担责任。

This project is provided for personal learning, research, and communication purposes only. It is not affiliated with or endorsed by Qoder, ByteDance, or any other AI IDE vendor. It only reads local SQLite files already present on your device and does not connect to remote services, APIs, or user accounts. Please ensure you have the right to access the relevant local data and comply with the terms of service of the corresponding software and applicable laws. This project is provided "as is" without warranty.

## 安装 / Installation

```bash
pip install show-me-tokens
```

或从源码安装：

```bash
git clone https://github.com/lvdeqing/show-me-tokens.git
cd show-me-tokens
pip install -e ".[dev]"
```

## 用法 / Usage

```bash
# 查看 Qoder IDE 所有会话的 token 统计
show-me-tokens qoder

# 按工作区过滤
show-me-tokens qoder --workspace /path/to/project

# 按日期范围过滤
show-me-tokens qoder --since 2026-07-01 --until 2026-07-21

# 查看 QoderWork 会话
show-me-tokens qoderwork

# 输出 JSON
show-me-tokens qoder --format json

# 指定数据库路径
show-me-tokens qoder --db /path/to/local.db

# 列出支持的 agent
show-me-tokens agents
```

## 支持的 agents

| Agent | 数据源 | 说明 |
|---|---|---|
| `qoder` | `~/Library/Application Support/Qoder/SharedClientCache/cache/db/local.db` | Qoder IDE 本地会话数据库 |
| `qoderwork` | `~/Library/Application Support/QoderWork/data/agents.db` | QoderWork 本地会话数据库 |

## 开发 / Development

```bash
pip install -e ".[dev]"
pytest
```

## License

MIT
