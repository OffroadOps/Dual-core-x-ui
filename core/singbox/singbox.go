// Package singbox 实现 sing-box 内核
package singbox

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"runtime"
	"sync"
	"time"

	"x-ui/core"
	"x-ui/logger"
)

var _ core.Core = (*SingBoxCore)(nil)

// SingBoxCore sing-box 内核实现
type SingBoxCore struct {
	mu sync.RWMutex

	cmd       *exec.Cmd
	config    []byte
	version   string
	startTime time.Time
	state     core.State
	errorMsg  string

	ctx        context.Context
	cancelFunc context.CancelFunc
}

// NewSingBoxCore 创建 sing-box 内核实例
func NewSingBoxCore() *SingBoxCore {
	return &SingBoxCore{
		state: core.StateStopped,
	}
}

func (s *SingBoxCore) Type() core.CoreType {
	return core.CoreTypeSingBox
}

func (s *SingBoxCore) Name() string {
	return "sing-box"
}

func (s *SingBoxCore) Version() string {
	if s.version == "" {
		s.version = s.getVersion()
	}
	return s.version
}

func (s *SingBoxCore) getVersion() string {
	cmd := exec.Command(GetBinaryPath(), "version")
	output, err := cmd.Output()
	if err != nil {
		return "unknown"
	}
	// 解析版本号
	var version string
	fmt.Sscanf(string(output), "sing-box version %s", &version)
	if version == "" {
		return "unknown"
	}
	return version
}

func (s *SingBoxCore) Start(ctx context.Context, config []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.state == core.StateRunning {
		return errors.New("sing-box is already running")
	}

	// 保存配置到临时文件
	configPath := GetConfigPath()
	if err := os.WriteFile(configPath, config, 0644); err != nil {
		return fmt.Errorf("failed to write config: %w", err)
	}

	// 创建子上下文
	s.ctx, s.cancelFunc = context.WithCancel(ctx)

	// 启动 sing-box 进程
	s.cmd = exec.CommandContext(s.ctx, GetBinaryPath(), "run", "-c", configPath)

	// 捕获输出
	stdout, err := s.cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to get stdout pipe: %w", err)
	}
	stderr, err := s.cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to get stderr pipe: %w", err)
	}

	if err := s.cmd.Start(); err != nil {
		s.state = core.StateError
		s.errorMsg = err.Error()
		return fmt.Errorf("failed to start sing-box: %w", err)
	}

	s.config = config
	s.startTime = time.Now()
	s.state = core.StateRunning
	s.errorMsg = ""

	// 异步读取输出
	go s.readOutput(stdout, "stdout")
	go s.readOutput(stderr, "stderr")

	// 等待进程结束
	go func() {
		err := s.cmd.Wait()
		s.mu.Lock()
		defer s.mu.Unlock()

		if err != nil && s.state == core.StateRunning {
			s.state = core.StateError
			s.errorMsg = err.Error()
			logger.Error("sing-box process exited with error:", err)
		} else {
			s.state = core.StateStopped
		}
	}()

	logger.Info("sing-box started successfully")
	return nil
}

func (s *SingBoxCore) readOutput(pipe io.ReadCloser, name string) {
	scanner := bufio.NewScanner(pipe)
	for scanner.Scan() {
		line := scanner.Text()
		logger.Debug(fmt.Sprintf("[sing-box %s] %s", name, line))
	}
}

func (s *SingBoxCore) Stop() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.state != core.StateRunning {
		return nil
	}

	// 取消上下文
	if s.cancelFunc != nil {
		s.cancelFunc()
	}

	// 等待进程结束
	if s.cmd != nil && s.cmd.Process != nil {
		s.cmd.Process.Kill()
		s.cmd.Wait()
	}

	s.state = core.StateStopped
	s.cmd = nil

	logger.Info("sing-box stopped")
	return nil
}

func (s *SingBoxCore) Restart(config []byte) error {
	if err := s.Stop(); err != nil {
		return err
	}
	time.Sleep(time.Millisecond * 500)
	return s.Start(context.Background(), config)
}

func (s *SingBoxCore) IsRunning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.state == core.StateRunning
}

func (s *SingBoxCore) Status() *core.Status {
	s.mu.RLock()
	defer s.mu.RUnlock()

	status := &core.Status{
		State:    s.state,
		Version:  s.Version(),
		ErrorMsg: s.errorMsg,
	}

	if s.state == core.StateRunning {
		status.Uptime = int64(time.Since(s.startTime).Seconds())
		status.StartAt = s.startTime
	}

	return status
}

func (s *SingBoxCore) GetTraffic() ([]core.InboundTraffic, error) {
	// sing-box 流量统计需要通过 Clash API 或 experimental 配置获取
	// TODO: 实现 sing-box 流量统计
	return nil, errors.New("sing-box traffic stats not implemented yet")
}

func (s *SingBoxCore) GetClientTraffic(email string) (*core.ClientTraffic, error) {
	// TODO: 实现客户端流量统计
	return nil, errors.New("sing-box client traffic stats not implemented yet")
}

func (s *SingBoxCore) ResetTraffic(tag string) error {
	// TODO: 实现流量重置
	return errors.New("sing-box traffic reset not implemented yet")
}

func (s *SingBoxCore) GetConfig() []byte {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.config
}

func (s *SingBoxCore) ValidateConfig(config []byte) error {
	// 写入临时文件
	tmpFile, err := os.CreateTemp("", "singbox-config-*.json")
	if err != nil {
		return err
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.Write(config); err != nil {
		return err
	}
	tmpFile.Close()

	// 使用 sing-box 验证配置
	cmd := exec.Command(GetBinaryPath(), "check", "-c", tmpFile.Name())
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("config validation failed: %s", string(output))
	}

	return nil
}

// 路径辅助函数

func GetBinaryName() string {
	return fmt.Sprintf("sing-box-%s-%s", runtime.GOOS, runtime.GOARCH)
}

func GetBinaryPath() string {
	return "bin/" + GetBinaryName()
}

func GetConfigPath() string {
	return "bin/singbox-config.json"
}

// SingBoxConfigBuilder sing-box 配置构建器
type SingBoxConfigBuilder struct {
	templateConfig string
}

// NewSingBoxConfigBuilder 创建配置构建器
func NewSingBoxConfigBuilder(template string) *SingBoxConfigBuilder {
	return &SingBoxConfigBuilder{templateConfig: template}
}

func (b *SingBoxConfigBuilder) Build(inbounds []core.InboundConfig) ([]byte, error) {
	// 解析模板配置
	var config map[string]interface{}
	if err := json.Unmarshal([]byte(b.templateConfig), &config); err != nil {
		return nil, fmt.Errorf("failed to parse template config: %w", err)
	}

	// 转换入站配置为 sing-box 格式
	singboxInbounds := make([]map[string]interface{}, 0, len(inbounds))
	for _, inbound := range inbounds {
		if !inbound.Enable {
			continue
		}

		singboxInbound := b.convertInbound(inbound)
		if singboxInbound != nil {
			singboxInbounds = append(singboxInbounds, singboxInbound)
		}
	}

	config["inbounds"] = singboxInbounds

	return json.MarshalIndent(config, "", "  ")
}

func (b *SingBoxConfigBuilder) convertInbound(inbound core.InboundConfig) map[string]interface{} {
	result := map[string]interface{}{
		"tag":    inbound.Tag,
		"type":   b.convertProtocol(inbound.Protocol),
		"listen": inbound.Listen,
	}

	// sing-box 使用 listen_port 而不是 port
	result["listen_port"] = inbound.Port

	// 根据协议添加特定配置
	switch inbound.Protocol {
	case core.ProtocolVMess:
		b.addVMessConfig(result, inbound.Settings)
	case core.ProtocolVLess:
		b.addVLessConfig(result, inbound.Settings)
	case core.ProtocolTrojan:
		b.addTrojanConfig(result, inbound.Settings)
	case core.ProtocolShadowsocks:
		b.addShadowsocksConfig(result, inbound.Settings)
	case core.ProtocolHysteria:
		b.addHysteriaConfig(result, inbound.Settings)
	case core.ProtocolHysteria2:
		b.addHysteria2Config(result, inbound.Settings)
	case core.ProtocolTUIC:
		b.addTUICConfig(result, inbound.Settings)
	}

	// 添加 TLS 配置
	if tls, ok := inbound.StreamSettings["security"]; ok && tls == "tls" {
		b.addTLSConfig(result, inbound.StreamSettings)
	}

	return result
}

func (b *SingBoxConfigBuilder) convertProtocol(protocol core.Protocol) string {
	switch protocol {
	case core.ProtocolVMess:
		return "vmess"
	case core.ProtocolVLess:
		return "vless"
	case core.ProtocolTrojan:
		return "trojan"
	case core.ProtocolShadowsocks:
		return "shadowsocks"
	case core.ProtocolHysteria:
		return "hysteria"
	case core.ProtocolHysteria2:
		return "hysteria2"
	case core.ProtocolTUIC:
		return "tuic"
	case core.ProtocolSocks:
		return "socks"
	case core.ProtocolHTTP:
		return "http"
	default:
		return string(protocol)
	}
}

func (b *SingBoxConfigBuilder) addVMessConfig(result map[string]interface{}, settings map[string]interface{}) {
	if clients, ok := settings["clients"].([]interface{}); ok {
		users := make([]map[string]interface{}, 0, len(clients))
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
}

func (b *SingBoxConfigBuilder) addVLessConfig(result map[string]interface{}, settings map[string]interface{}) {
	if clients, ok := settings["clients"].([]interface{}); ok {
		users := make([]map[string]interface{}, 0, len(clients))
		for _, client := range clients {
			if c, ok := client.(map[string]interface{}); ok {
				user := map[string]interface{}{
					"uuid": c["id"],
					"flow": c["flow"],
				}
				users = append(users, user)
			}
		}
		result["users"] = users
	}
}

func (b *SingBoxConfigBuilder) addTrojanConfig(result map[string]interface{}, settings map[string]interface{}) {
	if clients, ok := settings["clients"].([]interface{}); ok {
		users := make([]map[string]interface{}, 0, len(clients))
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
}

func (b *SingBoxConfigBuilder) addShadowsocksConfig(result map[string]interface{}, settings map[string]interface{}) {
	if method, ok := settings["method"]; ok {
		result["method"] = method
	}
	if password, ok := settings["password"]; ok {
		result["password"] = password
	}
}

func (b *SingBoxConfigBuilder) addHysteriaConfig(result map[string]interface{}, settings map[string]interface{}) {
	// Hysteria 特定配置
	if up, ok := settings["up"]; ok {
		result["up"] = up
	}
	if down, ok := settings["down"]; ok {
		result["down"] = down
	}
	if obfs, ok := settings["obfs"]; ok {
		result["obfs"] = obfs
	}
	if auth, ok := settings["auth"]; ok {
		result["auth"] = auth
	}
	if authStr, ok := settings["auth_str"]; ok {
		result["auth_str"] = authStr
	}
}

func (b *SingBoxConfigBuilder) addHysteria2Config(result map[string]interface{}, settings map[string]interface{}) {
	// Hysteria2 特定配置
	if upMbps, ok := settings["up_mbps"]; ok {
		result["up_mbps"] = upMbps
	}
	if downMbps, ok := settings["down_mbps"]; ok {
		result["down_mbps"] = downMbps
	}
	if obfs, ok := settings["obfs"]; ok {
		result["obfs"] = map[string]interface{}{
			"type":     obfs.(map[string]interface{})["type"],
			"password": obfs.(map[string]interface{})["password"],
		}
	}
	if users, ok := settings["users"]; ok {
		result["users"] = users
	}
}

func (b *SingBoxConfigBuilder) addTUICConfig(result map[string]interface{}, settings map[string]interface{}) {
	// TUIC 特定配置
	if users, ok := settings["users"]; ok {
		result["users"] = users
	}
	if congestionControl, ok := settings["congestion_control"]; ok {
		result["congestion_control"] = congestionControl
	}
}

func (b *SingBoxConfigBuilder) addTLSConfig(result map[string]interface{}, streamSettings map[string]interface{}) {
	tlsSettings, ok := streamSettings["tlsSettings"].(map[string]interface{})
	if !ok {
		return
	}

	tls := map[string]interface{}{
		"enabled": true,
	}

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

	result["tls"] = tls
}

func (b *SingBoxConfigBuilder) BuildTemplate() []byte {
	return []byte(b.templateConfig)
}
