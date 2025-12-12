// Package core 内核下载和更新功能
package core

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"x-ui/logger"
)

// Downloader 内核下载器
type Downloader struct {
	client *http.Client
}

// NewDownloader 创建下载器
func NewDownloader() *Downloader {
	return &Downloader{
		client: &http.Client{
			Timeout: time.Minute * 10,
		},
	}
}

// GitHubRelease GitHub 发布信息
type GitHubRelease struct {
	TagName string `json:"tag_name"`
	Name    string `json:"name"`
	Assets  []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
	} `json:"assets"`
}

// GetLatestXrayVersion 获取最新 Xray 版本
func (d *Downloader) GetLatestXrayVersion() (string, error) {
	return d.getLatestGitHubRelease("XTLS", "Xray-core")
}

// GetLatestSingBoxVersion 获取最新 sing-box 版本
func (d *Downloader) GetLatestSingBoxVersion() (string, error) {
	return d.getLatestGitHubRelease("SagerNet", "sing-box")
}

func (d *Downloader) getLatestGitHubRelease(owner, repo string) (string, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", owner, repo)
	resp, err := d.client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var release GitHubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return "", err
	}

	return release.TagName, nil
}

// GetXrayVersions 获取 Xray 版本列表
func (d *Downloader) GetXrayVersions() ([]string, error) {
	return d.getGitHubReleases("XTLS", "Xray-core")
}

// GetSingBoxVersions 获取 sing-box 版本列表
func (d *Downloader) GetSingBoxVersions() ([]string, error) {
	return d.getGitHubReleases("SagerNet", "sing-box")
}

func (d *Downloader) getGitHubReleases(owner, repo string) ([]string, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases", owner, repo)
	resp, err := d.client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var releases []GitHubRelease
	if err := json.NewDecoder(resp.Body).Decode(&releases); err != nil {
		return nil, err
	}

	versions := make([]string, 0, len(releases))
	for _, r := range releases {
		versions = append(versions, r.TagName)
	}

	return versions, nil
}

// DownloadXray 下载 Xray
func (d *Downloader) DownloadXray(version string, destDir string) error {
	osName := runtime.GOOS
	arch := runtime.GOARCH

	// 转换架构名称
	archName := d.convertXrayArch(arch)
	if osName == "darwin" {
		osName = "macos"
	}

	fileName := fmt.Sprintf("Xray-%s-%s.zip", osName, archName)
	url := fmt.Sprintf("https://github.com/XTLS/Xray-core/releases/download/%s/%s", version, fileName)

	logger.Infof("Downloading Xray %s from %s", version, url)

	// 下载文件
	tmpFile, err := d.downloadFile(url)
	if err != nil {
		return fmt.Errorf("failed to download xray: %w", err)
	}
	defer os.Remove(tmpFile)

	// 解压
	if err := d.extractZip(tmpFile, destDir); err != nil {
		return fmt.Errorf("failed to extract xray: %w", err)
	}

	// 重命名二进制文件
	srcBin := filepath.Join(destDir, "xray")
	if runtime.GOOS == "windows" {
		srcBin += ".exe"
	}
	dstBin := filepath.Join(destDir, fmt.Sprintf("xray-%s-%s", runtime.GOOS, runtime.GOARCH))
	if runtime.GOOS == "windows" {
		dstBin += ".exe"
	}

	if err := os.Rename(srcBin, dstBin); err != nil {
		// 如果重命名失败，可能文件名已经正确
		logger.Warning("Failed to rename xray binary:", err)
	}

	// 设置执行权限
	os.Chmod(dstBin, 0755)

	logger.Infof("Xray %s downloaded successfully", version)
	return nil
}

// DownloadSingBox 下载 sing-box
func (d *Downloader) DownloadSingBox(version string, destDir string) error {
	osName := runtime.GOOS
	arch := runtime.GOARCH

	// 转换架构名称
	archName := d.convertSingBoxArch(arch)

	// sing-box 使用 tar.gz 格式
	fileName := fmt.Sprintf("sing-box-%s-%s-%s.tar.gz", strings.TrimPrefix(version, "v"), osName, archName)
	url := fmt.Sprintf("https://github.com/SagerNet/sing-box/releases/download/%s/%s", version, fileName)

	logger.Infof("Downloading sing-box %s from %s", version, url)

	// 下载文件
	tmpFile, err := d.downloadFile(url)
	if err != nil {
		return fmt.Errorf("failed to download sing-box: %w", err)
	}
	defer os.Remove(tmpFile)

	// 解压
	if err := d.extractTarGz(tmpFile, destDir); err != nil {
		return fmt.Errorf("failed to extract sing-box: %w", err)
	}

	// 重命名二进制文件
	extractedDir := fmt.Sprintf("sing-box-%s-%s-%s", strings.TrimPrefix(version, "v"), osName, archName)
	srcBin := filepath.Join(destDir, extractedDir, "sing-box")
	if runtime.GOOS == "windows" {
		srcBin += ".exe"
	}
	dstBin := filepath.Join(destDir, fmt.Sprintf("sing-box-%s-%s", runtime.GOOS, runtime.GOARCH))
	if runtime.GOOS == "windows" {
		dstBin += ".exe"
	}

	if err := os.Rename(srcBin, dstBin); err != nil {
		logger.Warning("Failed to rename sing-box binary:", err)
	}

	// 清理解压目录
	os.RemoveAll(filepath.Join(destDir, extractedDir))

	// 设置执行权限
	os.Chmod(dstBin, 0755)

	logger.Infof("sing-box %s downloaded successfully", version)
	return nil
}

func (d *Downloader) convertXrayArch(arch string) string {
	switch arch {
	case "amd64":
		return "64"
	case "386":
		return "32"
	case "arm64":
		return "arm64-v8a"
	case "arm":
		return "arm32-v7a"
	default:
		return arch
	}
}

func (d *Downloader) convertSingBoxArch(arch string) string {
	switch arch {
	case "386":
		return "386"
	case "amd64":
		return "amd64"
	case "arm64":
		return "arm64"
	case "arm":
		return "armv7"
	default:
		return arch
	}
}

func (d *Downloader) downloadFile(url string) (string, error) {
	resp, err := d.client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download failed with status: %d", resp.StatusCode)
	}

	tmpFile, err := os.CreateTemp("", "download-*")
	if err != nil {
		return "", err
	}
	defer tmpFile.Close()

	_, err = io.Copy(tmpFile, resp.Body)
	if err != nil {
		os.Remove(tmpFile.Name())
		return "", err
	}

	return tmpFile.Name(), nil
}

func (d *Downloader) extractZip(zipPath, destDir string) error {
	reader, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer reader.Close()

	for _, file := range reader.File {
		path := filepath.Join(destDir, file.Name)

		if file.FileInfo().IsDir() {
			os.MkdirAll(path, 0755)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return err
		}

		dstFile, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.Mode())
		if err != nil {
			return err
		}

		srcFile, err := file.Open()
		if err != nil {
			dstFile.Close()
			return err
		}

		_, err = io.Copy(dstFile, srcFile)
		srcFile.Close()
		dstFile.Close()

		if err != nil {
			return err
		}
	}

	return nil
}

func (d *Downloader) extractTarGz(tarGzPath, destDir string) error {
	file, err := os.Open(tarGzPath)
	if err != nil {
		return err
	}
	defer file.Close()

	gzReader, err := gzip.NewReader(file)
	if err != nil {
		return err
	}
	defer gzReader.Close()

	tarReader := tar.NewReader(gzReader)

	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		path := filepath.Join(destDir, header.Name)

		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(path, 0755); err != nil {
				return err
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
				return err
			}

			dstFile, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, os.FileMode(header.Mode))
			if err != nil {
				return err
			}

			if _, err := io.Copy(dstFile, tarReader); err != nil {
				dstFile.Close()
				return err
			}
			dstFile.Close()
		}
	}

	return nil
}

// DownloadGeoFiles 下载 GeoIP 和 GeoSite 文件
func (d *Downloader) DownloadGeoFiles(destDir string) error {
	files := map[string]string{
		"geoip.dat":   "https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geoip.dat",
		"geosite.dat": "https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geosite.dat",
	}

	for name, url := range files {
		logger.Infof("Downloading %s", name)

		resp, err := d.client.Get(url)
		if err != nil {
			return fmt.Errorf("failed to download %s: %w", name, err)
		}

		dstPath := filepath.Join(destDir, name)
		dstFile, err := os.Create(dstPath)
		if err != nil {
			resp.Body.Close()
			return err
		}

		_, err = io.Copy(dstFile, resp.Body)
		resp.Body.Close()
		dstFile.Close()

		if err != nil {
			return err
		}

		logger.Infof("%s downloaded successfully", name)
	}

	return nil
}
