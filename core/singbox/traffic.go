// Package singbox sing-box 流量统计实现
package singbox

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"x-ui/core"
	"x-ui/logger"
)

// ClashAPIClient Clash API 客户端
type ClashAPIClient struct {
	baseURL string
	secret  string
	client  *http.Client
}

// NewClashAPIClient 创建 Clash API 客户端
func NewClashAPIClient(port int, secret string) *ClashAPIClient {
	return &ClashAPIClient{
		baseURL: fmt.Sprintf("http://127.0.0.1:%d", port),
		secret:  secret,
		client: &http.Client{
			Timeout: time.Second * 5,
		},
	}
}

// TrafficResponse 流量响应
type TrafficResponse struct {
	Up   int64 `json:"up"`
	Down int64 `json:"down"`
}

// ConnectionsResponse 连接响应
type ConnectionsResponse struct {
	DownloadTotal int64        `json:"downloadTotal"`
	UploadTotal   int64        `json:"uploadTotal"`
	Connections   []Connection `json:"connections"`
}

// Connection 单个连接信息
type Connection struct {
	ID          string   `json:"id"`
	Upload      int64    `json:"upload"`
	Download    int64    `json:"download"`
	Start       string   `json:"start"`
	Chains      []string `json:"chains"`
	Rule        string   `json:"rule"`
	RulePayload string   `json:"rulePayload"`
	Metadata    Metadata `json:"metadata"`
}

// Metadata 连接元数据
type Metadata struct {
	Network         string `json:"network"`
	Type            string `json:"type"`
	SourceIP        string `json:"sourceIP"`
	DestinationIP   string `json:"destinationIP"`
	SourcePort      string `json:"sourcePort"`
	DestinationPort string `json:"destinationPort"`
	Host            string `json:"host"`
	DNSMode         string `json:"dnsMode"`
	InboundTag      string `json:"inboundTag,omitempty"`
}

// doRequest 执行 HTTP 请求
func (c *ClashAPIClient) doRequest(method, path string) ([]byte, error) {
	req, err := http.NewRequest(method, c.baseURL+path, nil)
	if err != nil {
		return nil, err
	}

	if c.secret != "" {
		req.Header.Set("Authorization", "Bearer "+c.secret)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}

// GetTraffic 获取总流量
func (c *ClashAPIClient) GetTraffic() (*TrafficResponse, error) {
	data, err := c.doRequest("GET", "/traffic")
	if err != nil {
		return nil, err
	}

	var traffic TrafficResponse
	if err := json.Unmarshal(data, &traffic); err != nil {
		return nil, err
	}

	return &traffic, nil
}

// GetConnections 获取所有连接
func (c *ClashAPIClient) GetConnections() (*ConnectionsResponse, error) {
	data, err := c.doRequest("GET", "/connections")
	if err != nil {
		return nil, err
	}

	var conns ConnectionsResponse
	if err := json.Unmarshal(data, &conns); err != nil {
		return nil, err
	}

	return &conns, nil
}

// CloseConnection 关闭指定连接
func (c *ClashAPIClient) CloseConnection(id string) error {
	_, err := c.doRequest("DELETE", "/connections/"+id)
	return err
}

// CloseAllConnections 关闭所有连接
func (c *ClashAPIClient) CloseAllConnections() error {
	_, err := c.doRequest("DELETE", "/connections")
	return err
}

// SingBoxTrafficCollector sing-box 流量收集器
type SingBoxTrafficCollector struct {
	client     *ClashAPIClient
	lastTraffic map[string]*core.InboundTraffic
}

// NewSingBoxTrafficCollector 创建流量收集器
func NewSingBoxTrafficCollector(apiPort int, secret string) *SingBoxTrafficCollector {
	return &SingBoxTrafficCollector{
		client:     NewClashAPIClient(apiPort, secret),
		lastTraffic: make(map[string]*core.InboundTraffic),
	}
}

// CollectTraffic 收集流量统计
func (c *SingBoxTrafficCollector) CollectTraffic() ([]core.InboundTraffic, error) {
	conns, err := c.client.GetConnections()
	if err != nil {
		logger.Warning("Failed to get connections from sing-box:", err)
		return nil, err
	}

	// 按入站标签聚合流量
	trafficMap := make(map[string]*core.InboundTraffic)

	for _, conn := range conns.Connections {
		tag := conn.Metadata.InboundTag
		if tag == "" {
			tag = "default"
		}

		if _, ok := trafficMap[tag]; !ok {
			trafficMap[tag] = &core.InboundTraffic{
				Tag: tag,
			}
		}

		trafficMap[tag].Traffic.Up += conn.Upload
		trafficMap[tag].Traffic.Down += conn.Download
	}

	result := make([]core.InboundTraffic, 0, len(trafficMap))
	for _, t := range trafficMap {
		result = append(result, *t)
	}

	return result, nil
}

// GetTotalTraffic 获取总流量
func (c *SingBoxTrafficCollector) GetTotalTraffic() (up, down int64, err error) {
	conns, err := c.client.GetConnections()
	if err != nil {
		return 0, 0, err
	}

	return conns.UploadTotal, conns.DownloadTotal, nil
}
