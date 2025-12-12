// Package core 定义代理内核的抽象接口
// 支持多种代理内核：Xray, sing-box 等
package core

import (
	"context"
	"time"
)

// CoreType 内核类型
type CoreType string

const (
	CoreTypeXray    CoreType = "xray"
	CoreTypeSingBox CoreType = "sing-box"
)

// State 内核运行状态
type State string

const (
	StateRunning State = "running"
	StateStopped State = "stopped"
	StateError   State = "error"
)

// Traffic 流量统计
type Traffic struct {
	Up   int64 `json:"up"`
	Down int64 `json:"down"`
}

// InboundTraffic 入站流量统计
type InboundTraffic struct {
	Tag     string `json:"tag"`
	Traffic Traffic
}

// ClientTraffic 客户端流量统计
type ClientTraffic struct {
	Email   string `json:"email"`
	Traffic Traffic
}

// Status 内核状态信息
type Status struct {
	State    State     `json:"state"`
	Version  string    `json:"version"`
	Uptime   int64     `json:"uptime"`
	ErrorMsg string    `json:"errorMsg,omitempty"`
	StartAt  time.Time `json:"startAt,omitempty"`
}

// Core 代理内核接口
// 所有代理内核（Xray, sing-box）都需要实现此接口
type Core interface {
	// Type 返回内核类型
	Type() CoreType

	// Name 返回内核名称
	Name() string

	// Version 返回内核版本
	Version() string

	// Start 启动内核
	Start(ctx context.Context, config []byte) error

	// Stop 停止内核
	Stop() error

	// Restart 重启内核
	Restart(config []byte) error

	// IsRunning 检查内核是否运行中
	IsRunning() bool

	// Status 获取内核状态
	Status() *Status

	// GetTraffic 获取流量统计
	GetTraffic() ([]InboundTraffic, error)

	// GetClientTraffic 获取客户端流量统计
	GetClientTraffic(email string) (*ClientTraffic, error)

	// ResetTraffic 重置流量统计
	ResetTraffic(tag string) error

	// GetConfig 获取当前配置
	GetConfig() []byte

	// ValidateConfig 验证配置是否有效
	ValidateConfig(config []byte) error
}

// ConfigBuilder 配置构建器接口
type ConfigBuilder interface {
	// Build 根据入站配置构建内核配置
	Build(inbounds []InboundConfig) ([]byte, error)

	// BuildTemplate 获取配置模板
	BuildTemplate() []byte
}

// InboundConfig 入站配置（通用格式）
type InboundConfig struct {
	ID             int                    `json:"id"`
	Tag            string                 `json:"tag"`
	Protocol       Protocol               `json:"protocol"`
	Listen         string                 `json:"listen"`
	Port           int                    `json:"port"`
	Settings       map[string]interface{} `json:"settings"`
	StreamSettings map[string]interface{} `json:"streamSettings,omitempty"`
	Sniffing       *SniffingConfig        `json:"sniffing,omitempty"`
	Enable         bool                   `json:"enable"`
}

// SniffingConfig 流量嗅探配置
type SniffingConfig struct {
	Enabled      bool     `json:"enabled"`
	DestOverride []string `json:"destOverride"`
}

// Protocol 协议类型
type Protocol string

const (
	// Xray 支持的协议
	ProtocolVMess       Protocol = "vmess"
	ProtocolVLess       Protocol = "vless"
	ProtocolTrojan      Protocol = "trojan"
	ProtocolShadowsocks Protocol = "shadowsocks"
	ProtocolDokodemo    Protocol = "dokodemo-door"
	ProtocolSocks       Protocol = "socks"
	ProtocolHTTP        Protocol = "http"
	ProtocolWireguard   Protocol = "wireguard"

	// sing-box 额外支持的协议
	ProtocolHysteria  Protocol = "hysteria"
	ProtocolHysteria2 Protocol = "hysteria2"
	ProtocolTUIC      Protocol = "tuic"
	ProtocolNaive     Protocol = "naive"
)

// IsSingBoxOnly 判断协议是否只有 sing-box 支持
func (p Protocol) IsSingBoxOnly() bool {
	switch p {
	case ProtocolHysteria, ProtocolHysteria2, ProtocolTUIC, ProtocolNaive:
		return true
	default:
		return false
	}
}

// SupportedBy 判断协议是否被指定内核支持
func (p Protocol) SupportedBy(coreType CoreType) bool {
	switch coreType {
	case CoreTypeXray:
		return !p.IsSingBoxOnly()
	case CoreTypeSingBox:
		return true // sing-box 支持所有协议
	default:
		return false
	}
}
