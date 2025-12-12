// Package core 提供多内核管理功能
package core

import (
	"context"
	"errors"
	"sync"

	"x-ui/logger"
)

// Manager 多内核管理器
// 管理多个代理内核的生命周期和配置
type Manager struct {
	mu sync.RWMutex

	cores          map[CoreType]Core
	configBuilders map[CoreType]ConfigBuilder
	activeCore     CoreType
}

// NewManager 创建内核管理器
func NewManager() *Manager {
	return &Manager{
		cores:          make(map[CoreType]Core),
		configBuilders: make(map[CoreType]ConfigBuilder),
		activeCore:     CoreTypeXray, // 默认使用 Xray
	}
}

// RegisterCore 注册内核
func (m *Manager) RegisterCore(core Core) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.cores[core.Type()] = core
	logger.Infof("Registered core: %s (%s)", core.Name(), core.Version())
}

// RegisterConfigBuilder 注册配置构建器
func (m *Manager) RegisterConfigBuilder(coreType CoreType, builder ConfigBuilder) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.configBuilders[coreType] = builder
}

// GetCore 获取指定类型的内核
func (m *Manager) GetCore(coreType CoreType) (Core, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	core, ok := m.cores[coreType]
	return core, ok
}

// GetActiveCore 获取当前活动的内核
func (m *Manager) GetActiveCore() Core {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.cores[m.activeCore]
}

// SetActiveCore 设置活动内核
func (m *Manager) SetActiveCore(coreType CoreType) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.cores[coreType]; !ok {
		return errors.New("core not registered: " + string(coreType))
	}

	m.activeCore = coreType
	logger.Infof("Active core set to: %s", coreType)
	return nil
}

// GetActiveCoreType 获取当前活动内核类型
func (m *Manager) GetActiveCoreType() CoreType {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.activeCore
}

// GetConfigBuilder 获取配置构建器
func (m *Manager) GetConfigBuilder(coreType CoreType) (ConfigBuilder, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	builder, ok := m.configBuilders[coreType]
	return builder, ok
}

// Start 启动指定内核
func (m *Manager) Start(ctx context.Context, coreType CoreType, config []byte) error {
	core, ok := m.GetCore(coreType)
	if !ok {
		return errors.New("core not registered: " + string(coreType))
	}

	return core.Start(ctx, config)
}

// StartActive 启动活动内核
func (m *Manager) StartActive(ctx context.Context, config []byte) error {
	return m.Start(ctx, m.GetActiveCoreType(), config)
}

// Stop 停止指定内核
func (m *Manager) Stop(coreType CoreType) error {
	core, ok := m.GetCore(coreType)
	if !ok {
		return errors.New("core not registered: " + string(coreType))
	}

	return core.Stop()
}

// StopActive 停止活动内核
func (m *Manager) StopActive() error {
	return m.Stop(m.GetActiveCoreType())
}

// StopAll 停止所有内核
func (m *Manager) StopAll() {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, core := range m.cores {
		if core.IsRunning() {
			if err := core.Stop(); err != nil {
				logger.Warningf("Failed to stop %s: %v", core.Name(), err)
			}
		}
	}
}

// Restart 重启指定内核
func (m *Manager) Restart(coreType CoreType, config []byte) error {
	core, ok := m.GetCore(coreType)
	if !ok {
		return errors.New("core not registered: " + string(coreType))
	}

	return core.Restart(config)
}

// RestartActive 重启活动内核
func (m *Manager) RestartActive(config []byte) error {
	return m.Restart(m.GetActiveCoreType(), config)
}

// IsRunning 检查指定内核是否运行中
func (m *Manager) IsRunning(coreType CoreType) bool {
	core, ok := m.GetCore(coreType)
	if !ok {
		return false
	}
	return core.IsRunning()
}

// IsActiveRunning 检查活动内核是否运行中
func (m *Manager) IsActiveRunning() bool {
	return m.IsRunning(m.GetActiveCoreType())
}

// GetStatus 获取指定内核状态
func (m *Manager) GetStatus(coreType CoreType) *Status {
	core, ok := m.GetCore(coreType)
	if !ok {
		return &Status{State: StateStopped}
	}
	return core.Status()
}

// GetActiveStatus 获取活动内核状态
func (m *Manager) GetActiveStatus() *Status {
	return m.GetStatus(m.GetActiveCoreType())
}

// GetAllStatus 获取所有内核状态
func (m *Manager) GetAllStatus() map[CoreType]*Status {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make(map[CoreType]*Status)
	for coreType, core := range m.cores {
		result[coreType] = core.Status()
	}
	return result
}

// BuildConfig 使用指定内核的配置构建器构建配置
func (m *Manager) BuildConfig(coreType CoreType, inbounds []InboundConfig) ([]byte, error) {
	builder, ok := m.GetConfigBuilder(coreType)
	if !ok {
		return nil, errors.New("config builder not registered: " + string(coreType))
	}
	return builder.Build(inbounds)
}

// BuildActiveConfig 使用活动内核的配置构建器构建配置
func (m *Manager) BuildActiveConfig(inbounds []InboundConfig) ([]byte, error) {
	return m.BuildConfig(m.GetActiveCoreType(), inbounds)
}

// GetTraffic 获取指定内核的流量统计
func (m *Manager) GetTraffic(coreType CoreType) ([]InboundTraffic, error) {
	core, ok := m.GetCore(coreType)
	if !ok {
		return nil, errors.New("core not registered: " + string(coreType))
	}
	return core.GetTraffic()
}

// GetActiveTraffic 获取活动内核的流量统计
func (m *Manager) GetActiveTraffic() ([]InboundTraffic, error) {
	return m.GetTraffic(m.GetActiveCoreType())
}

// ListCores 列出所有已注册的内核
func (m *Manager) ListCores() []CoreInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]CoreInfo, 0, len(m.cores))
	for coreType, core := range m.cores {
		result = append(result, CoreInfo{
			Type:     coreType,
			Name:     core.Name(),
			Version:  core.Version(),
			IsActive: coreType == m.activeCore,
			Status:   core.Status(),
		})
	}
	return result
}

// CoreInfo 内核信息
type CoreInfo struct {
	Type     CoreType `json:"type"`
	Name     string   `json:"name"`
	Version  string   `json:"version"`
	IsActive bool     `json:"isActive"`
	Status   *Status  `json:"status"`
}

// SelectCoreForProtocol 根据协议选择合适的内核
func (m *Manager) SelectCoreForProtocol(protocol Protocol) CoreType {
	// 如果是 sing-box 专属协议，必须使用 sing-box
	if protocol.IsSingBoxOnly() {
		return CoreTypeSingBox
	}
	// 否则使用当前活动内核
	return m.GetActiveCoreType()
}

// CanHandleProtocol 检查当前活动内核是否能处理指定协议
func (m *Manager) CanHandleProtocol(protocol Protocol) bool {
	return protocol.SupportedBy(m.GetActiveCoreType())
}
