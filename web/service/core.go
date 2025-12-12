// Package service 多内核服务层
package service

import (
	"context"
	"encoding/json"
	"errors"
	"sync"

	"x-ui/core"
	"x-ui/core/singbox"
	"x-ui/core/xray"
	"x-ui/database/model"
	"x-ui/logger"
)

var (
	coreManager     *core.Manager
	coreManagerOnce sync.Once
)

// GetCoreManager 获取全局内核管理器
func GetCoreManager() *core.Manager {
	coreManagerOnce.Do(func() {
		coreManager = core.NewManager()

		// 注册 Xray 内核
		xrayCore := xray.NewXrayCore()
		coreManager.RegisterCore(xrayCore)

		// 注册 sing-box 内核
		singboxCore := singbox.NewSingBoxCore()
		coreManager.RegisterCore(singboxCore)

		logger.Info("Core manager initialized")
	})
	return coreManager
}

// CoreService 多内核服务
type CoreService struct {
	inboundService InboundService
	settingService SettingService
}

// GetActiveCoreType 获取当前活动内核类型
func (s *CoreService) GetActiveCoreType() core.CoreType {
	return GetCoreManager().GetActiveCoreType()
}

// SetActiveCoreType 设置活动内核类型
func (s *CoreService) SetActiveCoreType(coreType core.CoreType) error {
	return GetCoreManager().SetActiveCore(coreType)
}

// GetCoreStatus 获取内核状态
func (s *CoreService) GetCoreStatus() *core.Status {
	return GetCoreManager().GetActiveStatus()
}

// GetAllCoreStatus 获取所有内核状态
func (s *CoreService) GetAllCoreStatus() map[core.CoreType]*core.Status {
	return GetCoreManager().GetAllStatus()
}

// ListCores 列出所有内核
func (s *CoreService) ListCores() []core.CoreInfo {
	return GetCoreManager().ListCores()
}

// IsCoreRunning 检查内核是否运行中
func (s *CoreService) IsCoreRunning() bool {
	return GetCoreManager().IsActiveRunning()
}

// StartCore 启动内核
func (s *CoreService) StartCore() error {
	config, err := s.buildConfig()
	if err != nil {
		return err
	}

	return GetCoreManager().StartActive(context.Background(), config)
}

// StopCore 停止内核
func (s *CoreService) StopCore() error {
	return GetCoreManager().StopActive()
}

// RestartCore 重启内核
func (s *CoreService) RestartCore() error {
	config, err := s.buildConfig()
	if err != nil {
		return err
	}

	return GetCoreManager().RestartActive(config)
}

// buildConfig 构建内核配置
func (s *CoreService) buildConfig() ([]byte, error) {
	coreType := GetCoreManager().GetActiveCoreType()

	switch coreType {
	case core.CoreTypeXray:
		return s.buildXrayConfig()
	case core.CoreTypeSingBox:
		return s.buildSingBoxConfig()
	default:
		return nil, errors.New("unknown core type")
	}
}

// buildXrayConfig 构建 Xray 配置
func (s *CoreService) buildXrayConfig() ([]byte, error) {
	templateConfig, err := s.settingService.GetXrayConfigTemplate()
	if err != nil {
		return nil, err
	}

	var config map[string]interface{}
	if err := json.Unmarshal([]byte(templateConfig), &config); err != nil {
		return nil, err
	}

	inbounds, err := s.inboundService.GetAllInbounds()
	if err != nil {
		return nil, err
	}

	xrayInbounds := make([]interface{}, 0)
	for _, inbound := range inbounds {
		if !inbound.Enable {
			continue
		}
		// 跳过 sing-box 专属协议
		if s.isSingBoxOnlyProtocol(inbound.Protocol) {
			continue
		}

		xrayInbound := s.convertToXrayInbound(inbound)
		xrayInbounds = append(xrayInbounds, xrayInbound)
	}

	config["inbounds"] = xrayInbounds

	return json.MarshalIndent(config, "", "  ")
}

// buildSingBoxConfig 构建 sing-box 配置
func (s *CoreService) buildSingBoxConfig() ([]byte, error) {
	// 使用默认模板
	config := map[string]interface{}{
		"log": map[string]interface{}{
			"level":     "info",
			"timestamp": true,
		},
		"dns": map[string]interface{}{
			"servers": []map[string]interface{}{
				{"tag": "google", "address": "tls://8.8.8.8"},
				{"tag": "local", "address": "223.5.5.5", "detour": "direct"},
			},
			"strategy": "prefer_ipv4",
		},
		"outbounds": []map[string]interface{}{
			{"type": "direct", "tag": "direct"},
			{"type": "block", "tag": "block"},
		},
		"route": map[string]interface{}{
			"final":                 "direct",
			"auto_detect_interface": true,
		},
		"experimental": map[string]interface{}{
			"clash_api": map[string]interface{}{
				"external_controller": "127.0.0.1:9090",
			},
		},
	}

	inbounds, err := s.inboundService.GetAllInbounds()
	if err != nil {
		return nil, err
	}

	singboxInbounds := make([]interface{}, 0)
	for _, inbound := range inbounds {
		if !inbound.Enable {
			continue
		}

		singboxInbound := s.convertToSingBoxInbound(inbound)
		if singboxInbound != nil {
			singboxInbounds = append(singboxInbounds, singboxInbound)
		}
	}

	config["inbounds"] = singboxInbounds

	return json.MarshalIndent(config, "", "  ")
}

// convertToXrayInbound 转换为 Xray 入站配置
func (s *CoreService) convertToXrayInbound(inbound *model.Inbound) map[string]interface{} {
	result := map[string]interface{}{
		"tag":      inbound.Tag,
		"protocol": string(inbound.Protocol),
		"port":     inbound.Port,
	}

	if inbound.Listen != "" {
		result["listen"] = inbound.Listen
	}

	if inbound.Settings != "" {
		var settings interface{}
		json.Unmarshal([]byte(inbound.Settings), &settings)
		result["settings"] = settings
	}

	if inbound.StreamSettings != "" {
		var streamSettings interface{}
		json.Unmarshal([]byte(inbound.StreamSettings), &streamSettings)
		result["streamSettings"] = streamSettings
	}

	if inbound.Sniffing != "" {
		var sniffing interface{}
		json.Unmarshal([]byte(inbound.Sniffing), &sniffing)
		result["sniffing"] = sniffing
	}

	return result
}

// convertToSingBoxInbound 转换为 sing-box 入站配置
func (s *CoreService) convertToSingBoxInbound(inbound *model.Inbound) map[string]interface{} {
	result := map[string]interface{}{
		"tag":         inbound.Tag,
		"type":        s.convertProtocolToSingBox(inbound.Protocol),
		"listen":      "0.0.0.0",
		"listen_port": inbound.Port,
	}

	if inbound.Listen != "" {
		result["listen"] = inbound.Listen
	}

	// 解析设置
	if inbound.Settings != "" {
		var settings map[string]interface{}
		if err := json.Unmarshal([]byte(inbound.Settings), &settings); err == nil {
			s.applySingBoxSettings(result, inbound.Protocol, settings)
		}
	}

	// 解析 TLS 设置
	if inbound.StreamSettings != "" {
		var streamSettings map[string]interface{}
		if err := json.Unmarshal([]byte(inbound.StreamSettings), &streamSettings); err == nil {
			s.applySingBoxTLS(result, streamSettings)
		}
	}

	return result
}

// convertProtocolToSingBox 转换协议名称
func (s *CoreService) convertProtocolToSingBox(protocol model.Protocol) string {
	switch protocol {
	case model.VMess:
		return "vmess"
	case model.VLESS:
		return "vless"
	case model.Trojan:
		return "trojan"
	case model.Shadowsocks:
		return "shadowsocks"
	case model.Http:
		return "http"
	default:
		return string(protocol)
	}
}

// applySingBoxSettings 应用 sing-box 特定设置
func (s *CoreService) applySingBoxSettings(result map[string]interface{}, protocol model.Protocol, settings map[string]interface{}) {
	switch protocol {
	case model.VMess:
		if clients, ok := settings["clients"].([]interface{}); ok {
			users := make([]map[string]interface{}, 0)
			for _, client := range clients {
				if c, ok := client.(map[string]interface{}); ok {
					user := map[string]interface{}{
						"uuid": c["id"],
					}
					if alterId, ok := c["alterId"]; ok {
						user["alterId"] = alterId
					}
					users = append(users, user)
				}
			}
			result["users"] = users
		}

	case model.VLESS:
		if clients, ok := settings["clients"].([]interface{}); ok {
			users := make([]map[string]interface{}, 0)
			for _, client := range clients {
				if c, ok := client.(map[string]interface{}); ok {
					user := map[string]interface{}{
						"uuid": c["id"],
					}
					if flow, ok := c["flow"]; ok {
						user["flow"] = flow
					}
					users = append(users, user)
				}
			}
			result["users"] = users
		}

	case model.Trojan:
		if clients, ok := settings["clients"].([]interface{}); ok {
			users := make([]map[string]interface{}, 0)
			for _, client := range clients {
				if c, ok := client.(map[string]interface{}); ok {
					user := map[string]interface{}{
						"password": c["password"],
					}
					users = append(users, user)
				}
			}
			result["users"] = users
		}

	case model.Shadowsocks:
		if method, ok := settings["method"]; ok {
			result["method"] = method
		}
		if password, ok := settings["password"]; ok {
			result["password"] = password
		}
	}
}

// applySingBoxTLS 应用 TLS 设置
func (s *CoreService) applySingBoxTLS(result map[string]interface{}, streamSettings map[string]interface{}) {
	security, _ := streamSettings["security"].(string)
	if security != "tls" && security != "reality" {
		return
	}

	tls := map[string]interface{}{
		"enabled": true,
	}

	if tlsSettings, ok := streamSettings["tlsSettings"].(map[string]interface{}); ok {
		if serverName, ok := tlsSettings["serverName"]; ok {
			tls["server_name"] = serverName
		}
		if certs, ok := tlsSettings["certificates"].([]interface{}); ok && len(certs) > 0 {
			if cert, ok := certs[0].(map[string]interface{}); ok {
				if certFile, ok := cert["certificateFile"]; ok {
					tls["certificate_path"] = certFile
				}
				if keyFile, ok := cert["keyFile"]; ok {
					tls["key_path"] = keyFile
				}
			}
		}
	}

	result["tls"] = tls
}

// isSingBoxOnlyProtocol 判断是否为 sing-box 专属协议
func (s *CoreService) isSingBoxOnlyProtocol(protocol model.Protocol) bool {
	switch string(protocol) {
	case "hysteria", "hysteria2", "tuic", "naive":
		return true
	default:
		return false
	}
}

// GetTraffic 获取流量统计
func (s *CoreService) GetTraffic() ([]core.InboundTraffic, error) {
	return GetCoreManager().GetActiveTraffic()
}

// SelectCoreForProtocol 根据协议选择内核
func (s *CoreService) SelectCoreForProtocol(protocol string) core.CoreType {
	switch protocol {
	case "hysteria", "hysteria2", "tuic", "naive":
		return core.CoreTypeSingBox
	default:
		return GetCoreManager().GetActiveCoreType()
	}
}

// DownloadCore 下载内核
func (s *CoreService) DownloadCore(coreType core.CoreType, version string) error {
	downloader := core.NewDownloader()
	destDir := "bin"

	switch coreType {
	case core.CoreTypeXray:
		return downloader.DownloadXray(version, destDir)
	case core.CoreTypeSingBox:
		return downloader.DownloadSingBox(version, destDir)
	default:
		return errors.New("unknown core type")
	}
}

// GetCoreVersions 获取内核版本列表
func (s *CoreService) GetCoreVersions(coreType core.CoreType) ([]string, error) {
	downloader := core.NewDownloader()

	switch coreType {
	case core.CoreTypeXray:
		return downloader.GetXrayVersions()
	case core.CoreTypeSingBox:
		return downloader.GetSingBoxVersions()
	default:
		return nil, errors.New("unknown core type")
	}
}

// UpdateGeoFiles 更新 GeoIP/GeoSite 文件
func (s *CoreService) UpdateGeoFiles() error {
	downloader := core.NewDownloader()
	return downloader.DownloadGeoFiles("bin")
}
