# Intervals 项目指引

本文件是 AI 在本仓库工作的强制入口。默认使用简体中文沟通；代码、标识符、命令和错误文本保持原文。

## 开始任务前

1. 阅读 [`docs/README.md`](docs/README.md)，按其中的任务路由只读取需要的文档。
2. 运行 `git status --short --branch`，识别当前分支、未提交修改和并行工作。
3. 保留用户及其他任务的修改。不要清理、回退、格式化或顺手重构无关内容；不要使用 `git add -A`。
4. 如果另一个 AI 或进程正在修改同一文件，停止对该文件的写入，改做不重叠的工作或等待用户协调。

## 实现原则

- 先确定可验证的成功条件，再修改代码。
- 采用结构优先的修复：乐理拼写、谱面数据、题目生成、答案行为、键盘与焦点、播放调度、持久化等规则应进入对应的共享层，禁止为单个页面复制一套近似逻辑。
- 修改必须有限且可追溯；不增加未被请求的功能、抽象或依赖。
- 乐理显示正确不代表功能完成。需要同时核对拼写、谱面、内部类型、生成结果、播放音高与交互路径。
- 保持已有设置、统计、错题和题目身份的兼容；存储结构变化必须提供迁移或明确说明破坏性边界。
- 原始素材、临时导出、登录状态、日志和本地专用文件不得进入 Git。遵守 `.gitignore` 对 `Drop/`、`.local-assets/` 等路径的现有边界。

代码职责与依赖方向以 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) 为准；产品体验约束以 [`docs/PRODUCT.md`](docs/PRODUCT.md) 和仍为 `Accepted` 的 [`docs/DECISIONS.md`](docs/DECISIONS.md) 为准。

## 验证

- 修复缺陷时先写或调整能复现问题的回归测试，再使其通过。
- 修改代码、构建配置或运行时资源后，运行 Windows 下的完整检查：`npm.cmd run check`。
- 涉及响应式布局、焦点、键盘、触控、声音、PWA 更新或发布行为时，除自动化测试外还要验证真实运行页面；不要只阅读测试或配置就宣称完成。
- 仅修改 Markdown 文档时，不必运行应用测试；要检查链接、职责边界、事实来源和 Git 变更范围。
- 报告实际执行过的验证。未执行、被阻塞或仅由旧记录得出的结果必须明确标注。

## 文档自动维护（强制）

这些文档主要供 AI 使用，维护责任也属于执行任务的 AI。用户不需要提醒或手动补写。

- 每次任务开始时，检查与任务相关的文档是否和当前代码、测试、Git 状态及用户最新要求一致。
- 每次任务结束前，必须按 [`docs/README.md`](docs/README.md) 的更新矩阵判断文档影响，并在同一次任务中更新所有受影响文件。
- 对当前事实类文档直接改写、合并或删除过时内容，禁止只在末尾追加一条造成新旧说法并存。
- 不复制已有事实：信息只写入其唯一负责文件，其他地方使用链接。
- 用户给出明确且可长期复用的偏好时，主动沉淀为 `PRODUCT.md` 的产品原则或 `DECISIONS.md` 的具体决定；明确不喜欢的方案写成可执行的 `Avoid` 约束。
- 未确认的想法只进入 `IDEAS.md`，标记为候选，不得当成已批准需求。确认后将其移出 `IDEAS.md`，进入 `CURRENT_STATE.md` 或 `DECISIONS.md`；拒绝后移入 `DECISIONS.md`。
- 只有真实发布的版本才写入 `CHANGELOG.md`。开发中内容只写入 `CURRENT_STATE.md`。
- 只有重新检查了对应事实，才能更新文档中的 `Last verified`。无法确认时写 `TBD / NEEDS CONFIRMATION`，不得猜测。
- 如果本次任务发现文档漂移，即使用户没有点名文档，也要在不扩大产品范围的前提下修正；若会与并行工作冲突，则报告冲突而不是覆盖。

## 提交、Push 与发布

- 每次 commit 或 push 前，先按 [`docs/README.md`](docs/README.md) 的更新矩阵同步受影响文档；`AGENTS.md`、`docs/` 中本次应纳入的新增或修改文件也必须显式检查，不能只提交 `src/`。
- 依次检查 `git status --short --branch`、工作树 diff 和 staged diff；只暂存已确认路径，不使用 `git add -A`，不夹带素材、归档、日志或其他任务的修改。
- 代码、构建配置或运行时资源有变化时，push 前运行 `npm.cmd run check`；涉及视觉、触控、声音、PWA 或发布行为时还要验证真实页面。
- push 后核对目标 remote、branch 与远端 commit；如果该 push 触发 Pages 或用户要求“更新/发布”，等待 workflow 完成，再检查稳定 URL、实际页面行为以及 PWA 缓存/更新状态。
- 普通功能分支 push 不自动产生版本。只有正式发布才更新版本号、发布记录、tag 与 GitHub Release。

- 项目正式进入市场前使用 `0.x.x`：重要功能组增加 minor，小修复或小优化增加 patch。
- 正式发布时保持 `package.json`、`package-lock.json`、`CHANGELOG.md`、Git 标签和 GitHub Release 一致。程序版本写 `0.x.x`，Changelog 与 Release 标题写 `V0.x.x`，Git tag 写 `v0.x.x`。
- `CHANGELOG.md` 只记录真实发布版本，日期使用实际发布日期；开发中内容进入 `docs/CURRENT_STATE.md`，不得提前写成已发布时间线。
- 用户要求上传或更新时，完成后应核对远端 commit、GitHub Pages workflow、稳定 URL、实际页面行为和 PWA 缓存/更新情况，不能只报告本地 commit。
