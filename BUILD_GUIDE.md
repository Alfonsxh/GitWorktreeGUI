# Git Worktree GUI 打包流程指南

## 环境准备

### 1. 代理配置（可选，用于加速下载）
```bash
export HTTP_PROXY=http://127.0.0.1:1097
export HTTPS_PROXY=http://127.0.0.1:1097
```

### 2. Electron 镜像配置（推荐，避免下载失败）
```bash
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
```

## 完整打包流程

### 步骤 1: 清理环境
```bash
# 清理旧的依赖和构建文件
rm -rf node_modules package-lock.json dist/
```

### 步骤 2: 安装依赖
```bash
# 使用代理和镜像安装
export HTTP_PROXY=http://127.0.0.1:1097 \
       HTTPS_PROXY=http://127.0.0.1:1097 \
       ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ && \
npm install
```

### 步骤 3: 重建原生模块
```bash
# 确保 node-pty 等原生模块与 Electron 版本兼容
npx electron-rebuild
```

### 步骤 4: 构建项目
```bash
# 开发版本
npm run build

# 生产版本
npm run build:prod
```

### 步骤 5: 本地测试
```bash
# 测试构建结果
npm start
```

### 步骤 6: 打包发布版本

#### macOS
```bash
npm run dist:mac
# 输出: release/Git Worktree Manager-1.0.0.dmg
```

#### Windows
```bash
npm run dist:win
# 输出: release/Git Worktree Manager Setup 1.0.0.exe
```

#### Linux
```bash
npm run dist:linux
# 输出: release/*.AppImage, *.deb, *.rpm
```

## 常见问题解决

### 1. Electron 下载失败
**错误**: `RequestError: socket hang up`

**解决方案**:
```bash
# 使用中国镜像
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
# 或使用代理
export HTTP_PROXY=http://127.0.0.1:1097
```

### 2. node-pty 编译错误
**错误**: `NODE_MODULE_VERSION 137. This version of Node.js requires NODE_MODULE_VERSION 123`

**解决方案**:
```bash
# 重建原生模块
npx electron-rebuild
```

### 3. 手动安装 Electron
如果自动安装失败，可以手动触发安装：
```bash
cd node_modules/electron
node install.js
```

### 4. 清理无关依赖
```bash
# 检查无关包
npm ls --depth=0 | grep -E "extraneous|UNMET"

# 完全重装
rm -rf node_modules package-lock.json
npm install
```

## 打包配置说明

### package.json 中的构建配置
- `appId`: com.alfons.gitworktreegui
- `productName`: Git Worktree Manager
- `output`: release/

### 支持的平台
- macOS: DMG 安装包，包含代码签名配置
- Windows: NSIS 安装程序
- Linux: AppImage, DEB, RPM 包

## 快速打包脚本

创建一个 `build.sh` 脚本：
```bash
#!/bin/bash

# 设置环境变量
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

# 清理
echo "Cleaning..."
rm -rf node_modules package-lock.json dist/ release/

# 安装依赖
echo "Installing dependencies..."
npm install

# 重建原生模块
echo "Rebuilding native modules..."
npx electron-rebuild

# 构建
echo "Building..."
npm run build:prod

# 测试
echo "Testing..."
npm start &
sleep 5
pkill -f electron

# 打包
echo "Packaging..."
npm run dist

echo "Build complete! Check the release/ directory."
```

## 版本发布检查清单

- [ ] 更新 package.json 中的版本号
- [ ] 更新 README.md 中的版本信息
- [ ] 运行完整测试流程
- [ ] 清理开发依赖
- [ ] 构建生产版本
- [ ] 测试打包后的应用
- [ ] 创建 Git tag
- [ ] 上传到 GitHub Releases

## 注意事项

1. **首次打包**需要下载 Electron 二进制文件，建议使用镜像或代理
2. **原生模块**必须使用 electron-rebuild 重建
3. **生产构建**使用 `npm run build:prod` 而不是 `npm run build`
4. **测试打包结果**在发布前务必测试实际的安装包

---

最后更新: 2025-01-17