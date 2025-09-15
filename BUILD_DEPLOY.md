# 构建和部署指南

## 本地开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 启动应用
npm start
```

## 构建打包

### 本地打包

```bash
# 构建生产版本
npm run build:prod

# 打包当前平台
npm run dist

# 打包特定平台
npm run dist:mac    # macOS
npm run dist:win    # Windows
npm run dist:linux  # Linux
```

### 生成的文件

- **macOS**: `release/*.dmg`
- **Windows**: `release/*.exe`
- **Linux**: `release/*.AppImage, *.deb, *.rpm`

## CI/CD 流程

### 持续集成 (CI)

每次推送到 `main` 或 `develop` 分支时：
1. 自动在三个平台构建
2. 运行测试
3. 生成构建产物
4. 上传为 GitHub Actions artifacts

### 版本发布

创建版本标签时自动触发：

```bash
# 创建版本标签
git tag v1.0.0
git push origin v1.0.0
```

发布流程：
1. 在三个平台并行构建
2. 生成安装包
3. 自动创建 GitHub Release
4. 上传所有平台的安装包

## 图标配置

### 准备图标

1. 提供一个 1024x1024 的 PNG 图标：`assets/icon.png`
2. 运行图标生成脚本：
   ```bash
   cd assets
   ./icon-generator.sh
   ```

### 图标要求

- **macOS**: `.icns` 格式
- **Windows**: `.ico` 格式
- **Linux**: 多尺寸 PNG

## 配置说明

### package.json 配置

- `build.appId`: 应用唯一标识
- `build.productName`: 应用显示名称
- `build.directories.output`: 打包输出目录
- `build.mac/win/linux`: 各平台特定配置

### GitHub Actions 配置

- `.github/workflows/ci.yml`: 持续集成配置
- `.github/workflows/release.yml`: 版本发布配置

## 注意事项

1. **代码签名**：
   - macOS 需要开发者证书进行签名
   - Windows 可选择代码签名证书
   - CI 中设置 `CSC_IDENTITY_AUTO_DISCOVERY: false` 跳过签名

2. **权限配置**：
   - macOS 使用 `entitlements.mac.plist` 配置权限
   - 确保应用有必要的系统权限

3. **版本管理**：
   - 更新 `package.json` 中的 `version` 字段
   - 使用语义化版本号（如 1.0.0）

4. **环境变量**：
   - `NODE_ENV=production`：生产构建
   - `GH_TOKEN`：GitHub Actions 自动提供

## 故障排除

### 构建失败

1. 检查 Node.js 版本（推荐 20.x）
2. 清理缓存：`rm -rf node_modules dist && npm install`
3. 检查 webpack 配置

### 打包失败

1. 确保 electron-builder 正确安装
2. 检查图标文件是否存在
3. 验证 package.json 中的 build 配置

### CI/CD 问题

1. 检查 GitHub Actions 日志
2. 确保仓库有正确的 secrets 配置
3. 验证工作流文件语法