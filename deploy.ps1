# X-UI 部署脚本 (PowerShell)
# 用于将构建产物上传到服务器

$ErrorActionPreference = "Stop"

# 服务器配置
$SERVER_IP = "38.129.137.24"
$SERVER_PORT = "53211"
$SERVER_USER = "straiumx"
$SERVER_PASS = 'X4(Ld^*j[kmv'
$REMOTE_PATH = "/home/straiumx/domains/straium.xyz/public_html/update"

Write-Host "======================================" -ForegroundColor Green
Write-Host "  X-UI 部署脚本" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# 检查 release 目录
if (-not (Test-Path "release")) {
    Write-Host "错误: release 目录不存在，请先运行构建" -ForegroundColor Red
    exit 1
}

Write-Host "目标服务器: $SERVER_USER@$SERVER_IP:$SERVER_PORT" -ForegroundColor Yellow
Write-Host "远程路径: $REMOTE_PATH" -ForegroundColor Yellow
Write-Host ""

# 需要上传的文件
$files = @(
    "release/x-ui-linux-amd64.tar.gz",
    "release/x-ui-linux-arm64.tar.gz",
    "release/install.sh",
    "release/x-ui.sh"
)

Write-Host "准备上传以下文件:" -ForegroundColor Cyan
foreach ($file in $files) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length / 1MB
        Write-Host "  - $file ($([math]::Round($size, 2)) MB)" -ForegroundColor White
    } else {
        Write-Host "  - $file (不存在)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "请使用以下命令手动上传 (需要安装 scp 或使用 WinSCP):" -ForegroundColor Yellow
Write-Host ""
Write-Host "# 使用 scp 上传:" -ForegroundColor Cyan
Write-Host "scp -P $SERVER_PORT release/*.tar.gz release/*.sh ${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/"
Write-Host ""
Write-Host "# 或使用 sftp:" -ForegroundColor Cyan
Write-Host "sftp -P $SERVER_PORT ${SERVER_USER}@${SERVER_IP}"
Write-Host "cd $REMOTE_PATH"
Write-Host "put release/*.tar.gz"
Write-Host "put release/*.sh"
Write-Host ""

# 生成一键安装命令
Write-Host "======================================" -ForegroundColor Green
Write-Host "  一键安装命令" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "用户可以使用以下命令一键安装:" -ForegroundColor Cyan
Write-Host ""
Write-Host 'bash <(curl -Ls https://straium.xyz/update/install.sh)' -ForegroundColor White
Write-Host ""
Write-Host "或:" -ForegroundColor Cyan
Write-Host ""
Write-Host "wget -O install.sh https://straium.xyz/update/install.sh && bash install.sh" -ForegroundColor White
Write-Host ""
