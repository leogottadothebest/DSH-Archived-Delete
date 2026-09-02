# dsh-plugin-archived-conversations 项目指令

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

## 规则:npm 发布必须走网页验证流程(用户亲自验证)

用户明确要求(2026-09-01):"以后 npm 发布都要给我跳转网页界面,我来验证"。执行 `npm publish` 时**必须**采用以下流程,不得绕过:

1. 在后台执行 `npm publish`(命令保持运行),捕获其输出的**一次性登录 URL**(`https://www.npmjs.com/auth/cli/...`,EOTP 流程会自动打印)。
2. 把该 URL 交给用户,由用户**亲自在浏览器中打开并完成验证**(登录/2FA 均在网页完成)。
3. 用户完成后,npm CLI 会自动取回一次性 token 并继续发布;等待命令结束。
4. 之后照常执行强制验证(`npm view dsh-plugin-archived-conversations version` 与本地一致)与 `git push origin main --tags`。

严禁在未走网页验证流程的情况下自行完成发布(例如直接要求用户提供 OTP 码或代为输入)。

## 仓库信息

- 远端:https://github.com/leogottadothebest/dsh-plugin-archived-conversations.git
- 默认分支:`main`(已设置 upstream 跟踪)
- 提交身份:`leogottadothebest` <298153419+leogottadothebest@users.noreply.github.com>
