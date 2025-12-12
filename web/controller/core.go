package controller

import (
	"github.com/gin-gonic/gin"
	"x-ui/core"
	"x-ui/web/service"
)

type CoreController struct {
	coreService service.CoreService
}

func NewCoreController(g *gin.RouterGroup) *CoreController {
	c := &CoreController{}
	c.initRouter(g)
	return c
}

func (c *CoreController) initRouter(g *gin.RouterGroup) {
	g = g.Group("/core")

	g.GET("/status", c.getStatus)
	g.GET("/list", c.listCores)
	g.POST("/switch", c.switchCore)
	g.POST("/start", c.startCore)
	g.POST("/stop", c.stopCore)
	g.POST("/restart", c.restartCore)
	g.GET("/versions/:type", c.getVersions)
	g.POST("/download", c.downloadCore)
	g.POST("/update-geo", c.updateGeoFiles)
}

func (c *CoreController) getStatus(ctx *gin.Context) {
	status := c.coreService.GetAllCoreStatus()
	activeType := c.coreService.GetActiveCoreType()

	jsonObj(ctx, gin.H{
		"active": activeType,
		"status": status,
	}, nil)
}

func (c *CoreController) listCores(ctx *gin.Context) {
	cores := c.coreService.ListCores()
	jsonObj(ctx, cores, nil)
}

func (c *CoreController) switchCore(ctx *gin.Context) {
	var req struct {
		Type string `json:"type"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		jsonMsg(ctx, "Invalid request", err)
		return
	}

	coreType := core.CoreType(req.Type)
	err := c.coreService.SetActiveCoreType(coreType)
	if err != nil {
		jsonMsg(ctx, "Failed to switch core", err)
		return
	}

	// 重启以应用新内核
	if c.coreService.IsCoreRunning() {
		err = c.coreService.RestartCore()
		if err != nil {
			jsonMsg(ctx, "Core switched but failed to restart", err)
			return
		}
	}

	jsonMsg(ctx, "Core switched successfully", nil)
}

func (c *CoreController) startCore(ctx *gin.Context) {
	err := c.coreService.StartCore()
	if err != nil {
		jsonMsg(ctx, "Failed to start core", err)
		return
	}
	jsonMsg(ctx, "Core started", nil)
}

func (c *CoreController) stopCore(ctx *gin.Context) {
	err := c.coreService.StopCore()
	if err != nil {
		jsonMsg(ctx, "Failed to stop core", err)
		return
	}
	jsonMsg(ctx, "Core stopped", nil)
}

func (c *CoreController) restartCore(ctx *gin.Context) {
	err := c.coreService.RestartCore()
	if err != nil {
		jsonMsg(ctx, "Failed to restart core", err)
		return
	}
	jsonMsg(ctx, "Core restarted", nil)
}

func (c *CoreController) getVersions(ctx *gin.Context) {
	coreType := core.CoreType(ctx.Param("type"))
	versions, err := c.coreService.GetCoreVersions(coreType)
	if err != nil {
		jsonObj(ctx, nil, err)
		return
	}
	jsonObj(ctx, versions, nil)
}

func (c *CoreController) downloadCore(ctx *gin.Context) {
	var req struct {
		Type    string `json:"type"`
		Version string `json:"version"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		jsonMsg(ctx, "Invalid request", err)
		return
	}

	coreType := core.CoreType(req.Type)
	err := c.coreService.DownloadCore(coreType, req.Version)
	if err != nil {
		jsonMsg(ctx, "Failed to download core", err)
		return
	}

	jsonMsg(ctx, "Core downloaded successfully", nil)
}

func (c *CoreController) updateGeoFiles(ctx *gin.Context) {
	err := c.coreService.UpdateGeoFiles()
	if err != nil {
		jsonMsg(ctx, "Failed to update geo files", err)
		return
	}
	jsonMsg(ctx, "Geo files updated successfully", nil)
}
