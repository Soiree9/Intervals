# 音程、和弦与调训练

一套面向 Windows 与 Android 的响应式 PWA，用五线谱、音名拼写和钢琴音频练习：

- 二度至七度的完整音程判断
- 大、小、减三和弦的原位与转位音名填空
- 根据和弦判断三音或五音
- 大七、小七、属七和弦的 Drop 2 与 Shell Chord 排列听辨
- 三和弦或七和弦 Voicing 的调内和弦进行练习
- 一般和弦标记与爵士和弦标记切换
- 十题练习、本地成绩和分类错题复习
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
- Tone.js（钢琴采样与音频调度）
- vite-plugin-pwa / Workbox（安装与离线缓存）
- Vitest + Testing Library（自动化测试）

## 音源许可

钢琴采样来自 Alexander Holm 的 Salamander Grand Piano V3，采用 CC BY 3.0 许可。完整署名见 `public/audio/ATTRIBUTION.md`。
