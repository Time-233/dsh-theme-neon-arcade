# 发布与收录

## GitHub Release

仓库应公开，并添加 `dsh-plugin`、`deepseek-harness`、`theme`、`pixel-art` 等 topic。源码根目录保留 `package.json`、`cordis.patch.yml` 和已构建 `client.js`。

1. 修改 `package.json` 版本，更新 `CHANGELOG.md` 与 `docs/RELEASE-NOTES.md`。
2. 执行 `npm run build`、`npm test`、`npm run check`、`npm run release:pack`。
3. 提交源码与构建文件，然后创建与包版本一致的 tag，例如 `git tag v1.3.1`，并推送该 tag。
4. `.github/workflows/release.yml` 会重新检查、打包，并发布 GitHub Release。附件包含固定名称 `dsh-theme-neon-arcade.tgz`、带版本文件名的副本及 `SHA256SUMS.txt`。
5. 从公开 Release 下载包，检查哈希与附件列表。固定文件名让 `releases/latest/download/dsh-theme-neon-arcade.tgz` 在后续版本继续有效。

不需要 npm 账号或 npm 发布权限。Release 自动化只使用该仓库的 `GITHUB_TOKEN`，权限为发布所需的 `contents: write`。CI 使用只读权限。

## awesome-dsh-plugin 收录

参考 [官方贡献说明](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)。仓库必须公开、创建满一天，并包含真实可用的插件代码及 `dsh.bundle` manifest。创建满一天是列表收录条件，不影响用户直接下载安装。

向 `awesome-dsh-plugin/awesome-dsh-plugin` 提交 PR 时，只增加对应插件的一个 YAML 文件：`data/plugins/<owner>__<repo>.yml`。不要手工修改该列表自动生成的 README，也不要修改其他插件条目。

对应条目见 [Time-233__dsh-theme-neon-arcade.yml](Time-233__dsh-theme-neon-arcade.yml)，已提交上游 [PR #11021](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/11021)。更新条目时沿用该申请。`screenshots.json` 已在本仓库根目录声明四张预览图；其中小游戏画面来自同一构建的离屏测试画布。

其他发布者可参考以下模板（将 `OWNER` 和 `REPO` 替换为实际信息）：

```yaml
url: https://github.com/OWNER/REPO
name: OWNER/REPO
category: theme
description:
  en: 'A neon pixel theme for DeepSeek Harness desktop with an optional air-battle background and mouse-drag flight controls.'
  zh: 'DeepSeek Harness 桌面端霓虹像素主题，支持可开关的空战背景与鼠标拖动战机。'
icon: https://raw.githubusercontent.com/OWNER/REPO/main/assets/icon-180.png
tarball: https://github.com/OWNER/REPO/releases/latest/download/dsh-theme-neon-arcade.tgz
```

是否收录由上游维护者决定。公开仓库和 Release 的发布不等于已被收录。
