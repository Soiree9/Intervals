# AI 文档索引与维护规则

这套文档用于让新的 AI 快速获得正确上下文，并由执行任务的 AI 持续维护。它不是聊天记录仓库，也不要求用户在每次修改后手工同步。

## 单一职责

| 文件 | 唯一负责的问题 | 不应包含 |
| --- | --- | --- |
| [`../AGENTS.md`](../AGENTS.md) | AI 如何工作、验证和维护文档 | 产品功能清单、版本流水 |
| [`../README.md`](../README.md) | 当前产品对外能力、开发入口、技术栈和许可入口 | 开发中状态、设计讨论 |
| [`../CHANGELOG.md`](../CHANGELOG.md) | 已发布版本的用户可见变化 | 未发布工作、未来想法 |
| [`PRODUCT.md`](PRODUCT.md) | 产品定位、目标用户、体验原则和反目标 | 文件级架构、版本变化 |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | 模块职责、依赖方向和必须维持的工程边界 | 路线图、临时进度 |
| [`CURRENT_STATE.md`](CURRENT_STATE.md) | 当前已发布基线、开发中工作、验证与阻塞 | 完整历史、未确认脑暴 |
| [`DECISIONS.md`](DECISIONS.md) | 已确认或已拒绝的具体选择、理由和替代关系 | 未讨论的猜想、代码流水 |
| [`IDEAS.md`](IDEAS.md) | 尚未确认的候选想法和待讨论问题 | 已批准任务、已发布功能 |

信息只在负责文件中保存一份；其他文件需要提及时只链接，不重述细节。

## 事实判定

- 用户在当前任务中的明确要求优先级最高。
- “希望产品怎样工作”由 `PRODUCT.md` 和 `DECISIONS.md` 中仍为 `Accepted` 的决定说明。
- “代码现在怎样工作”必须由当前源码、测试和实际运行证据确认；文档摘要不能替代验证。
- “什么已经发布”必须由版本文件、提交/标签、部署流程和实际站点证据确认；本地跟踪分支可能过期。
- `CURRENT_STATE.md` 是可重写的导航快照，不是历史档案。
- `IDEAS.md` 没有实现授权；AI 不得因为某项出现在其中就擅自开发。
- 发现来源冲突时不要静默选一个答案。先判断冲突属于产品意图、实现现状还是发布状态；无法消解时标记 `NEEDS CONFIRMATION` 并告诉用户。

## 任务到文档的更新矩阵

| 任务变化 | 必须检查/更新 |
| --- | --- |
| 用户新增长期产品偏好或反感 | `PRODUCT.md`；若是具体取舍，再更新 `DECISIONS.md` |
| 新功能开始、完成、暂停或阻塞 | `CURRENT_STATE.md` |
| 产品定位、目标用户或核心学习流程变化 | `PRODUCT.md` |
| 模块职责、依赖方向或共享规则变化 | `ARCHITECTURE.md`；有取舍时同步 `DECISIONS.md` |
| 未确认的功能构想 | `IDEAS.md` |
| 候选想法被确认或拒绝 | 从 `IDEAS.md` 移除；确认项进入 `CURRENT_STATE.md`，长期取舍进入 `DECISIONS.md` |
| 对外能力发生变化 | `README.md`；尚未发布时同时标明开发状态，不提前写入 `CHANGELOG.md` |
| 正式发布 | 版本文件、`CHANGELOG.md`、`CURRENT_STATE.md`；必要时更新 `README.md` |
| 验证结果或部署状态变化 | `CURRENT_STATE.md`；发布记录只写已经发生且证据明确的结果 |
| AI 工作流程或文档职责变化 | `AGENTS.md` 或本文件，避免两处重复规则 |

## 改写规则

- `README.md`、`PRODUCT.md`、`ARCHITECTURE.md` 和 `CURRENT_STATE.md` 表达当前事实：直接覆盖过时段落。
- `DECISIONS.md` 保存重要选择的来龙去脉：新决定新增编号；被替代的决定改成 `Superseded` 并指向新编号，不保留两个同时生效的说法。
- `IDEAS.md` 只保留未决事项：确认、拒绝或失效后移出。
- `CHANGELOG.md` 按已发布版本追加，不重写已经发布的事实；事实错误修正除外。
- 不为“显得有记录”而写文档。若一次内部重构没有改变任何文档负责的事实，在任务结尾确认“无需更新”即可。

## 建议阅读顺序

- 任何任务：`AGENTS.md` → 本文件。
- 产品或交互任务：再读 `PRODUCT.md`、`DECISIONS.md`、`CURRENT_STATE.md`。
- 代码实现或重构：再读 `ARCHITECTURE.md`、`DECISIONS.md`、`CURRENT_STATE.md`。
- 规划新功能：再读 `PRODUCT.md`、`IDEAS.md`、`DECISIONS.md`、`CURRENT_STATE.md`。
- 发布：再读 `README.md`、`CHANGELOG.md`、`CURRENT_STATE.md` 及 workflow/版本文件。
