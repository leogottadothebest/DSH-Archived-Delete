# Changelog

本项目的所有显著变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 变更

- 补齐发布所需的社区与市场规范：`repository`/`homepage`/`bugs`/
  `keywords`/`engines` 等 npm 元数据；发布前自动构建校验（`prepack`）。
- 新增 CONTRIBUTING.md、CODE_OF_CONDUCT.md、SECURITY.md、CHANGELOG.md、
  issue/PR 模板与 CI 工作流。

## [0.1.0] - 2026-08-31

### 新增

- 设置 →「已归档对话」页面：按归档顺序倒序列出全部已归档对话。
- 行操作：取消归档（恢复到侧边栏原位置）、永久删除（二次确认）。
- 「全部取消归档」批量操作。
- 远程 API `archivedSessions`（`list` / `archive` / `unarchive` /
  `deleteSession`），Typert 协议 + 严格 zod wire codec。
- 与侧边栏归档动作的实时双向同步；坏行自愈删除；中英双语；明暗主题。
