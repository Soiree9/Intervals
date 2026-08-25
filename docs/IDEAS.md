# 候选想法

本文件只保存用户提出但尚未确认是否要做的想法。它不是路线图，也不授权 AI 实现任何功能。

## 当前候选

以下条目来自用户 2026-08-25 提供的 V5/V6 个人需求摘录，均未批准实施。

## I-001 调式与五声音阶练习

- Status: Candidate
- Proposed: 2026-08-25（源自用户 V5 构想）
- User intent: 在现有大调练习旁增加 Dorian、Mixolydian、Aeolian、Lydian、Phrygian、Locrian 和五声音阶，继续考察音名与音级之间的双向联系。
- Existing foundation: 当前代码只有 Ionian（大调）定义和未来分类接口，不代表其他调式功能已经实现。
- Why it may help: 把调式结构、特征音与实际听觉联系起来，而不是只背音阶名称。
- Needs confirmation: 第一阶段包含哪些调式；五声音阶指大调、小调还是两者；是否同时练唱名、特征音、和弦与进行；调中心和五度圈怎样选择；每种题型的具体输入与反馈。
- Likely areas: `domain/catalogs`、乐理与题目生成、谱面、调模块导航和播放编排。

## I-002 无版权负担的地方歌曲与民谣旋律训练

- Status: Candidate
- Proposed: 2026-08-25（源自用户 V5 构想）
- User intent: 用知名地方歌曲或民谣进行旋律听写和学习，可能直接使用真实歌曲片段而不是 MIDI；用户举“斯卡布罗集市”与 Dorian 听感关联为例。
- Why it may help: 通过熟悉、富有音乐性的材料认识调式和旋律现象。
- Needs confirmation: 训练是听写、跟唱、分析还是分级学习；曲目范围；每段长度；是否必须离线；曲目本身与具体录音/演奏版本的授权如何分别确认；若真实录音不可用，是否接受项目自行录制或采样乐器重奏。
- Likely areas: 内容目录、音频资产与许可、缓存体积、播放器、题目和学习反馈。

## I-003 大调、小调与调式借用和弦进行库

- Status: Candidate
- Proposed: 2026-08-25（源自用户 V5 构想）
- User intent: 将和弦进行扩展为大调、小调和调式借用分类；先整理常见经典现象，例如四级大转小和“辉煌终止”，以后随着用户学习继续积累。用户可以选择试听，并把选中的进行混入测验。
- Existing foundation: 当前实现只有 9 个大调进行；类型层预留了 `minor` 与 `modal-borrowing` 分类，但没有相应内容或 UI。
- Why it may help: 让用户从“听过这种进行”走到“能识别、命名并解释这种现象”。
- Needs confirmation: “辉煌终止”的精确和声公式；第一批进行清单与来源；小调采用哪种音阶/和声语境；用户如何选择、收藏或追加；音名与级数两种答题方向是否都保留；不同 Voicing/音色怎样组合。
- Likely areas: `domain/catalogs`、和弦构造与题目生成、设置与存储、进行播放、谱面和内容维护流程。

## I-004 带风格的和弦进行伴奏播放器

- Status: Candidate
- Confidence: Low（用户明确表示“不一定会做”）
- Proposed: 2026-08-25（用户原文标作 V6，明确表示“不一定会做”；不是软件版本号）
- User intent: 可能加入 shuffle、jazz swing、bossa nova、Latin、R&B、流行等伴奏，同时显示类似功能谱的和弦进行。
- Product fit condition: 只有当它能形成“理论/常见现象 → 听觉识别 → 用户能够说出”的训练闭环，并与 iReal 等成熟伴奏工具形成明确差异时才值得推进；不以复制通用伴奏播放器为目标。
- Needs confirmation: 具体训练任务和差异价值；只播放预设还是允许编辑；节奏与伴奏如何生成；移动端音频性能；离线资源体积；风格素材与录音版权；是否会挤压核心听辨练习的导航层级。
- Likely areas: 新的节奏/伴奏引擎、进行播放器、功能和声显示、音频调度、内容与许可。

## 维护规则

- 只有用户明确表达“可能想做、以后考虑、先记下来”时才新增。
- 每项都写明提出日期、用户原意、待确认问题和影响范围；不知道的内容写 `TBD / NEEDS CONFIRMATION`。
- 在候选进入实现前，AI 应围绕会改变产品方向的关键问题向用户确认；不得因为“为未来预留”就先增加无人使用的接口或框架。
- 用户批准后，从本文件移除：即将或正在实施的工作写入 `CURRENT_STATE.md`，形成长期取舍时同时写入 `DECISIONS.md`。
- 用户拒绝后，从本文件移除，并在确有长期价值时把拒绝理由写入 `DECISIONS.md`。
- 已发布功能不留在这里，发布历史属于 `CHANGELOG.md`。

## 条目模板

```md
## I-XXX 简短名称

- Status: Candidate
- Proposed: YYYY-MM-DD
- User intent: 用户实际表达，不扩写成承诺
- Why it may help: 已知价值
- Needs confirmation: 尚未决定的问题
- Likely areas: 可能受影响的模块；不等于实现方案
```
