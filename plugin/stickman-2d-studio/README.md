# Stickman 2D Studio (`stickman-2d-studio`)

适用于 **Google Antigravity 2.0 + Gemini 4 Carbon + HyperFrames** 的原生 2D 真矢量火柴人科普与脑洞短片制作插件。

## 安装方式
1. **工作区自动加载（推荐）**：将 `stickman-2d-studio` 文件夹放入任意项目根目录的 `.agents/plugins/stickman-2d-studio/`，Antigravity 会自动发现并激活全部规则与技能。
2. **全局加载**：放入 `~/.gemini/config/plugins/stickman-2d-studio/`，即可在所有项目中随时调用。

## 内置核心组件
- **`rules/AGENTS.md`**：6 条真矢量火柴人制作门禁（零位图糊边、离屏 Alpha 遮罩轮廓光、多平面前景遮挡、44.1kHz 波形锁相、16 宫格联系表自检）。
- **`skills/stickman-story-lock`**：交互式 6 问选题向导 + `STORY LOCK × FACT BANK` 剧本锁定引擎。
- **`skills/make-stickman-video`**：8 步全自动真矢量动画管线，附带 5 大内置主题色板（`themes.js`）、IK 骨骼与精细载具库（`engine_rig.js`）、多平面视差场景引擎（`engine_worlds.js`）及 44.1kHz 声学锁相混音器（`acoustic_sync.py`）。
