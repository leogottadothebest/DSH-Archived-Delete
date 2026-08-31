# dsh-plugin-archived-conversations

DeepSeek Harness 插件：在**设置界面**管理**已归档对话**。

- **取消归档** —— 对话恢复到侧边栏原位置（工作区记账保持不变）；
- **删除** —— 永久删除对话（内存会话、磁盘日志 `session.jsonl.zstd`、
  工作区记账与归档记录一并清理），带二次确认；
- 附带完整归档 API（`archive`，与核心归档路径一致），并支持「全部取消
  归档」批量操作。

对话被归档后不再出现在侧边栏；本插件是找回并清理它们的唯一入口。

## 功能

- 设置 →「已归档对话」页面，按归档顺序倒序列出全部已归档对话：标题、
  工作区路径、最近活动时间；
- 行操作：**取消归档**、**删除**（`RiskConfirmation` 确认，需勾选
  「我明白此操作不可恢复」）；
- 实时双向同步：在侧边栏归档的对话立即出现在本页；在本页取消归档的
  对话立即回到侧边栏；
- 读取失败的坏行仍可删除（自愈）；
- 中英双语，跟随浅色/深色主题。

## 安装

把本包加入 profile 依赖后重启（与官方插件一致的加载方式）：

```bash
# 桌面端（以默认 profile 为例）
cd ~/.dsh/profiles/desktop
pnpm add /Users/leo/Documents/DeepSeekHarness/Archived-Delete
```

或在插件市场（dsh-community-market）中安装本包。重启 DeepSeek Harness
后，打开 设置 → **已归档对话** 即可使用。

## 远程 API（宿主）

命名空间 `archivedSessions`（Typert 协议，严格 zod wire codec）：

| 方法 | 参数 | 返回 |
| --- | --- | --- |
| `list(signal)` | — | `{ items: ArchivedSessionItem[], archivedSessionIds: string[] }` |
| `archive(request, signal)` | `{ sessionId }` | `{ sessionId, archivedSessionIds }` |
| `unarchive(request, signal)` | `{ sessionId }` | `{ sessionId, archivedSessionIds }` |
| `deleteSession(request, signal)` | `{ sessionId }` | `{ sessionId, deleted: true }` |

`ArchivedSessionItem`：

```ts
interface ArchivedSessionItem {
  sessionId: string
  title: string | null          // 投影缓存中的标题
  cwd: string | null            // 工作区路径
  createdAt: number | null      // epoch ms
  updatedAt: number | null      // 最近活动（lastPromptAt ?? createdAt）
  running: boolean              // 会话当前是否仍在内存中
  readError: string | null      // 行读取失败原因（仍可删除）
}
```

业务错误（`{ok:false, error:{code, message, details}}`）：
`not-archived`、`live-detach-unsupported`、`unsupported-backend`。

## 开发

纯 ESM、零构建步骤：宿主入口 `lib/index.js`，客户端入口
`client/index.js`，Typert 清单分别位于 `lib/typert.js`（宿主，经
`dsh-typert-loader` 自动注册）与 `client/typert.js`（客户端，经
`ctx.remote.$mount` 挂载）。

```bash
node --check lib/*.js client/*.js   # 语法检查
```

客户端组合所需的官方包在 `package.json` 的 `dsh.client.inject` 中声明。

## 架构与设计决策

见 [DESIGN.md](./DESIGN.md)：核心归档机制的现状分析、删除顺序
（flush → detach → 删文件 → registry 清理）、实时同步链路、风险与取舍。

## License

MIT
