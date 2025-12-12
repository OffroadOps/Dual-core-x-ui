#!/usr/bin/env bash

red='\033[0;31m'
green='\033[0;32m'
yellow='\033[0;33m'
blue='\033[0;34m'
plain='\033[0m'

DOWNLOAD_URL="https://down.ipa.gr/x-ui"
XUI_VERSION="1.0.0"

check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${red}Error: Must run as root${plain}"
        exit 1
    fi
}

check_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        os_release=$ID
    else
        echo -e "${red}Cannot detect OS${plain}"
        exit 1
    fi
    os_release=$(echo "$os_release" | tr '[:upper:]' '[:lower:]')
    echo -e "${green}OS: $os_release${plain}"
}

check_arch() {
    arch=$(uname -m)
    case $arch in
        x86_64|amd64) arch="amd64" ;;
        aarch64|arm64) arch="arm64" ;;
        *)
            echo -e "${red}Unsupported arch: $arch${plain}"
            exit 1
            ;;
    esac
    echo -e "${green}Arch: $arch${plain}"
}

install_deps() {
    echo -e "${blue}Installing dependencies...${plain}"
    apt update -y
    apt install -y wget curl tar gzip unzip
}

download_xui() {
    echo -e "${blue}Downloading x-ui...${plain}"
    cd /tmp
    rm -rf x-ui-* xui-*
    
    if [[ "$arch" == "amd64" ]]; then
        wget -q --show-progress -O x-ui.tar.gz "${DOWNLOAD_URL}/x-ui-amd64-v10.tar.gz"
    else
        wget -q --show-progress -O x-ui.tar.gz "${DOWNLOAD_URL}/x-ui-linux-${arch}.tar.gz"
    fi
    
    if [[ $? -ne 0 ]]; then
        echo -e "${red}Download failed${plain}"
        exit 1
    fi
    tar -xzf x-ui.tar.gz -C /tmp/
    cp -rf /tmp/x-ui-linux-${arch}/* /usr/local/x-ui/
    rm -rf /tmp/x-ui-linux-${arch} x-ui.tar.gz
}

install_xui() {
    systemctl stop x-ui 2>/dev/null
    
    # ?????????
    local is_fresh="false"
    if [[ ! -f "/etc/x-ui/x-ui.db" ]]; then
        is_fresh="true"
    fi
    
    rm -rf /usr/local/x-ui
    mkdir -p /usr/local/x-ui
    mkdir -p /etc/x-ui
    
    download_xui
    
    chmod +x /usr/local/x-ui/x-ui
    chmod +x /usr/local/x-ui/bin/* 2>/dev/null
    
    wget -q -O /usr/bin/x-ui "${DOWNLOAD_URL}/x-ui.sh"
    chmod +x /usr/bin/x-ui
    
    cat > /etc/systemd/system/x-ui.service << EOF
[Unit]
Description=x-ui Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/usr/local/x-ui/
ExecStart=/usr/local/x-ui/x-ui
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable x-ui
    
    echo "$is_fresh"
}

download_xray() {
    echo -e "${blue}Downloading Xray...${plain}"
    mkdir -p /usr/local/x-ui/bin
    xray_version="v1.8.24"
    case $arch in
        amd64) xray_arch="64" ;;
        arm64) xray_arch="arm64-v8a" ;;
    esac
    cd /tmp
    wget -q --show-progress -O xray.zip "https://github.com/XTLS/Xray-core/releases/download/${xray_version}/Xray-linux-${xray_arch}.zip"
    if [[ $? -eq 0 ]]; then
        unzip -o xray.zip -d xray_tmp
        mv xray_tmp/xray /usr/local/x-ui/bin/xray-linux-${arch}
        mv xray_tmp/geoip.dat /usr/local/x-ui/bin/
        mv xray_tmp/geosite.dat /usr/local/x-ui/bin/
        chmod +x /usr/local/x-ui/bin/xray-linux-${arch}
        rm -rf xray.zip xray_tmp
        echo -e "${green}Xray downloaded${plain}"
    else
        echo -e "${yellow}Xray download failed${plain}"
    fi
}

show_result() {
    local is_fresh=$1
    
    echo -e "${blue}Starting x-ui service...${plain}"
    systemctl start x-ui
    sleep 5
    
    server_ip=$(curl -s4 ip.sb 2>/dev/null || curl -s4 ifconfig.me 2>/dev/null || echo "YOUR_IP")
    
    # ???????
    local log_output=$(journalctl -u x-ui --no-pager -n 200 2>/dev/null)
    local username=$(echo "$log_output" | grep "Username:" | tail -1 | awk '{print $NF}')
    local password=$(echo "$log_output" | grep "Password:" | tail -1 | awk '{print $NF}')
    local port=$(echo "$log_output" | grep -i "web server" | grep -oE ':[0-9]+' | tail -1 | tr -d ':')
    
    # ??????????????
    if [[ -z "$port" ]]; then
        port=$(echo "$log_output" | grep -oE 'port[: ]+[0-9]+' | grep -oE '[0-9]+' | tail -1)
    fi
    if [[ -z "$port" ]]; then
        port=$(ss -tlnp | grep x-ui | grep -oE ':[0-9]+' | head -1 | tr -d ':')
    fi
    
    echo ""
    echo -e "${green}======================================================${plain}"
    echo -e "${green}       X-UI v${XUI_VERSION} Installation Complete${plain}"
    echo -e "${green}======================================================${plain}"
    
    if [[ "$is_fresh" == "true" && -n "$username" && -n "$password" ]]; then
        echo ""
        echo -e "  ${yellow}>>> Generated Credentials <<<${plain}"
        echo -e "  ${blue}Username:${plain}  $username"
        echo -e "  ${blue}Password:${plain}  $password"
        if [[ -n "$port" ]]; then
            echo ""
            echo -e "  ${yellow}>>> Panel Access <<<${plain}"
            echo -e "  ${blue}URL:${plain}  http://${server_ip}:${port}/"
        fi
    else
        echo ""
        echo -e "  ${yellow}Server IP:${plain}  $server_ip"
        if [[ -n "$port" ]]; then
            echo -e "  ${yellow}Panel URL:${plain}  http://${server_ip}:${port}/"
        fi
        echo ""
        echo -e "  ${yellow}View credentials:${plain}"
        echo -e "  journalctl -u x-ui | grep -E 'Username|Password'"
    fi
    
    echo ""
    echo -e "${green}------------------------------------------------------${plain}"
    echo -e "  ${yellow}Commands:${plain}"
    echo "    x-ui          - Show menu"
    echo "    x-ui start    - Start service"
    echo "    x-ui stop     - Stop service"
    echo "    x-ui restart  - Restart service"
    echo "    x-ui log      - View logs"
    echo -e "${green}======================================================${plain}"
    echo ""
}

do_install() {
    echo -e "${green}Starting fresh installation...${plain}"
    check_os
    check_arch
    install_deps
    
    is_fresh=$(install_xui)
    download_xray
    show_result "$is_fresh"
}

do_update() {
    echo -e "${green}Updating x-ui...${plain}"
    check_os
    check_arch
    
    systemctl stop x-ui 2>/dev/null
    
    rm -rf /usr/local/x-ui
    mkdir -p /usr/local/x-ui
    
    download_xui
    
    chmod +x /usr/local/x-ui/x-ui
    chmod +x /usr/local/x-ui/bin/* 2>/dev/null
    
    wget -q -O /usr/bin/x-ui "${DOWNLOAD_URL}/x-ui.sh"
    chmod +x /usr/bin/x-ui
    
    systemctl daemon-reload
    systemctl start x-ui
    
    server_ip=$(curl -s4 ip.sb 2>/dev/null || curl -s4 ifconfig.me 2>/dev/null || echo "YOUR_IP")
    port=$(ss -tlnp 2>/dev/null | grep x-ui | grep -oE ':[0-9]+' | head -1 | tr -d ':')
    
    echo ""
    echo -e "${green}======================================================${plain}"
    echo -e "${green}       X-UI v${XUI_VERSION} Update Complete${plain}"
    echo -e "${green}======================================================${plain}"
    echo ""
    echo -e "  ${yellow}Your config and database have been preserved.${plain}"
    if [[ -n "$port" ]]; then
        echo -e "  ${yellow}Panel URL:${plain}  http://${server_ip}:${port}/"
    fi
    echo ""
}

do_reinstall() {
    echo -e "${yellow}Reinstalling x-ui (keeping config)...${plain}"
    read -p "Continue? [y/n]: " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "Cancelled."
        exit 0
    fi
    do_update
}

do_uninstall() {
    echo -e "${red}Uninstalling x-ui...${plain}"
    read -p "Delete all data? [y/n]: " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "Cancelled."
        exit 0
    fi
    
    systemctl stop x-ui 2>/dev/null
    systemctl disable x-ui 2>/dev/null
    rm -rf /usr/local/x-ui
    rm -rf /etc/x-ui
    rm -f /etc/systemd/system/x-ui.service
    rm -f /usr/bin/x-ui
    systemctl daemon-reload
    
    echo -e "${green}x-ui has been uninstalled.${plain}"
}

show_menu() {
    clear
    echo -e "${green}======================================${plain}"
    echo -e "${green}  X-UI Installation Script v${XUI_VERSION}${plain}"
    echo -e "${green}  Supports: Debian 9+, Ubuntu 18.04+${plain}"
    echo -e "${green}======================================${plain}"
    echo ""
    echo -e "  ${green}1.${plain} Install x-ui"
    echo -e "  ${green}2.${plain} Reinstall x-ui (keep config)"
    echo -e "  ${red}3.${plain} Uninstall x-ui"
    echo -e "  ${blue}4.${plain} Update x-ui"
    echo ""
    echo -e "  ${green}0.${plain} Exit"
    echo ""
    read -p "Please select [0-4]: " choice
    
    case $choice in
        1) do_install ;;
        2) do_reinstall ;;
        3) do_uninstall ;;
        4) do_update ;;
        0) exit 0 ;;
        *) echo -e "${red}Invalid option${plain}"; exit 1 ;;
    esac
}

main() {
    check_root
    
    case "$1" in
        install) do_install ;;
        reinstall) do_reinstall ;;
        uninstall) do_uninstall ;;
        update) do_update ;;
        *) show_menu ;;
    esac
}

main "$@"