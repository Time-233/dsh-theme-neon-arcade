NEON ARCADE 1.5.1：新增公开版「霓虹切水果」，保留像素空战与愤怒的小猪。切水果采用较慢的随机批次，炸弹触发完整失败流程。

- 按住鼠标左键滑动切割，青白色像素刀光短暂保留；悬停和单击不切割。
- 六种水果与醒目的炸弹从底部随机抛出。每波间隔约 2.6～3.8 秒，随机 1～4 个总数，炸弹计入数量。
- 水果切中立即碎成对应颜色的像素粒子；炸弹拥有更大的弹体、亮橙色警示框、引线、感叹号和 BOMB 标记。
- 炸弹切中后爆散并停止出水果，整个应用界面剧烈晃动，白屏闪烁两次，然后显示 YOU LOSE。场上水果仍会粉碎成粒子；点击「再来一局」才开始新一局。
- 仅霓虹像素风格，没有昼夜按钮。原像素空战和愤怒的小猪仍可通过游戏选择切换。
- 点击「参与游戏」后才接管画布输入；Esc 退出，关闭游戏恢复原背景。隐藏、切换、禁用与卸载会清理刀光、鼠标捕获、闪屏层和动画资源。

原主题兼容范围为 Windows / Harness 0.2.1-rc.1～0.2.1-rc.5，依据作者此前确认的实际验证结果。新增游戏通过自动测试和实际构建的离屏 Chromium 交互验证，未控制用户桌面鼠标键盘。

从本 Release 下载 dsh-theme-neon-arcade.tgz 或 dsh-theme-neon-arcade-1.5.1.tgz，在桌面端「插件 → 添加插件」填写文件绝对路径安装。入口：「更多 → 设置 → 通用设置 → NEON ARCADE → 启用小游戏背景 → 游戏选择 → 霓虹切水果」。

Adds Neon Fruit Slicer alongside air battle and Angry Pigs. Fruit waves toss 1–4 total objects every 2.6–3.8 seconds. A bomb hit stops the round, shakes the whole interface and flashes full white exactly twice before showing YOU LOSE with a restart button. This game has no day/night switch. All games require explicit participation; Esc returns to chat.
