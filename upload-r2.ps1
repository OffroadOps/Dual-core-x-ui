# X-UI 上传到 Cloudflare R2
# 使用 AWS S3 签名 V4 API

$ErrorActionPreference = "Stop"

# R2 配置
$R2_ACCOUNT_ID = "2aeed64dce6bdd05ea8d83c451fd9825"
$R2_ACCESS_KEY = "90c658721b47c980d8f52c8f7d3c4b9e"
$R2_SECRET_KEY = "eda4475a0c8b46c34efc12429dc6c6fdb524c867277a5d4bb44f4c13f6457246"
$R2_BUCKET = "auto"
$R2_FOLDER = "x-ui"
$DOWNLOAD_URL = "https://down.ipa.gr/x-ui"
$R2_ENDPOINT = "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

Write-Host "======================================" -ForegroundColor Green
Write-Host "  X-UI 上传到 Cloudflare R2" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# AWS Signature V4 签名函数
function Get-HMACSHA256 {
    param([byte[]]$Key, [string]$Message)
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = $Key
    return $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($Message))
}

function Get-SignatureKey {
    param($key, $dateStamp, $regionName, $serviceName)
    $kDate = Get-HMACSHA256 ([Text.Encoding]::UTF8.GetBytes("AWS4$key")) $dateStamp
    $kRegion = Get-HMACSHA256 $kDate $regionName
    $kService = Get-HMACSHA256 $kRegion $serviceName
    $kSigning = Get-HMACSHA256 $kService "aws4_request"
    return $kSigning
}

function Upload-ToR2 {
    param(
        [string]$FilePath,
        [string]$ObjectKey
    )
    
    $fileContent = [System.IO.File]::ReadAllBytes($FilePath)
    $contentHash = [System.BitConverter]::ToString(
        [System.Security.Cryptography.SHA256]::Create().ComputeHash($fileContent)
    ).Replace("-", "").ToLower()
    
    $now = [DateTime]::UtcNow
    $amzDate = $now.ToString("yyyyMMddTHHmmssZ")
    $dateStamp = $now.ToString("yyyyMMdd")
    
    $host_ = "${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    $region = "auto"
    $service = "s3"
    
    # Content-Type
    $contentType = "application/octet-stream"
    if ($ObjectKey.EndsWith(".sh")) { $contentType = "text/x-shellscript" }
    
    # Canonical Request
    $canonicalUri = "/${R2_BUCKET}/${ObjectKey}"
    $canonicalQueryString = ""
    $canonicalHeaders = "content-type:${contentType}`nhost:${host_}`nx-amz-content-sha256:${contentHash}`nx-amz-date:${amzDate}`n"
    $signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date"
    
    $canonicalRequest = "PUT`n${canonicalUri}`n${canonicalQueryString}`n${canonicalHeaders}`n${signedHeaders}`n${contentHash}"
    
    $canonicalRequestHash = [System.BitConverter]::ToString(
        [System.Security.Cryptography.SHA256]::Create().ComputeHash(
            [Text.Encoding]::UTF8.GetBytes($canonicalRequest)
        )
    ).Replace("-", "").ToLower()
    
    # String to Sign
    $algorithm = "AWS4-HMAC-SHA256"
    $credentialScope = "${dateStamp}/${region}/${service}/aws4_request"
    $stringToSign = "${algorithm}`n${amzDate}`n${credentialScope}`n${canonicalRequestHash}"
    
    # Signature
    $signingKey = Get-SignatureKey $R2_SECRET_KEY $dateStamp $region $service
    $signature = [System.BitConverter]::ToString(
        (Get-HMACSHA256 $signingKey $stringToSign)
    ).Replace("-", "").ToLower()
    
    # Authorization Header
    $authorization = "${algorithm} Credential=${R2_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}"
    
    # Upload
    $uri = "${R2_ENDPOINT}/${R2_BUCKET}/${ObjectKey}"
    $headers = @{
        "Authorization" = $authorization
        "x-amz-date" = $amzDate
        "x-amz-content-sha256" = $contentHash
        "Content-Type" = $contentType
    }
    
    try {
        $response = Invoke-WebRequest -Uri $uri -Method PUT -Headers $headers -Body $fileContent -UseBasicParsing
        return $true
    } catch {
        Write-Host "错误: $_" -ForegroundColor Red
        return $false
    }
}

# 脚本所在目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 要上传的文件
$files = @(
    @{ Path = "$scriptDir/release/x-ui-amd64-v10.tar.gz"; Key = "x-ui/x-ui-amd64-v10.tar.gz" },
    @{ Path = "$scriptDir/release/x-ui-amd64-v9.tar.gz"; Key = "x-ui/x-ui-amd64-v9.tar.gz" },
    @{ Path = "$scriptDir/release/x-ui-amd64-v8.tar.gz"; Key = "x-ui/x-ui-amd64-v8.tar.gz" },
    @{ Path = "$scriptDir/release/x-ui-amd64-v7.tar.gz"; Key = "x-ui/x-ui-amd64-v7.tar.gz" },
    @{ Path = "$scriptDir/release/x-ui-amd64-v6.tar.gz"; Key = "x-ui/x-ui-amd64-v6.tar.gz" },
    @{ Path = "$scriptDir/release/x-ui-amd64-v5.tar.gz"; Key = "x-ui/x-ui-amd64-v5.tar.gz" },
    @{ Path = "$scriptDir/release/x-ui-amd64-v4.tar.gz"; Key = "x-ui/x-ui-amd64-v4.tar.gz" },
    @{ Path = "$scriptDir/release/x-ui-amd64-v3.tar.gz"; Key = "x-ui/x-ui-amd64-v3.tar.gz" },
    @{ Path = "$scriptDir/release/x-ui-amd64-new.tar.gz"; Key = "x-ui/x-ui-amd64-new.tar.gz" },
    @{ Path = "$scriptDir/release/x-ui-linux-amd64.tar.gz"; Key = "x-ui/x-ui-linux-amd64.tar.gz" },
    @{ Path = "$scriptDir/release/x-ui-linux-arm64.tar.gz"; Key = "x-ui/x-ui-linux-arm64.tar.gz" },
    @{ Path = "$scriptDir/release/install.sh"; Key = "x-ui/install.sh" },
    @{ Path = "$scriptDir/release/x-ui.sh"; Key = "x-ui/x-ui.sh" }
)

Write-Host "目标: $R2_ENDPOINT" -ForegroundColor Yellow
Write-Host "存储桶: $R2_BUCKET" -ForegroundColor Yellow
Write-Host "文件夹: $R2_FOLDER" -ForegroundColor Yellow
Write-Host ""

$successCount = 0
foreach ($file in $files) {
    if (Test-Path $file.Path) {
        $fileName = Split-Path $file.Path -Leaf
        $size = [math]::Round((Get-Item $file.Path).Length / 1MB, 2)
        Write-Host "上传: $fileName ($size MB)..." -ForegroundColor Cyan -NoNewline
        
        if (Upload-ToR2 -FilePath $file.Path -ObjectKey $file.Key) {
            Write-Host " ✓" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host " ✗" -ForegroundColor Red
        }
    } else {
        Write-Host "跳过: $($file.Path) (不存在)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  上传完成！($successCount/$($files.Count))" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "下载地址:" -ForegroundColor Cyan
Write-Host "  $DOWNLOAD_URL/x-ui-linux-amd64.tar.gz" -ForegroundColor White
Write-Host "  $DOWNLOAD_URL/x-ui-linux-arm64.tar.gz" -ForegroundColor White
Write-Host "  $DOWNLOAD_URL/install.sh" -ForegroundColor White
Write-Host "  $DOWNLOAD_URL/x-ui.sh" -ForegroundColor White
Write-Host ""
Write-Host "一键安装命令:" -ForegroundColor Cyan
Write-Host 'bash <(curl -Ls https://down.ipa.gr/x-ui/install.sh)' -ForegroundColor White
Write-Host ""
