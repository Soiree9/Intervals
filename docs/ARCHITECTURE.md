# 架构边界

## 总体依赖方向

```text
React 页面与组件
    ├─ 调用 domain：乐理、题目、会话、谱面数据
    └─ 调用 services：声音、持久化、PWA 更新

services ──依赖──> domain 类型/纯函数
domain   ──不得依赖──> React、Tone.js、VexFlow、DOM、localStorage
```

核心原则是让音乐事实和练习规则脱离具体渲染器与页面存在。组件负责呈现和收集输入，不能成为另一套业务规则来源。

## 模块职责

| 路径 | 负责 | 不负责 |
| --- | --- | --- |
| `src/domain/types.ts` | 音名、音程、和弦、设置、题目和统计等共享类型 | UI 状态、音频对象 |
| `src/domain/music.ts` | 纯乐理计算、拼写、和弦构造、成员与唱名关系 | 随机出题、页面文案 |
| `src/domain/questions.ts` | 题目身份、答案与题目级纯规则 | React 会话状态 |
| `src/domain/generators/` | 按练习种类生成合法题目与覆盖分布 | 渲染和播放 |
| `src/domain/session.ts` | 组合每轮题目、连接去重与覆盖策略 | 本地存储、页面跳转 |
| `src/domain/notation.ts` | 与 VexFlow 无关的谱面规格、调号和临时升降号状态 | SVG/DOM 绘制 |
| `src/domain/smufl.ts` | 谱表字形与文本/和弦字形的语义映射 | 页面字号、间距和视觉布局 |
| `src/domain/catalogs.ts` | 调式与和弦进行等内容目录 | 会话执行 |
| `src/domain/navigation.ts` | 可测试的练习退出目标 | 组件渲染 |
| `src/services/instruments.ts` | 稳定乐器身份、采样包和演奏策略 | 练习题逻辑 |
| `src/services/audio.ts` | Tone.js 初始化、音高触发、计时、扫弦和全局取消 | 决定某类题该播放什么 |
| `src/services/practicePlayback.ts` | 把题目映射为共享音频原语 | 复制底层调度器 |
| `src/services/storage.ts` | 设置、错题、统计、顺序与上题身份的安全读写和迁移 | 乐理计算 |
| `src/services/pwaUpdate.ts` | 注册后、聚焦和恢复可见时的更新检查与刷新提示 | 发布是否成功的判断 |
| `src/components/Staff.tsx` | 使用 VexFlow 渲染谱面及谱面交互层 | 重新计算乐理答案 |
| `src/components/MusicText.tsx`、`ChordSymbol.tsx` | 音名、升降号、成员序列和和弦符号的共享语义渲染 | 推导和弦性质、成员或题目答案 |
| `src/components/ExerciseViews.tsx`、`KeyExercises.tsx` | 各练习的组合展示与输入协议 | 新建一套题目或播放规则 |
| 共享输入/显示组件与 hooks | 音名、和弦符号、键盘、焦点、快捷键的一致行为 | 练习专属业务分叉 |
| `src/App.tsx` | 页面、会话、设置、统计、错题和跨模块编排 | 承载可复用乐理/记谱/音频算法 |

## 必须维持的不变量

### 拼写不是 MIDI 数字

`NoteSpelling`/`PitchSpelling` 中的字母、升降号与八度是音乐事实。比较或验证和弦时应按目标语义规范化拼写；不能只比较未经说明的 MIDI pitch class。

### 非谱面符号不能退回正文拼接

音名、和弦根音、重升重降、`♭3/♭5` 成员和音名序列必须经过共享音乐文字组件。domain 提供语义值，组件选择对应 SMuFL 文本字形和序列结构，CSS 只负责按使用语境调整视觉重心与间距；具体反馈页面不得重新用普通字符拼出近似结果。

### 谱面数据先于渲染器

调号、拍号、小节、事件、临时升降号和高亮信息先在 `domain/notation.ts` 表达，再由 `Staff.tsx` 渲染。新的谱面规则不应直接写进 VexFlow 调用序列。

### 播放必须可取消

新播放开始、切题、退出、重播、切换播放方式/音色和组件卸载时，旧的延迟音符与回调不能继续。新增播放原语必须接入 `stopAudio()`、播放 generation 和计时器清理机制，并补取消测试。

### 题目身份与覆盖分开

相邻去重使用稳定的题目 identity/signature，并跨会话边界保存；一轮题目的覆盖策略独立处理，不能用“全部唯一”替代覆盖与随机规则。

### 存储变更向后兼容

设置键、错题结构或题目身份升级时，保留旧版本迁移。所有写入通过安全封装处理不可用的 `localStorage`，并用真实写入断言防止静默失败。

### 交互协议共用

Enter、空格、方向键、Tab、答案焦点、反馈焦点、触控命中与音名/和弦成员输入应通过共享组件或 hooks 实现。若某个练习表现不同，先判断它是否真的有独立产品理由。

### 资源边界稳定

运行时需要的压缩音源和字体必须被版本控制并可由全新 clone 构建；原始 FLAC、本地归档和临时素材留在 `.local-assets/`、`Drop/` 等忽略路径。替换资源前先证明新资源能运行，不能先删除有效资产。

## 变更落点检查

在写代码前依次判断：

1. 这是乐理事实吗？放入 `domain/music.ts` 或相应纯 domain 模块。
2. 这是题目合法性、身份或覆盖规则吗？放入 `questions`、`generators` 或 `session`。
3. 这是谱面语义吗？放入 `domain/notation.ts`。
4. 这是底层声音与时间行为吗？放入 `services/audio.ts`；题目到声音的映射放入 `practicePlayback.ts`。
5. 这是跨练习输入、焦点或展示规则吗？放入共享组件/hook。
6. 只有纯页面编排与局部布局才留在具体 view 或 `App.tsx`。

如果一次修改跨越这些边界，应先写最小的共享规则和回归测试，再接入页面；不要通过复制现有实现绕过边界。
