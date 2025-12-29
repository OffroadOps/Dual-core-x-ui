package controller

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"strconv"
	"x-ui/database/model"
	"x-ui/logger"
	"x-ui/web/global"
	"x-ui/web/service"
	"x-ui/web/session"
)

type InboundController struct {
	inboundService service.InboundService
	xrayService    service.XrayService
}

func NewInboundController(g *gin.RouterGroup) *InboundController {
	a := &InboundController{}
	a.initRouter(g)
	a.startTask()
	return a
}

func (a *InboundController) initRouter(g *gin.RouterGroup) {
	g = g.Group("/inbound")

	g.POST("/list", a.getInbounds)
	g.POST("/add", a.addInbound)
	g.POST("/addMulti", a.addMultiInbound)
	g.POST("/del/:id", a.delInbound)
	g.POST("/update/:id", a.updateInbound)
}

func (a *InboundController) startTask() {
	webServer := global.GetWebServer()
	c := webServer.GetCron()
	c.AddFunc("@every 10s", func() {
		if a.xrayService.IsNeedRestartAndSetFalse() {
			err := a.xrayService.RestartXray(false)
			if err != nil {
				logger.Error("restart xray failed:", err)
			}
		}
	})
}

func (a *InboundController) getInbounds(c *gin.Context) {
	user := session.GetLoginUser(c)
	inbounds, err := a.inboundService.GetInbounds(user.Id)
	if err != nil {
		jsonMsg(c, "获取", err)
		return
	}
	jsonObj(c, inbounds, nil)
}

func (a *InboundController) addInbound(c *gin.Context) {
	inbound := &model.Inbound{}
	err := c.ShouldBind(inbound)
	if err != nil {
		jsonMsg(c, "添加", err)
		return
	}
	user := session.GetLoginUser(c)
	inbound.UserId = user.Id
	inbound.Enable = true
	inbound.Tag = fmt.Sprintf("inbound-%v", inbound.Port)
	err = a.inboundService.AddInbound(inbound)
	jsonMsg(c, "添加", err)
	if err == nil {
		a.xrayService.SetToNeedRestart()
	}
}

func (a *InboundController) delInbound(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		jsonMsg(c, "删除", err)
		return
	}
	err = a.inboundService.DelInbound(id)
	jsonMsg(c, "删除", err)
	if err == nil {
		a.xrayService.SetToNeedRestart()
	}
}

func (a *InboundController) updateInbound(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		jsonMsg(c, "修改", err)
		return
	}
	inbound := &model.Inbound{
		Id: id,
	}
	err = c.ShouldBind(inbound)
	if err != nil {
		jsonMsg(c, "修改", err)
		return
	}
	err = a.inboundService.UpdateInbound(inbound)
	jsonMsg(c, "修改", err)
	if err == nil {
		a.xrayService.SetToNeedRestart()
	}
}

// MultiInboundRequest 批量添加入站请求
type MultiInboundRequest struct {
	IPs        []string `json:"ips" form:"ips"`
	PortMode   string   `json:"portMode" form:"portMode"` // same: 同端口, random: 随机端口
	BasePort   int      `json:"basePort" form:"basePort"`
	Remark     string   `json:"remark" form:"remark"`
	ExpiryTime int64    `json:"expiryTime" form:"expiryTime"`
	Total      int64    `json:"total" form:"total"`

	Protocol       string `json:"protocol" form:"protocol"`
	Settings       string `json:"settings" form:"settings"`
	StreamSettings string `json:"streamSettings" form:"streamSettings"`
	Sniffing       string `json:"sniffing" form:"sniffing"`
}

func (a *InboundController) addMultiInbound(c *gin.Context) {
	req := &MultiInboundRequest{}
	err := c.ShouldBind(req)
	if err != nil {
		jsonMsg(c, "批量添加", err)
		return
	}

	if len(req.IPs) == 0 {
		jsonMsg(c, "批量添加", fmt.Errorf("请至少选择一个IP"))
		return
	}

	user := session.GetLoginUser(c)
	var inbounds []*model.Inbound

	for i, ip := range req.IPs {
		port := req.BasePort
		if req.PortMode == "random" {
			// 随机端口模式：基础端口 + 索引
			port = req.BasePort + i
		}

		inbound := &model.Inbound{
			UserId:         user.Id,
			Up:             0,
			Down:           0,
			Total:          req.Total,
			Remark:         fmt.Sprintf("%s-%s", req.Remark, ip),
			Enable:         true,
			ExpiryTime:     req.ExpiryTime,
			Listen:         ip,
			Port:           port,
			Protocol:       model.Protocol(req.Protocol),
			Settings:       req.Settings,
			StreamSettings: req.StreamSettings,
			Tag:            fmt.Sprintf("inbound-%s-%v", ip, port),
			Sniffing:       req.Sniffing,
		}
		inbounds = append(inbounds, inbound)
	}

	err = a.inboundService.AddInbounds(inbounds)
	jsonMsg(c, "批量添加", err)
	if err == nil {
		a.xrayService.SetToNeedRestart()
	}
}
