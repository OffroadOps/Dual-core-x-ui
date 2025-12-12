// Package xray 实现 Xray 内核
package xray

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

	statsservice "github.com/xtls/xray-core/app/stats/command"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"x-ui/core"
	"x-ui/logger"
)

var _ core.Core = (*XrayCore)(nil)

// XrayCore Xray 内核实现
type XrayCore struct {
	mu sync.RWMutex

	cmd       *exec.Cmd
	config    []byte
	version   string
	startTime time.Time
	state     core.State
	errorMsg  string

	ctx        context.Context
	cancelFunc context.CancelFunc

	// gRPC 连接用于流量统计
	grpcConn   *grpc.ClientConn
	statsClient statsservice.StatsServiceClient
	apiPort    int
}

// NewXrayCore 创建 Xray 内核实例
func NewXrayCore() *XrayCore {
	return &XrayCore{
		state:   core.StateStopped,
		apiPort: 10085, // 默认 API 端口
	}
}

func (x *XrayCore) Type() core.CoreType {
	return core.CoreTypeXray
}

func (x *XrayCore) Name() string {
	return "Xray"
}

func (x *XrayCore) Version() string {
	if x.version == "" {
		x.version = x.getVersion()
	}
	return x.version
}

func (x *XrayCore) getVersion() string {
	cmd := exec.Command(GetBinaryPath(), "version")
	output, err := cmd.Output()
	if err != nil {
		return "unknown"
	}
	// 解析版本号
	var version string
	fmt.Sscanf(string(output), "Xray %s", &version)
	if version == "" {
		return "unknown"
	}
	return version
}

func (x *XrayCore) Start(ctx context.Context, config []byte) error {
	x.mu.Lock()
	defer x.mu.Unlock()

	if x.state == core.StateRunning {
		return errors.New("xray is already running")
	}

	// 保存配置到临时文件
	configPath := GetConfigPath()
	if err := os.WriteFile(configPath, config, 0644); err != nil {
		return fmt.Errorf("failed to write config: %w", err)
	}

	// 创建子上下文
	x.ctx, x.cancelFunc = context.WithCancel(ctx)

	// 启动 Xray 进程
	x.cmd = exec.CommandContext(x.ctx, GetBinaryPath(), "run", "-c", configPath)
	x.cmd.Env = append(os.Environ(), "XRAY_LOCATION_ASSET="+GetAssetPath())

	// 捕获输出
	stdout, err := x.cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to get stdout pipe: %w", err)
	}
	stderr, err := x.cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to get stderr pipe: %w", err)
	}

	if err := x.cmd.Start(); err != nil {
		x.state = core.StateError
		x.errorMsg = err.Error()
		return fmt.Errorf("failed to start xray: %w", err)
	}

	x.config = config
	x.startTime = time.Now()
	x.state = core.StateRunning
	x.errorMsg = ""

	// 异步读取输出
	go x.readOutput(stdout, "stdout")
	go x.readOutput(stderr, "stderr")

	// 等待进程结束
	go func() {
		err := x.cmd.Wait()
		x.mu.Lock()
		defer x.mu.Unlock()

		if err != nil && x.state == core.StateRunning {
			x.state = core.StateError
			x.errorMsg = err.Error()
			logger.Error("xray process exited with error:", err)
		} else {
			x.state = core.StateStopped
		}
	}()

	// 连接 gRPC API
	go x.connectAPI()

	logger.Info("Xray started successfully")
	return nil
}

func (x *XrayCore) readOutput(pipe io.ReadCloser, name string) {
	scanner := bufio.NewScanner(pipe)
	for scanner.Scan() {
		line := scanner.Text()
		logger.Debug(fmt.Sprintf("[xray %s] %s", name, line))
	}
}

func (x *XrayCore) connectAPI() {
	time.Sleep(time.Second) // 等待 Xray 启动

	addr := fmt.Sprintf("127.0.0.1:%d", x.apiPort)
	conn, err := grpc.Dial(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		logger.Warning("failed to connect to xray api:", err)
		return
	}

	x.mu.Lock()
	x.grpcConn = conn
	x.statsClient = statsservice.NewStatsServiceClient(conn)
	x.mu.Unlock()

	logger.Info("Connected to Xray API")
}

func (x *XrayCore) Stop() error {
	x.mu.Lock()
	defer x.mu.Unlock()

	if x.state != core.StateRunning {
		return nil
	}

	// 关闭 gRPC 连接
	if x.grpcConn != nil {
		x.grpcConn.Close()
		x.grpcConn = nil
		x.statsClient = nil
	}

	// 取消上下文
	if x.cancelFunc != nil {
		x.cancelFunc()
	}

	// 等待进程结束
	if x.cmd != nil && x.cmd.Process != nil {
		x.cmd.Process.Kill()
		x.cmd.Wait()
	}

	x.state = core.StateStopped
	x.cmd = nil

	logger.Info("Xray stopped")
	return nil
}

func (x *XrayCore) Restart(config []byte) error {
	if err := x.Stop(); err != nil {
		return err
	}
	time.Sleep(time.Millisecond * 500)
	return x.Start(context.Background(), config)
}

func (x *XrayCore) IsRunning() bool {
	x.mu.RLock()
	defer x.mu.RUnlock()
	return x.state == core.StateRunning
}

func (x *XrayCore) Status() *core.Status {
	x.mu.RLock()
	defer x.mu.RUnlock()

	status := &core.Status{
		State:    x.state,
		Version:  x.Version(),
		ErrorMsg: x.errorMsg,
	}

	if x.state == core.StateRunning {
		status.Uptime = int64(time.Since(x.startTime).Seconds())
		status.StartAt = x.startTime
	}

	return status
}

func (x *XrayCore) GetTraffic() ([]core.InboundTraffic, error) {
	x.mu.RLock()
	client := x.statsClient
	x.mu.RUnlock()

	if client == nil {
		return nil, errors.New("stats client not connected")
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*3)
	defer cancel()

	resp, err := client.QueryStats(ctx, &statsservice.QueryStatsRequest{
		Pattern: "",
		Reset_:  false,
	})
	if err != nil {
		return nil, err
	}

	trafficMap := make(map[string]*core.InboundTraffic)

	for _, stat := range resp.Stat {
		// 解析格式: inbound>>>tag>>>traffic>>>uplink/downlink
		var direction, tag, trafficType, linkType string
		_, err := fmt.Sscanf(stat.Name, "%[^>]>>>%[^>]>>>%[^>]>>>%s", &direction, &tag, &trafficType, &linkType)
		if err != nil || direction != "inbound" || trafficType != "traffic" {
			continue
		}

		if _, ok := trafficMap[tag]; !ok {
			trafficMap[tag] = &core.InboundTraffic{Tag: tag}
		}

		if linkType == "uplink" {
			trafficMap[tag].Traffic.Up = stat.Value
		} else if linkType == "downlink" {
			trafficMap[tag].Traffic.Down = stat.Value
		}
	}

	result := make([]core.InboundTraffic, 0, len(trafficMap))
	for _, t := range trafficMap {
		result = append(result, *t)
	}

	return result, nil
}

func (x *XrayCore) GetClientTraffic(email string) (*core.ClientTraffic, error) {
	x.mu.RLock()
	client := x.statsClient
	x.mu.RUnlock()

	if client == nil {
		return nil, errors.New("stats client not connected")
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*3)
	defer cancel()

	traffic := &core.ClientTraffic{Email: email}

	// 获取上行流量
	upResp, err := client.GetStats(ctx, &statsservice.GetStatsRequest{
		Name:   fmt.Sprintf("user>>>%s>>>traffic>>>uplink", email),
		Reset_: false,
	})
	if err == nil && upResp.Stat != nil {
		traffic.Traffic.Up = upResp.Stat.Value
	}

	// 获取下行流量
	downResp, err := client.GetStats(ctx, &statsservice.GetStatsRequest{
		Name:   fmt.Sprintf("user>>>%s>>>traffic>>>downlink", email),
		Reset_: false,
	})
	if err == nil && downResp.Stat != nil {
		traffic.Traffic.Down = downResp.Stat.Value
	}

	return traffic, nil
}

func (x *XrayCore) ResetTraffic(tag string) error {
	x.mu.RLock()
	client := x.statsClient
	x.mu.RUnlock()

	if client == nil {
		return errors.New("stats client not connected")
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*3)
	defer cancel()

	pattern := fmt.Sprintf("inbound>>>%s>>>traffic>>>", tag)
	_, err := client.QueryStats(ctx, &statsservice.QueryStatsRequest{
		Pattern: pattern,
		Reset_:  true,
	})

	return err
}

func (x *XrayCore) GetConfig() []byte {
	x.mu.RLock()
	defer x.mu.RUnlock()
	return x.config
}

func (x *XrayCore) ValidateConfig(config []byte) error {
	// 写入临时文件
	tmpFile, err := os.CreateTemp("", "xray-config-*.json")
	if err != nil {
		return err
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.Write(config); err != nil {
		return err
	}
	tmpFile.Close()

	// 使用 xray 验证配置
	cmd := exec.Command(GetBinaryPath(), "run", "-test", "-c", tmpFile.Name())
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("config validation failed: %s", string(output))
	}

	return nil
}

// SetAPIPort 设置 API 端口
func (x *XrayCore) SetAPIPort(port int) {
	x.mu.Lock()
	defer x.mu.Unlock()
	x.apiPort = port
}

// 路径辅助函数

func GetBinaryName() string {
	return fmt.Sprintf("xray-%s-%s", runtime.GOOS, runtime.GOARCH)
}

func GetBinaryPath() string {
	return "bin/" + GetBinaryName()
}

func GetConfigPath() string {
	return "bin/config.json"
}

func GetAssetPath() string {
	return "bin"
}

func GetGeositePath() string {
	return "bin/geosite.dat"
}

func GetGeoipPath() string {
	return "bin/geoip.dat"
}

// XrayConfigBuilder Xray 配置构建器
type XrayConfigBuilder struct {
	templateConfig string
}

// NewXrayConfigBuilder 创建配置构建器
func NewXrayConfigBuilder(template string) *XrayConfigBuilder {
	return &XrayConfigBuilder{templateConfig: template}
}

func (b *XrayConfigBuilder) Build(inbounds []core.InboundConfig) ([]byte, error) {
	// 解析模板配置
	var config map[string]interface{}
	if err := json.Unmarshal([]byte(b.templateConfig), &config); err != nil {
		return nil, fmt.Errorf("failed to parse template config: %w", err)
	}

	// 转换入站配置
	xrayInbounds := make([]map[string]interface{}, 0, len(inbounds))
	for _, inbound := range inbounds {
		if !inbound.Enable {
			continue
		}
		if inbound.Protocol.IsSingBoxOnly() {
			continue // 跳过 sing-box 专属协议
		}

		xrayInbound := map[string]interface{}{
			"tag":      inbound.Tag,
			"protocol": string(inbound.Protocol),
			"listen":   inbound.Listen,
			"port":     inbound.Port,
			"settings": inbound.Settings,
		}

		if inbound.StreamSettings != nil {
			xrayInbound["streamSettings"] = inbound.StreamSettings
		}
		if inbound.Sniffing != nil {
			xrayInbound["sniffing"] = inbound.Sniffing
		}

		xrayInbounds = append(xrayInbounds, xrayInbound)
	}

	config["inbounds"] = xrayInbounds

	return json.MarshalIndent(config, "", "  ")
}

func (b *XrayConfigBuilder) BuildTemplate() []byte {
	return []byte(b.templateConfig)
}
