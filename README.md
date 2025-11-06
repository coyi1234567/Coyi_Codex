# 星云探险队（Nebula Expedition）

面向移动端的 H5 休闲经营小游戏，可作为商业化项目的起点。项目提供可直接部署的静态资源，内置 PWA 支持、营销活动配置示例、玩家档案持久化、作战手册弹窗，以及团队协作说明。

## ✨ 主要特性

- **轻量运行**：纯前端实现，任何静态空间或 CDN 即可部署，可适配移动浏览器与微信内置浏览器。
- **核心玩法**：点击收集能源、躲避危险、阶段提升、加速器冷却。
- **玩家档案**：首登引导昵称与触觉反馈偏好，自动记录最佳分数与历史场次。
- **商业化预留**：广告位占位、分享拉新、会员月卡示例、埋点接口。
- **PWA 支持**：支持离线缓存、主屏安装提示。
- **团队协作**：面向产品经理、设计、插画、测试、运营等角色的模块化说明与运营手册。
- **评审闭环**：内置版本评审看板与 QA 实验室，记录多角色意见与自测结果。
- **商业化指标面板**：读取 `config/metrics.json`，展示会员转化、广告 ARPU、漏斗转化，并支持 Markdown 周报导出。
- **主题与多语言**：`data-theme` 三套主题（夜航/晨曦/庆典）与中英双语切换，面向品牌演示与出海场景。
- **自动化校验**：活动与 i18n 校验脚本、QA 验收 JSON 导出、CI 命令 `npm run test` / `npm run ci`，保障上线质量。

## 🧩 代码结构

```
.
├── index.html             # 页面结构、角色说明、增长建议、分析面板
├── styles.css             # 主题样式（支持变量调整、节日皮肤）
├── script.js              # 游戏逻辑、玩家档案、活动 Banner、指标面板、校验逻辑
├── manifest.json          # PWA 清单
├── sw.js                  # Service Worker，提供离线支持
├── assets/
│   └── logo.svg           # 可由插画师替换的品牌图标
├── config/
│   ├── campaigns.json     # 运营活动配置示例（含多语言与 next step）
│   ├── metrics.json       # 商业化指标、漏斗、实验与营收模拟数据
│   ├── reviews.json       # 多角色评审记录示例
│   └── i18n.json          # 中英翻译字典
├── docs/versions/         # 版本专家总结、迭代计划与验收报告
└── tools/                 # 构建/服务/导出/校验脚本
```

## 🛠️ 快速开始

```bash
npm install
npm run dev
```

默认使用自带的 Node 静态服务器（`tools/serve.mjs`）在 `http://localhost:4173` 启动服务，手机与桌面浏览器均可访问。体验过程中可使用控制台的 `window.__nebula.debug()` 查看实时状态。

如需生成可上线版本：

```bash
npm run build   # 输出至 dist/
npm run preview # 本地校验发布包，同样监听 4173 端口
```

构建脚本会复制静态资源并写入 `dist/build.json`，便于持续集成记录构建时间。

如需在本地或 CI 校验配置与翻译，可执行：

```bash
npm run lint    # 快速校验活动配置（文案长度、时间、语言）
npm run test    # 校验活动 + i18n + 指标结构
npm run ci      # 执行校验后构建 dist/
```

> 若以微信/字节等小程序形态投放，可将 `dist/` 目录整体上传，并在游戏中接入平台提供的广告、支付 SDK（可在 `analytics.track` 与 `boostEnergy` 中扩展）。

## 🚀 部署与发布

### Docker 容器

```bash
docker build -t nebula-expedition .
docker run -it --rm -p 8080:80 nebula-expedition
```

随后访问 `http://localhost:8080` 即可验证生产构建。

### GitHub Pages 自动部署

仓库内置 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)，主分支推送后会自动：

1. 安装依赖并执行 `npm run build`；
2. 将 `dist/` 发布到 `gh-pages` 分支；
3. 结合 GitHub Pages 设置，即可生成公网访问链接。

如需改用 Netlify / Vercel / OSS，请直接将 `dist/` 目录上传或配置为构建产物（Build Command: `npm run build`, Publish Directory: `dist`）。

### GitHub + Vercel 自动部署

若希望通过 Vercel 获得自动化预览与正式环境，可按以下步骤完成整个闭环：

1. **在当前环境导出 Git Bundle**：

   ```bash
   npm install
   npm run build
   ./tools/github-export.sh
   ```

   导出脚本会在 `sync-output/` 生成 `coyi-codex.bundle`，包含当前分支的完整 Git 历史。下载该文件至有网络的机器，再继续后续操作。

2. **准备 GitHub 仓库**：你已在 GitHub 创建了空仓库 [`develop-a-commercial-web-game`](https://github.com/coyi1234567/develop-a-commercial-web-game)。在可联网环境将 bundle（以及 `tools/github-import.sh` 脚本）拷贝到某个目录后，可直接使用导入脚本：

   ```bash
   # 确保脚本可执行
   chmod +x tools/github-import.sh
   # 默认会读取当前目录下的 coyi-codex.bundle
   ./tools/github-import.sh /path/to/coyi-codex.bundle
   ```

   该脚本会在同级目录生成 `develop-a-commercial-web-game/` 文件夹、设置远端为 `git@github.com:coyi1234567/develop-a-commercial-web-game.git`，并推送当前分支（默认 `main`）。如需改用 HTTPS 或其它仓库，只需在命令最后追加目标地址：

   ```bash
   ./tools/github-import.sh /path/to/coyi-codex.bundle my-dir https://github.com/coyi1234567/develop-a-commercial-web-game.git
   ```

   若偏好手动操作，可执行：

   ```bash
   git clone /path/to/coyi-codex.bundle develop-a-commercial-web-game
   cd develop-a-commercial-web-game
   git remote add origin git@github.com:coyi1234567/develop-a-commercial-web-game.git
   git push -u origin HEAD:main
   ```

   无论使用脚本或手动方式，都能迅速让主分支同步到你的 GitHub 仓库，方便 Vercel 继续自动化部署。

3. **在 Vercel 导入项目**：访问 [Vercel Dashboard](https://vercel.com/dashboard)，点击 **Add New → Project**，选择刚刚推送的 GitHub 仓库。如果提示授权，授予 Vercel 访问该仓库的权限。

4. **确认构建设置**：Vercel 会自动识别 `package.json`。若没有自动填充，请手动设置：

   - *Framework Preset*: `Other`
   - *Build Command*: `npm run build`
   - *Output Directory*: `dist`

   项目根目录中的 [`vercel.json`](vercel.json) 已声明构建产物目录与单页应用路由，无需额外配置。

5. **首次部署与验证**：点击 **Deploy**，Vercel 会自动执行 `npm install` 与构建流程，并将 `dist/` 上传为静态站点。构建完成后即可获得一个形如 `https://nebula-expedition.vercel.app` 的临时域名。进入链接即可验证是否可在移动端正常游玩。

6. **多版本验证**：后续在 GitHub 推送新 commit，Vercel 会：

   - 为每个 Pull Request 生成 Preview 链接，供产品经理、玩家等角色评审；
   - 自动更新 Production 环境（默认为 `main` 分支），并保留历史构建记录，便于回滚。

7. **自测清单**：部署完成后，按照页面内置的“版本评审看板”“QA 实验室”逐条验证，确认所有角色反馈都已关闭，然后再向老板/运营汇报最终链接。

### 离线发布包打包

如果需要在无法直接推送代码的环境下，快速生成可上传的静态发布包，可使用随附脚本：

```bash
chmod +x tools/package-release.sh
./tools/package-release.sh
```

脚本会自动安装依赖、执行 `npm run build`，并在 `release/` 目录生成带时间戳的 ZIP 文件（例如 `release/startrail-release-20240201T120000Z.zip`）。将该压缩包拷贝到联网机器，解压后即可：

1. 在任意支持静态托管的平台上传整包文件（Vercel、GitHub Pages、自建 Nginx/CDN 等）；
2. 或者与团队成员共享压缩包，由他们在本地运行 `npm run preview` / `npx serve dist` 进行复测；
3. 上传完成后，将生成的公网链接回填到评审看板或团队文档，供所有角色验收。

> ℹ️ 由于当前环境无法直接访问外网或登陆 GitHub/Vercel，上述步骤需要在本地或自己的云端环境执行。完成后即可得到一个可分享的线上地址。

### 当前交付状态说明

- **代码**：此仓库已包含可以直接 `npm run build` 的完整源码，`dist/` 目录即为对外发版资源。
- **GitHub 仓库**：本环境无法直接推送到 `https://github.com/coyi1234567`。现已提供 `./tools/github-export.sh`（导出 bundle）与 `./tools/github-import.sh`（导入并推送到 `https://github.com/coyi1234567/develop-a-commercial-web-game`），只需在有网络的机器运行即可完成同步。
- **线上部署**：由于无法访问外部平台，暂未产生可直接游玩的公网链接。请在具备网络权限的机器上登录 Vercel（或任意静态托管平台），导入刚同步的 GitHub 仓库后即可自动获得线上地址。
- **自测结果**：可通过 `npm run preview` 在本地验证生产包，或使用提供的 Docker 镜像启动服务，确保所有角色反馈闭环再上线。

完成上述动作后，请将生成的 GitHub 仓库地址与 Vercel/Pages 访问链接回填到团队文档中，方便产品经理、老板、玩家等角色继续验收。

## 🧪 测试与调试

- 浏览器控制台执行 `window.__nebula.debug()` 获取实时状态、玩家档案、活动配置。
- 在 `config/campaigns.json` 中维护活动列表（支持开始/结束时间、多语言、运营提醒），前端会自动展示倒计时 Banner 并给出校验告警。
- 核心游戏循环针对移动端进行了减震与性能保护（尊重 `prefers-reduced-motion`，限制并发实体数量）。如需扩展，可迁移至 Canvas/WebGL 或引入物理引擎。
- QA 实验室会将勾选结果保存在本地存储（`nebula-expedition-qa`），点击“重置测试记录”即可重新评估；“记录一次冒烟测试”会同步打点并记录时间；“导出验收报告”会生成 JSON，方便提给缺陷平台。
- `tools/validate-campaigns.mjs`、`tools/run-ci.mjs` 支持离线校验活动、i18n、指标结构，可在 CI 任务或本地预检中复用。

## 📋 评审闭环与自测流程

- `config/reviews.json`：维护每个版本的评审纪要、角色反馈、后续行动，页面会自动渲染版本时间轴与详情。
- 评审看板支持在界面左侧切换版本，右侧展示角色意见及行动项，帮助老板/运营快速对齐最新状态。
- QA 实验室以玩家、产品经理、老板、运营、技术专家、H5 设计师等视角列出关键测试场景，可在发布前逐一勾选并生成完成度。
- 若需接入自动化，可在 CI 中根据 `config/reviews.json` 和 `nebula-expedition-qa` 输出自定义报告或同步至项目管理工具。

## 📄 许可证

本项目以 MIT 许可证开源，可自由修改并用于商业化场景。请保留原作者信息或在产品中致谢。
