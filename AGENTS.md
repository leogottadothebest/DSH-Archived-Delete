# DSH-Archived-Delete 项目指令

本文件是 **DeepSeek Harness 的持久工作区指令**:DSH 在每个会话启动时都会读取本文件,因此**任何对话、任何会话**中的 agent 都必须遵守本规则,无需用户重复说明。

> 本规则由用户明确要求(2025 会话):"以后每一次源代码改动之后都要自动提交到 GitHub 并明确反馈当前提交版本"。这是**硬性要求**,不是可选项。

## 规则:每次源代码改动后自动提交并推送 GitHub

**触发条件**:只要本次会话中通过 `write` / `edit` / `bash` 等方式**修改、新增或删除了本仓库(`Archived-Delete`)中的任何文件**(包括源码、文档、配置、本 AGENTS.md 本身),必须在**结束回合之前**完成提交与推送。

**必须执行的步骤**(在回合结束前逐一完成):

1. `git -C /Users/leo/Documents/DeepSeekHarness/Archived-Delete status --short` —— 查看改动。
2. `git add -A` —— 暂存全部改动。
3. `git commit -m "<清晰描述本次改动的信息>"` —— 提交信息必须具体说明改了什么、为什么,禁止用 "update" 之类的空泛信息。
4. `git push origin main` —— 推送到 GitHub 远端。
5. `git status` —— 确认工作区干净、与 `origin/main` 同步;`git log --oneline -1` 取最新提交。

**必须反馈提交版本**:在回复正文中明确给出

- 短哈希(如 `41eda44`)与完整哈希(如 `41eda4462c8bc9e77fc8ca2973bea1fa8c16c9c2`);
- 提交信息;
- 本地与远端是否同步(`git ls-remote origin main` 与本机 HEAD 一致)。

**边界情况**:

- 本回合没有任何文件改动时,无需提交,但应说明"无改动,未提交"。
- 严禁把密钥、token、私密 URL 写入任何被提交的文件(`.gitignore` 已覆盖 `.env` 等)。
- 仓库已配置 `core.hooksPath = .githooks`,每次 commit 后 `post-commit` 钩子会自动推送——但钩子只是兜底,**agent 仍必须自己执行 `git push` 并反馈版本**,不得依赖钩子。
- 其他项目的仓库(如 `~/Documents/DeepSeekHarness/Academic`、`Settings`、`Website` 等)不受本规则约束,除非那些仓库也有各自的 AGENTS.md。

## 规则:每次源代码改动后自动发布 npm 新版本(保证生效)

**触发条件**:本会话对**源码或发布产物**做出了修改——包括 `lib/`、`client/src/`、`client/client.js`、`package.json`(依赖/版本/发布配置)——在完成上述 GitHub 提交推送之后,**必须发布一个新版本到 npm 并验证生效**。纯文档/规则类改动(`README.md`、`DESIGN.md`、`CHANGELOG.md`、`AGENTS.md`、`.github/`、`CONTRIBUTING.md` 等)**不触发**发版。**不允许把多次源码改动攒到一起发版**,每次源码改动后都要立即发布。

**必须执行的发布步骤**(回合结束前逐一完成):

1. 更新 `CHANGELOG.md`:把 `[Unreleased]` 段的内容整理进新版本段(格式仿照现有条目;新版本号 = 当前版本 +1 patch)。
2. `npm version patch -m "release: %s"` —— 自动提升版本号(如 0.1.1 → 0.1.2)并生成提交与 `vX.Y.Z` tag。
3. `npm publish` —— `prepack` 钩子会自动重新构建 `client/client.js` 并做宿主语法检查。若遇 `EPERM` 缓存错误(沙箱/缓存权限),改用临时缓存执行:`npm_config_cache=$(mktemp -d) npm publish`。
4. **强制验证(保证生效,不得跳过)**:`npm view dsh-plugin-archived-conversations version` 的输出**必须与本地 `package.json` 的 version 完全一致**;不一致即发布失败,必须排查重试,禁止以"已执行 publish"蒙混。
5. `git push origin main --tags` —— 推送源码提交、版本提交与 tag。
6. `git status` 确认工作区干净、与 `origin/main` 同步。

**必须反馈**:在回复正文中明确给出 npm 新版本号(如 `0.1.2`)、`npm view` 验证结果、git 提交版本(短+完整哈希)与 tag 名。

## 仓库信息

- 远端:https://github.com/leogottadothebest/DSH-Archived-Delete.git
- 默认分支:`main`(已设置 upstream 跟踪)
- 提交身份:`leogottadothebest` <298153419+leogottadothebest@users.noreply.github.com>
