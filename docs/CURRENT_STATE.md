# 当前状态

Last inspected: 2026-08-25

本文件是可重写快照。它只说明当前仓库与开发工作的状态，不代替 [`../CHANGELOG.md`](../CHANGELOG.md) 的发布历史。

## 已记录的发布基线

- `package.json` 当前版本：`0.8.0`。
- `CHANGELOG.md` 最新条目：`V0.8.0`，音程教学反馈、音乐符号与即时试听。
- V0.8.0 代码与标签提交：`adb8c0896234934225232e2bf7819e9a5f2fe8a4`。
- 正式标签：`v0.8.0`；GitHub Release：[`V0.8.0：音程教学反馈、音乐符号与即时试听`](https://github.com/Soiree9/Intervals/releases/tag/v0.8.0)，已标记为 Latest。
- GitHub Pages workflow [`32830283356`](https://github.com/Soiree9/Intervals/actions/runs/32830283356) 已成功；稳定网址 [`https://soiree9.github.io/Intervals/`](https://soiree9.github.io/Intervals/) 已实际打开验证。

对外功能清单见 [`../README.md`](../README.md)。

## 用户 V1–V6 需求批次索引

2026-08-25，用户提供了早期 V1–V6 个人需求摘录。这里的 `V1–V6` 是需求整理批次，不等同于 `package.json` 的软件版本号。已实现细节继续只由 `CHANGELOG.md` 保存，本表只负责状态导航：

| 用户批次 | 当前归类 | 唯一详细记录 |
| --- | --- | --- |
| V1 | 已实现；后续版本又继续完善唱名、反馈与试听 | `CHANGELOG.md` 的 `V0.1.0`、`V0.6.x`、`V0.7.0` |
| V2 | 已实现 | `CHANGELOG.md` 的 `V0.2.0` |
| V3 | 已实现 | `CHANGELOG.md` 的 `V0.2.1` |
| V4 | 已实现 | `CHANGELOG.md` 的 `V0.3.0` |
| V5 已明确实施部分 | 已实现：和弦层级、Spread Triad、双音源、图标与实用音程范围等 | `CHANGELOG.md` 的 `V0.4.0`–`V0.6.1` |
| V5 未来构想 | 尚未批准实施 | `IDEAS.md` 的 I-001–I-003 |
| V6 构想 | 尚未批准实施；用户明确表示不一定会做 | `IDEAS.md` 的 I-004 |

这张表不得扩写成第二份 CHANGELOG。若将来确认某个候选，只改变状态和链接，功能细节进入其唯一负责文件。

## 开发中

当前分支：`main`。

V0.8.0 的源码、测试、`AGENTS.md`、`docs/`、版本号与时间线均已进入 Git，并完成远端、Pages 与 Release 验证。当前没有已批准但尚未发布的功能；后续 AI 仍需重新运行 `git status` 并检查实际 diff，不能只依赖本快照。

## 验证状态

- 2026-08-25，使用 Node `v24.15.0`、npm `11.12.1` 完成干净 `npm.cmd ci`；随后 `npm.cmd run check` 通过 lint、17 个测试文件共 132 项测试，以及 TypeScript/Vite/PWA 生产构建。
- 已在真实本地页面检查桌面与窄屏布局、和弦根音升降号、`F♯ - A - C` 音名间距、`♭3 - ♭5 - R` 成员标记，以及五线谱指针按下播放路径。
- 首次 workflow [`32829232513`](https://github.com/Soiree9/Intervals/actions/runs/32829232513) 暴露锁文件版本字段不一致；修正 `dom-accessibility-api` 的锁文件版本后，本地干净安装与 workflow `32830283356` 均通过。
- 稳定网址已加载本次生产资源 `index-CUVxECrG.js` 与 `index-BMpSV_jp.css`；首页、和弦入口和三和弦设置页均在真实线上页面打开，标准升降号显示正常。
- 远端 `main`、`v0.8.0` 标签、Latest Release 与 GitHub Pages 均已核对，不再属于“仅本地完成”。

## 已确认的下一步

除当前并行开发工作外，没有从用户获得新的已批准功能。不要从 [`IDEAS.md`](IDEAS.md) 或 AI 推测中自行扩展范围。

## 下次改写条件

- 开发中工作完成、暂停、被放弃或换分支时，直接重写“开发中”和“验证状态”。
- 正式发布后，更新发布基线并把完成内容从这里移除；历史细节只进入 `CHANGELOG.md`。
- 只有实际访问并验证远端/Pages 后，才能写“已在线发布”。
