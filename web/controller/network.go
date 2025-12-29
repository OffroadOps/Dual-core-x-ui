package controller

import (
	"github.com/gin-gonic/gin"
	"x-ui/web/service"
)

type NetworkController struct {
	networkService service.NetworkService
}

func NewNetworkController(g *gin.RouterGroup) *NetworkController {
	a := &NetworkController{}
	a.initRouter(g)
	return a
}

func (a *NetworkController) initRouter(g *gin.RouterGroup) {
	g = g.Group("/network")
	g.POST("/ips", a.getLocalIPs)
}

func (a *NetworkController) getLocalIPs(c *gin.Context) {
	ips, err := a.networkService.GetLocalIPs()
	if err != nil {
		jsonMsg(c, "获取IP列表", err)
		return
	}
	jsonObj(c, ips, nil)
}
