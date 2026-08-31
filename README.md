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

DSH 插件需要两步：作为依赖安装 + 挂载为 bundle 层（本包自带
`dsh.bundle.patch`，即 `cordis.patch.yml` 中的插入条目）。

```bash
# 桌面端（以默认 profile 为例）
cd ~/.dsh/profiles/desktop
pnpm add /Users/leo/Documents/DeepSeekHarness/Archived-Delete

# 把插件追加到 bundle 层：编辑 package.json，在 dsh.profile.bundles 中
# 加入 "dsh-plugin-archived-conversations"（dshmarket 安装插件时执行
# 的正是这两步）。
```

然后重启 DeepSeek Harness，打开 设置 → **已归档对话** 即可使用。也可在
插件市场（dsh-community-market）中安装本包（需发布到 npm registry）。

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

宿主半程是纯 ESM（`lib/index.js`，`lib/typert.js` 经
`dsh-typert-loader` 自动注册，无需构建）。**客户端半程必须构建**：DSH
浏览器运行时把每个插件的 `./client` 导出当作经典脚本加载，要求它通过
`window.__ModuleLoader__.load({ id, factory })` 注册 CJS 工厂——裸 ESM
会导致页面启动失败。源码在 `client/src/`，发布产物是
`client/client.js`（zod 内联打包；react / jsx-runtime / primitives 走
平台种子模块外部化）。

```bash
pnpm run build:client            # 生成 client/client.js
node --check lib/*.js            # 宿主语法检查
```

改完客户端源码后需重新构建并重装（`file:` 安装时 pnpm 会重新复制包）。

客户端组合所需的官方包在 `package.json` 的 `dsh.client.inject` 中声明。

## 架构与设计决策

见 [DESIGN.md](./DESIGN.md)：核心归档机制的现状分析、删除顺序
（flush → detach → 删文件 → registry 清理）、实时同步链路、风险与取舍。

## License

MIT
