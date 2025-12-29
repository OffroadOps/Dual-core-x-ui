package service

import (
	"net"
	"sort"
)

type NetworkService struct {
}

type IPInfo struct {
	IP        string `json:"ip"`
	Interface string `json:"interface"`
	IsIPv6    bool   `json:"isIPv6"`
}

// GetLocalIPs 获取本机所有网卡的 IP 地址
func (s *NetworkService) GetLocalIPs() ([]IPInfo, error) {
	var ips []IPInfo

	interfaces, err := net.Interfaces()
	if err != nil {
		return nil, err
	}

	for _, iface := range interfaces {
		// 跳过 down 状态的网卡
		if iface.Flags&net.FlagUp == 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}

			if ip == nil {
				continue
			}

			// 跳过回环地址
			if ip.IsLoopback() {
				continue
			}

			ipInfo := IPInfo{
				IP:        ip.String(),
				Interface: iface.Name,
				IsIPv6:    ip.To4() == nil,
			}
			ips = append(ips, ipInfo)
		}
	}

	// 按 IP 排序，IPv4 优先
	sort.Slice(ips, func(i, j int) bool {
		if ips[i].IsIPv6 != ips[j].IsIPv6 {
			return !ips[i].IsIPv6
		}
		return ips[i].IP < ips[j].IP
	})

	return ips, nil
}
