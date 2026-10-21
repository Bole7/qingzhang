# 轻账 · 个人记账 Web App

> 纯本地、无后端、隐私优先的个人记账本。所有账单只存在你自己的浏览器里，一行都不会上传到任何服务器。

[![在线使用](https://img.shields.io/badge/在线使用-bole7.github.io%2Fqingzhang-blue)](https://bole7.github.io/qingzhang/)

## ✨ 功能特性

- **收支记账**：收入 / 支出，记录金额、日期、具体时间、备注
- **两级自定义分类**：一级（餐饮 / 交通 / 生活用品…）+ 二级（外卖 / 地铁 / 早餐…），可自由增删改，新建分类自动生成图标
- **月历按日查看**：日历每格显示当日金额，点日期展开该日流水；切换月份时汇总与图表同步跟随
- **分类饼图**：按一级展示占比，点击扇区下钻看二级构成
- **当月总消费**：首页直接看到本月花了多少、结余多少
- **预算与超支提醒**：总预算 + 分类预算，自动继承上月额度，并显示「剩余日均可用」
- **月度趋势**：近 6 个月支出柱状图
- **数据导出**：JSON 完整备份（换手机可恢复）+ CSV（导入 Excel 分析）

## 🛠 技术栈

- 单文件 `index.html`（HTML + CSS + 原生 JS，零构建）
- [Dexie](https://dexie.org/) —— IndexedDB 封装，本地持久化
- [Chart.js](https://www.chartjs.org/) —— 饼图 / 柱状图
- 无后端、无构建步骤、无第三方服务

## 🚀 在线使用

直接打开：**https://bole7.github.io/qingzhang/**

安卓 Chrome 打开后 → 右上角 ⋮ → **添加到主屏幕**，即可像 App 一样随时记账。

## 🔒 数据存储与隐私

- 所有账单存在你手机的 **IndexedDB**，不上传任何服务器
- 用微信打开 / 用另一个浏览器打开，数据彼此**不互通**（每个 App 有独立存储分区）
- **请固定用一个浏览器入口**（推荐 Chrome 加到主屏幕），并**定期导出 JSON 备份**

> ⚠️ 当前版本页面资源需联网加载，**断网时无法进入界面**（数据本身在本地不受影响）。如需彻底离线，见下方「打包为安卓 App」。

## 👨‍💻 开发者

### 本地运行
直接用浏览器打开 `index.html` 即可（或起任意静态服务，如 `npx serve`）。

### 部署到 GitHub Pages
把 `index.html` 推到仓库 `main` 分支根目录，开启 Pages 即从 `https://<用户名>.github.io/<仓库名>/` 可访问。

### 打包为安卓 App（APK）
本项目可用 [Capacitor](https://capacitorjs.com/) 套壳打包成原生 APK：

```bash
# 准备工程（含 www/index.html）
npm install
npx cap add android      # 生成 android/ 原生工程（需本机装 Android Studio + SDK）
npx cap sync             # 把页面同步进原生工程
npx cap open android     # 打开 Android Studio → Build APK
```

打包后数据进入 **App 私有沙盒**，彻底解决「多入口隔离 / 被浏览器清缓存 / 断网进不去」三个问题；现有页面代码一行不用改。

## 📌 注意事项

1. **固定入口**：只用同一个浏览器（推荐 Chrome 加到主屏幕），别混用微信
2. **定期备份**：导出 JSON 是换手机、防误删的唯一保命线
3. **卸载即清空**：应用 / 站点数据随卸载删除，备份优先

## 📄 License

个人使用，无明确开源协议。
