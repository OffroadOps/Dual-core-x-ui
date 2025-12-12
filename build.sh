#!/bin/bash

#======================================================
# X-UI 构建脚本
# 用于编译 Linux amd64/arm64 版本并打包
#======================================================

set -e

VERSION="1.0.0"
APP_NAME="x-ui"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  X-UI 构建脚本 v${VERSION}${NC}"
echo -e "${GREEN}======================================${NC}"

# 清理旧构建
echo -e "${YELLOW}清理旧构建...${NC}"
rm -rf release/
mkdir -p release/

# 构建前端
echo -e "${YELLOW}构建 React 前端...${NC}"
cd web/frontend
if [ -d "node_modules" ]; then
    npm run build
else
    npm install
    npm run build
fi
cd ../..

# 编译 Go 程序
build_binary() {
    local os=$1
    local arch=$2
    local output="release/${APP_NAME}-${os}-${arch}"
    
    echo -e "${YELLOW}编译 ${os}/${arch}...${NC}"
    
    CGO_ENABLED=0 GOOS=${os} GOARCH=${arch} go build -ldflags="-s -w" -o ${output}/${APP_NAME} .
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}编译成功: ${output}/${APP_NAME}${NC}"
    else
        echo -e "${RED}编译失败: ${os}/${arch}${NC}"
        exit 1
    fi
    
    # 复制必要文件
    mkdir -p ${output}/bin
    cp -r web/html ${output}/
    cp -r web/translation ${output}/
    cp x-ui.service ${output}/
    cp x-ui.sh ${output}/
    
    # 打包
    echo -e "${YELLOW}打包 ${os}-${arch}...${NC}"
    cd release
    tar -czvf ${APP_NAME}-${os}-${arch}.tar.gz ${APP_NAME}-${os}-${arch}/
    cd ..
    
    echo -e "${GREEN}打包完成: release/${APP_NAME}-${os}-${arch}.tar.gz${NC}"
}

# 编译 Linux amd64
build_binary "linux" "amd64"

# 编译 Linux arm64
build_binary "linux" "arm64"

# 复制安装脚本
cp install.sh release/
cp x-ui.sh release/

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  构建完成！${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "输出文件:"
ls -la release/*.tar.gz
echo ""
echo "安装脚本: release/install.sh"
echo "管理脚本: release/x-ui.sh"
