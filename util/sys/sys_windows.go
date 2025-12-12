//go:build windows

package sys

// GetTCPCount returns the number of TCP connections on Windows
func GetTCPCount() (int, error) {
	// Windows implementation - simplified version
	// In production, could use netstat or Windows API
	return 0, nil
}

// GetUDPCount returns the number of UDP connections on Windows
func GetUDPCount() (int, error) {
	// Windows implementation - simplified version
	return 0, nil
}
