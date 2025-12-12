package random

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"net"
)

var numSeq [10]rune
var lowerSeq [26]rune
var upperSeq [26]rune
var numLowerSeq [36]rune
var numUpperSeq [36]rune
var allSeq [62]rune
var specialSeq = []rune("!@#$%^&*()_+-=[]{}|;:,.<>?")

func init() {
	for i := 0; i < 10; i++ {
		numSeq[i] = rune('0' + i)
	}
	for i := 0; i < 26; i++ {
		lowerSeq[i] = rune('a' + i)
		upperSeq[i] = rune('A' + i)
	}

	copy(numLowerSeq[:], numSeq[:])
	copy(numLowerSeq[len(numSeq):], lowerSeq[:])

	copy(numUpperSeq[:], numSeq[:])
	copy(numUpperSeq[len(numSeq):], upperSeq[:])

	copy(allSeq[:], numSeq[:])
	copy(allSeq[len(numSeq):], lowerSeq[:])
	copy(allSeq[len(numSeq)+len(lowerSeq):], upperSeq[:])
}

// cryptoRandInt 使用加密安全的随机数生成器
func cryptoRandInt(max int) int {
	n, err := rand.Int(rand.Reader, big.NewInt(int64(max)))
	if err != nil {
		// fallback: 不应该发生
		return 0
	}
	return int(n.Int64())
}

// Seq 生成指定长度的随机字符串（字母+数字）
func Seq(n int) string {
	runes := make([]rune, n)
	for i := 0; i < n; i++ {
		runes[i] = allSeq[cryptoRandInt(len(allSeq))]
	}
	return string(runes)
}

// Num 生成指定长度的随机数字字符串
func Num(n int) string {
	runes := make([]rune, n)
	for i := 0; i < n; i++ {
		runes[i] = numSeq[cryptoRandInt(len(numSeq))]
	}
	return string(runes)
}

// Lower 生成指定长度的随机小写字母字符串
func Lower(n int) string {
	runes := make([]rune, n)
	for i := 0; i < n; i++ {
		runes[i] = lowerSeq[cryptoRandInt(len(lowerSeq))]
	}
	return string(runes)
}

// Password 生成安全的随机密码（包含大小写字母、数字和特殊字符）
func Password(n int) string {
	if n < 8 {
		n = 8
	}
	
	// 确保至少包含各类字符
	runes := make([]rune, n)
	runes[0] = lowerSeq[cryptoRandInt(len(lowerSeq))]
	runes[1] = upperSeq[cryptoRandInt(len(upperSeq))]
	runes[2] = numSeq[cryptoRandInt(len(numSeq))]
	runes[3] = specialSeq[cryptoRandInt(len(specialSeq))]
	
	// 填充剩余字符
	allWithSpecial := append(allSeq[:], specialSeq...)
	for i := 4; i < n; i++ {
		runes[i] = allWithSpecial[cryptoRandInt(len(allWithSpecial))]
	}
	
	// 打乱顺序
	for i := n - 1; i > 0; i-- {
		j := cryptoRandInt(i + 1)
		runes[i], runes[j] = runes[j], runes[i]
	}
	
	return string(runes)
}

// Username 生成随机用户名（小写字母开头，后跟字母数字）
func Username(n int) string {
	if n < 4 {
		n = 4
	}
	runes := make([]rune, n)
	runes[0] = lowerSeq[cryptoRandInt(len(lowerSeq))]
	for i := 1; i < n; i++ {
		runes[i] = numLowerSeq[cryptoRandInt(len(numLowerSeq))]
	}
	return string(runes)
}

// Port 生成随机端口号（范围：10000-65534）
// 会自动跳过已被占用的端口
func Port() int {
	const minPort = 10000
	const maxPort = 65534
	
	for attempts := 0; attempts < 100; attempts++ {
		port := minPort + cryptoRandInt(maxPort-minPort+1)
		if !IsPortInUse(port) {
			return port
		}
	}
	// 如果尝试100次都找不到可用端口，返回一个随机端口
	return minPort + cryptoRandInt(maxPort-minPort+1)
}

// PortInRange 在指定范围内生成随机端口
func PortInRange(min, max int) int {
	if min < 1 {
		min = 1
	}
	if max > 65535 {
		max = 65535
	}
	if min > max {
		min, max = max, min
	}
	
	for attempts := 0; attempts < 100; attempts++ {
		port := min + cryptoRandInt(max-min+1)
		if !IsPortInUse(port) {
			return port
		}
	}
	return min + cryptoRandInt(max-min+1)
}

// IsPortInUse 检查端口是否被占用
func IsPortInUse(port int) bool {
	addr := fmt.Sprintf(":%d", port)
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return true
	}
	listener.Close()
	return false
}

// UUID 生成 UUID v4
func UUID() string {
	uuid := make([]byte, 16)
	rand.Read(uuid)
	
	// 设置版本号 (4) 和变体
	uuid[6] = (uuid[6] & 0x0f) | 0x40
	uuid[8] = (uuid[8] & 0x3f) | 0x80
	
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		uuid[0:4], uuid[4:6], uuid[6:8], uuid[8:10], uuid[10:16])
}
