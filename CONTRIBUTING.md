# 贡献指南（Contributing）

感谢你对 `dsh-plugin-archived-conversations` 的关注！任何形式的贡献都欢迎：
报 bug、提需求、改文档、修代码。

## 行为准则

参与本项目即表示你同意遵守 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。

## 开始之前

```bash
git clone https://github.com/leogottadothebest/dsh-plugin-archived-conversations.git
cd dsh-plugin-archived-conversations
pnpm install --frozen-lockfile
```

要求：Node.js ≥ 18、pnpm 11（`packageManager` 字段已固定）。

## 开发循环

```bash
pnpm run build:client   # 构建客户端产物 client/client.js（含浏览器物化冒烟测试）
pnpm run check          # 构建客户端 + 宿主端语法检查（node --check lib/*.js）
```

- 宿主半程是纯 ESM，无需构建（`lib/*.js`）。
- **客户端源码在 `client/src/`，发布产物是 `client/client.js`。** 改完
  `client/src/` 后必须重新构建并把 `client/client.js` 一并提交——CI 会
  校验产物与源码一致（`git diff --exit-code client/client.js`）。

## 提交规范

- 一个提交只做一件事；提交信息用 Conventional Commits 风格
  （`feat:` / `fix:` / `docs:` / `chore:` …），与现有历史保持一致。
- 改动用户可见行为时更新 [CHANGELOG.md](./CHANGELOG.md) 的
  `[Unreleased]` 段。
- 严禁提交密钥、token、私密 URL（`.gitignore` 已覆盖 `.env` 等）。
- 中英文均可，但公开文档请保持中英对应。

## 提 PR 流程

1. Fork 本仓库，新建分支。
2. 本地跑通 `pnpm run check`，确认 `git status` 无意外改动。
3. 更新文档/CHANGELOG（如有必要），提交并推送。
4. 发起 PR，按 [PR 模板](./.github/PULL_REQUEST_TEMPLATE.md) 填写。
5. 等待 CI 通过；维护者会进行 review。

## 发布与上架

- 发布 npm：`pnpm publish`（`prepack` 钩子会自动构建客户端产物并做
  语法检查，保证发布的 tarball 永远包含最新产物）。
- 上架插件市场：向
  [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
  提 PR 添加一条条目（dshmarket 等市场会自动收录）。目录会校验 npm 包的
  `repository` 字段与条目中的仓库一致，因此**请勿修改 `package.json`
  中的 `repository`**。

## 相关文档

- [README.md](./README.md)：功能与安装说明
- [DESIGN.md](./DESIGN.md)：架构与设计决策
- [SECURITY.md](./SECURITY.md)：安全报告渠道
