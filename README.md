# NEON ARCADE · 霓虹像素电玩

为 **DeepSeek Harness 桌面端**提供霓虹像素主题、街机背景与可参与的像素空战。已在 **Windows / Harness 0.2.1-rc.2** 验证；独立 Web 客户端不会启用此主题。

深紫黑底色、电光青与品红描边、原创像素精灵、星空、城市剪影和像素鲸鱼。正文、中文、代码与终端保留原有字体。支持深浅色外观，所有装饰均可关闭。

![桌面主题预览](docs/screenshots/theme.png)

*主题预览来自桌面端；空战预览来自使用同一插件构建的离屏测试画布。*

## 安装

1. 在本仓库的 [Releases](https://github.com/Time-233/dsh-theme-neon-arcade/releases/latest) 页面下载 **[`dsh-theme-neon-arcade.tgz`](https://github.com/Time-233/dsh-theme-neon-arcade/releases/latest/download/dsh-theme-neon-arcade.tgz)**。使用预构建插件包，不需要自行构建或安装 Node.js。
2. 在 **DeepSeek Harness 桌面端 → 插件 → 添加插件** 中填入下载文件的**完整绝对路径**，安装后启用。例如 Windows 下载目录中的 `C:\Users\你的用户名\Downloads\dsh-theme-neon-arcade.tgz`。
3. 若应用提示刷新，点击「刷新页面」。在「更多 → 设置 → 通用设置 → NEON ARCADE」调整效果。

也可下载源码 ZIP，完整解压后用同一入口安装包含 `package.json` 的目录。仓库包含已构建的 `client.js`；安装时不需要构建脚本，也没有外部运行依赖。

升级时在插件管理中安装新版包。偏好设置保存在当前客户端中，升级保留原有开关。禁用或卸载后撤销主题覆盖、样式、插槽、游戏画布和事件监听。

## 使用

| 功能 | 操作与行为 |
| --- | --- |
| 主题总开关 | 左下角 `NEON ARCADE` / `NEON / OFF` 按钮，或通用设置中的主题开关。 |
| 辉光 / 网格 / 像素点缀 | 通用设置中的独立开关。像素精灵集中于画布四周，实际聊天时自动淡化。 |
| CRT 扫描线 | 默认关闭；开启后为一条低亮度灰蓝细线，约 18 秒从上向下循环，不平铺密集横纹。 |
| 像素空战背景 | 默认关闭；开启后我方自动巡航和双发射击，敌机持续生成并射击，子弹有碰撞判定。 |
| 参与游戏 | 开启空战后，点击画布右上角「参与游戏」，按住鼠标左键拖动战机。松开后停留并继续自动射击。 |
| 退出参与 | 点击「退出参与」或按 Esc，恢复聊天焦点和自动巡航。关闭游戏立即恢复原背景。 |

我方中弹约 0.85 秒后复活，次数无限，并获得短暂无敌。参与期间画布临时作为游戏操作区；切换会话、离开游戏焦点、隐藏窗口会退出参与。参与状态不跨会话保存，观赏状态不接管鼠标和键盘。

![参与像素空战](docs/screenshots/air-battle.png)

## 兼容性与实现

- 已验证：Windows 桌面端 **0.2.1-rc.2**。尚未验证其他系统和其他 Harness 版本。
- 使用原生 `dsh.bundle` / Cordis 声明、`theme.overrideTokens()` 与界面插槽；不修改应用安装文件。
- `dsh.client.platform: web` 是桌面内嵌渲染器使用的清单格式。运行时检查 `shortcuts.runtime === 'desktop'`，独立 Web 客户端直接退出。
- 基础配色提供 105 个深浅色语义参数。局部框架装饰适配了当前 Harness 的样式类名；应用更新若改变这些类名，部分装饰可能需要适配。
- 原创战机、子弹、星空及爆散由代码绘制，不使用其他游戏的图片、音效或素材。无声音、排行榜或联网功能。
- 游戏按 30 帧目标绘制，对敌机、子弹、粒子设定数量上限。窗口隐藏时暂停；关闭游戏或主题后释放动画帧、观察器和监听。
- 字体与画面内嵌，可离线使用。不读取会话文本，不注册模型工具或全局键鼠监听。

## 开发与检查

需要 Node.js 22 或更高版本，无需安装第三方依赖：

```sh
npm run build
npm test
npm run check
npm run release:pack
```

`release:pack` 在 `dist/` 生成固定名称的预构建 `.tgz` 和 `SHA256SUMS.txt`。构建可重复；仓库同时提交源文件和 `client.js`。`npm pack` 前会重新构建，普通安装没有构建钩子。

测试覆盖 Web 隔离、启停清理、偏好迁移、基础文字对比度、持续交火、碰撞、无限复活、实体上限、尺寸适配、拖动控制和参与状态清理。包检查还会校验实际打包清单、许可证与内嵌构建的一致性。

主要源文件：`src/client.js`（原生插槽与设置）、`src/theme.css`（界面样式）、`src/palette.mjs`（配色）、`src/arcade-art.mjs`（SVG 场景）、`src/air-battle.mjs`（游戏与拖动逻辑）。

发布与收录流程见 [docs/RELEASING.md](docs/RELEASING.md)，版本变化见 [CHANGELOG.md](CHANGELOG.md)。

## English

NEON ARCADE is a neon pixel theme for **DeepSeek Harness desktop**, tested on Windows with Harness **0.2.1-rc.2**. It offers dark/light palettes, original pixel scenery, optional glow/grid, a subtle single CRT scan line, and an optional air-battle background.

Download **`dsh-theme-neon-arcade.tgz`** from [Releases](https://github.com/Time-233/dsh-theme-neon-arcade/releases/latest). In the desktop app, open **Plugins → Add plugin**, enter the downloaded file's absolute path, then install and enable it. The package is prebuilt and has no external runtime dependencies. Configure it under **Settings → General → NEON ARCADE**.

Enable the air-battle background and click **参与游戏** (Join game). Hold the left mouse button and drag to move your plane; firing is automatic and respawns are unlimited. Click **退出参与** (Leave game) or press Esc to return to chat and autopilot. Turning the game off restores the original scene. The standalone Web client is untouched.

## 许可 / License

代码使用 [MIT](LICENSE) 许可。Silkscreen 字体来自 [Google Fonts 官方仓库](https://github.com/google/fonts/tree/main/ofl/silkscreen)，由 The Silkscreen Project Authors 提供，使用 [SIL Open Font License 1.1](assets/Silkscreen-OFL.txt)；字体文件未修改。
