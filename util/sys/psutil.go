package sys

import (
	_ "unsafe"

	_ "github.com/shirou/gopsutil/v3/cpu"
)

//go:linkname HostProc github.com/shirou/gopsutil/v3/internal/common.HostProc
func HostProc(combineWith ...string) string
