# Dualcore X-UI
简体中文|[ENGLISH](./README_EN.md)  

> 基于 [FranzKafkaYu/x-ui](https://github.com/FranzKafkaYu/x-ui) 二次开发的双核代理面板

**双核架构** - 同时支持 Xray 和 sing-box 两个代理内核  
支持单端口多用户、多协议的代理面板，可在线切换内核、自动下载更新  
通过免费的Telegram bot方便快捷地进行监控、管理你的代理服务  
&#x26A1;`xtls-rprx-vision`与`reality`快速入手请看[这里](https://github.com/FranzKafkaYu/x-ui/wiki/%E8%8A%82%E7%82%B9%E9%85%8D%E7%BD%AE)  
欢迎大家使用并反馈意见或提交Pr,帮助项目更好的改善  
如果您觉得本项目对您有所帮助,不妨给个star:star2:支持我  
或者你恰巧有购买服务器的需求,可以通过文末的赞助部分支持我~ 

# 文档目录  
- [功能介绍](#功能介绍)  
- [一键安装](#一键安装)  
- [效果预览](#效果预览)  
- [快捷方式](#快捷方式)  
- [变更记录](#变更记录)

# 功能介绍

## 🚀 新增特性 (Dualcore)
- **双核架构** - 同时支持 Xray 和 sing-box 内核
- **在线切换** - 一键切换代理内核，无需重启
- **自动下载** - 根据系统架构自动下载对应内核 (amd64/arm64/arm)
- **版本管理** - 支持内核升级、降级
- **新协议支持** - sing-box 内核支持 Hysteria2、TUIC、Naive 等新协议
- **React 前端** - 全新 React 18 + Ant Design 5 现代化界面

## 📋 基础功能
- 系统状态监控
- 支持单端口多用户、多协议，网页可视化操作
- 支持的协议：vmess、vless、trojan、shadowsocks、socks、http、hysteria2、tuic
- 支持配置更多传输配置：http、tcp、ws、grpc、kcp、quic
- 流量统计，限制流量，限制到期时间，一键重置与设备监控
- 可自定义 xray 配置模板
- 支持 https 访问面板（自备域名 + ssl 证书）
- 支持一键SSL证书申请且自动续签
- Telegram bot通知、控制功能
- 更多高级配置项，详见面板 

:bulb:具体**使用、配置细节以及问题排查**请点击这里:point_right:[WIKI](https://github.com/FranzKafkaYu/x-ui/wiki):point_left:  
 Specific **Usages、Configurations and Debug** please refer to [WIKI](https://github.com/FranzKafkaYu/x-ui/wiki)    
# 一键安装
在安装前请确保你的系统支持`bash`环境,且系统网络正常  

```bash
bash <(curl -Ls https://raw.githubusercontent.com/OffroadOps/Dual-core-x-ui/main/install.sh)
```

如需安装指定的版本,可以在上述命令中指定版本号,如指定版本为`v1.0.0`,安装命令如下：    
```bash
bash <(curl -Ls https://raw.githubusercontent.com/OffroadOps/Dual-core-x-ui/main/install.sh) v1.0.0
```

# 效果预览  

> 📸 新版 React 界面截图即将更新...

`Bot使用`:  
<details>
<summary><b>点击查看效果预览</b></summary>  
  
![image](https://user-images.githubusercontent.com/38254177/178551055-893936b7-b75f-4ee8-a773-eee7c6f43f51.png)  
 
</details>  

`流量提醒`:  
<details>
<summary><b>点击查看效果预览</b></summary> 
  
![image](https://user-images.githubusercontent.com/38254177/180039760-dc987a30-e21c-49a3-8e03-19666566a822.png)

</details>  

`SSH提醒`:  
<details>
<summary><b>点击查看效果预览</b></summary> 
  
![image](https://user-images.githubusercontent.com/38254177/180040129-2ec1a7c0-abd3-41dc-aab0-8cd22415c943.png)

</details>  

`限额提醒`:  
<details>
<summary><b>点击查看效果预览</b></summary> 
  
![image](https://user-images.githubusercontent.com/38254177/180040521-af6e9ef8-d7e5-44e8-834e-25b3b8e3e1b5.png)

</details>  

`到期提醒`:  
<details>
<summary><b>点击查看效果预览</b></summary> 
  
![image](https://user-images.githubusercontent.com/38254177/180041690-90ca4b1f-3a2d-470b-bc0c-eca9261a739a.png)

</details>  

`登录提醒`:  
<details>
<summary><b>点击查看效果预览</b></summary> 
  
![image](https://user-images.githubusercontent.com/38254177/180040913-b8bf2fe1-6fc1-43ab-a683-ae23db1866b2.png)  
![image](https://user-images.githubusercontent.com/38254177/180041179-a5f4cd52-a1ba-4aa9-abb2-b94e36722385.png)

</details>  

`用户速览`:  
<details>
<summary><b>点击查看效果预览</b></summary> 
  
![image](https://user-images.githubusercontent.com/38254177/230761101-20431dd7-5bce-489e-9139-0ceb9ab9a2dc.png)

</details>  

`用户查询`:  
<details>
<summary><b>点击查看效果预览</b></summary> 
  
![image](https://user-images.githubusercontent.com/38254177/230761252-c283c02d-82a4-46ce-a180-dfab4048180d.png)

</details>  



# 快捷方式
安装成功后，通过键入`dx`进入控制选项菜单，目前菜单内容：
```
  Dualcore X-UI 面板管理脚本
  0. 退出脚本
————————————————
  1. 安装 dx
  2. 更新 dx
  3. 卸载 dx
————————————————
  4. 重置用户名密码
  5. 重置面板设置
  6. 设置面板端口
  7. 查看当前面板设置
————————————————
  8. 启动 dx
  9. 停止 dx
  10. 重启 dx
  11. 查看 dx 状态
  12. 查看 dx 日志
————————————————
  13. 设置 dx 开机自启
  14. 取消 dx 开机自启
 
面板状态: 已运行
是否开机自启: 是
核心状态: 运行中

请输入选择 [0-14]: 
```
# 配置要求  
## 内存  
- 128MB minimal/256MB+ recommend  
## OS  
- Ubuntu 22+
- Debian 11+





