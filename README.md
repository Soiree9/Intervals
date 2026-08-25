# 音程、和弦与调训练

一套面向 Windows 与 Android 的响应式 PWA，用五线谱、音名拼写、钢琴与古典吉他音频练习：

- 二度至七度的完整音程判断
- 大、小、减三和弦的 Closed 原位与转位音名填空
- `R–5–3、3–R–5、5–3–R` 三种 Spread Triad 音名填空
- 独立的三音·五音测验
- 大七、小七、属七和弦的 Drop 2 与 Shell Chord 排列听辨
- 三和弦或七和弦 Voicing 的调内和弦进行练习
- 调内练习使用标准调号、临时升降号、拍号和小节线记谱
- 一般和弦标记与爵士和弦标记切换
- 十题练习、本地成绩和分类错题复习
- 顶栏一键切换 Salamander 钢琴与 Yamaha 古典吉他，选择跨会话保存
- 所有回答支持电脑键盘输入、方向键与 Tab 移动，完整填空可按 Enter 提交
- 所有实际练习五线谱都可点击或触控单个谱头，播放对应真实音高
- 非谱面音乐符号使用 Bravura / SMuFL 标准字形排版
- 安装后完整离线使用

各版本的主要变化见 [版本记录](CHANGELOG.md)。GitHub 上也会通过 Releases 保留逐版时间线。

## 本地开发

```powershell
npm.cmd install
npm.cmd run dev
```

生产检查：

```powershell
npm.cmd run check
```

如修改了 `public/favicon.svg`，使用 `npm.cmd run generate:icons` 重新生成 PWA 图标。

项目通过 `vite.config.ts` 使用 `/Intervals/` 作为 GitHub Pages 基路径。本地开发地址由 Vite 输出。

## 技术栈

- React + TypeScript + Vite
- VexFlow 5（SVG 五线谱）
- Tone.js（钢琴、古典吉他采样与音频调度）
- vite-plugin-pwa / Workbox（安装与离线缓存）
- Vitest + Testing Library（自动化测试）

## 音源许可

- 钢琴采样来自 Alexander Holm 的 Salamander Grand Piano V3，采用 CC BY 3.0 许可；本项目从原始 48 kHz / 24-bit 第 10 力度层转换所需锚点。
- 古典吉他采样来自 Freesound 用户 Quartertone 的 Yamaha Classical Guitar，并使用 Tone.js Instruments 的整理版，采用 CC BY 3.0 许可。
- Bravura 音乐字体由 Steinberg Media Technologies GmbH 发布，采用 SIL Open Font License 1.1。

来源链接、转换说明、归档校验值和打包文件清单见 [`public/audio/ATTRIBUTION.md`](public/audio/ATTRIBUTION.md)。
