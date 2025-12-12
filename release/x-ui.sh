#!/bin/bash

red='\033[0;31m'
green='\033[0;32m'
yellow='\033[0;33m'
plain='\033[0m'

#consts for log check and clear,unit:M
declare -r DEFAULT_LOG_FILE_DELETE_TRIGGER=35

# consts for geo update
PATH_FOR_GEO_IP='/usr/local/x-ui/bin/geoip.dat'
PATH_FOR_CONFIG='/usr/local/x-ui/bin/config.json'
PATH_FOR_GEO_SITE='/usr/local/x-ui/bin/geosite.dat'
URL_FOR_GEO_IP='https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geoip.dat'
URL_FOR_GEO_SITE='https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geosite.dat'

#Add some basic function here
function LOGD() {
    echo -e "${yellow}[DEG] $* ${plain}"
}

function LOGE() {
    echo -e "${red}[ERR] $* ${plain}"
}

function LOGI() {
    echo -e "${green}[INF] $* ${plain}"
}
# check root
[[ $EUID -ne 0 ]] && LOGE "閿欒:  蹇呴』浣跨敤root鐢ㄦ埛杩愯姝よ剼鏈?\n" && exit 1

# check os
if [[ -f /etc/redhat-release ]]; then
    release="centos"
elif cat /etc/issue | grep -Eqi "debian"; then
    release="debian"
elif cat /etc/issue | grep -Eqi "ubuntu"; then
    release="ubuntu"
elif cat /etc/issue | grep -Eqi "centos|red hat|redhat"; then
    release="centos"
elif cat /proc/version | grep -Eqi "debian"; then
    release="debian"
elif cat /proc/version | grep -Eqi "ubuntu"; then
    release="ubuntu"
elif cat /proc/version | grep -Eqi "centos|red hat|redhat"; then
    release="centos"
else
    LOGE "鏈娴嬪埌绯荤粺鐗堟湰锛岃鑱旂郴鑴氭湰浣滆€咃紒\n" && exit 1
fi

os_version=""

# os version
if [[ -f /etc/os-release ]]; then
    os_version=$(awk -F'[= ."]' '/VERSION_ID/{print $3}' /etc/os-release)
fi
if [[ -z "$os_version" && -f /etc/lsb-release ]]; then
    os_version=$(awk -F'[= ."]+' '/DISTRIB_RELEASE/{print $2}' /etc/lsb-release)
fi

if [[ x"${release}" == x"centos" ]]; then
    if [[ ${os_version} -le 6 ]]; then
        LOGE "璇蜂娇鐢?CentOS 7 鎴栨洿楂樼増鏈殑绯荤粺锛乗n" && exit 1
    fi
elif [[ x"${release}" == x"ubuntu" ]]; then
    if [[ ${os_version} -lt 16 ]]; then
        LOGE "璇蜂娇鐢?Ubuntu 16 鎴栨洿楂樼増鏈殑绯荤粺锛乗n" && exit 1
    fi
elif [[ x"${release}" == x"debian" ]]; then
    if [[ ${os_version} -lt 8 ]]; then
        LOGE "璇蜂娇鐢?Debian 8 鎴栨洿楂樼増鏈殑绯荤粺锛乗n" && exit 1
    fi
fi

confirm() {
    if [[ $# > 1 ]]; then
        echo && read -p "$1 [榛樿$2]: " temp
        if [[ x"${temp}" == x"" ]]; then
            temp=$2
        fi
    else
        read -p "$1 [y/n]: " temp
    fi
    if [[ x"${temp}" == x"y" || x"${temp}" == x"Y" ]]; then
        return 0
    else
        return 1
    fi
}

confirm_restart() {
    confirm "鏄惁閲嶅惎闈㈡澘锛岄噸鍚潰鏉夸篃浼氶噸鍚?xray" "y"
    if [[ $? == 0 ]]; then
        restart
    else
        show_menu
    fi
}

before_show_menu() {
    echo && echo -n -e "${yellow}鎸夊洖杞﹁繑鍥炰富鑿滃崟: ${plain}" && read temp
    show_menu
}

install() {
    bash <(curl -Ls https://raw.githubusercontent.com/FranzKafkaYu/x-ui/master/install.sh)
    if [[ $? == 0 ]]; then
        if [[ $# == 0 ]]; then
            start
        else
            start 0
        fi
    fi
}

update() {
    confirm "鏈姛鑳戒細寮哄埗閲嶈褰撳墠鏈€鏂扮増锛屾暟鎹笉浼氫涪澶憋紝鏄惁缁х画?" "n"
    if [[ $? != 0 ]]; then
        LOGE "宸插彇娑?
        if [[ $# == 0 ]]; then
            before_show_menu
        fi
        return 0
    fi
    bash <(curl -Ls https://raw.githubusercontent.com/FranzKafkaYu/x-ui/master/install.sh)
    if [[ $? == 0 ]]; then
        LOGI "鏇存柊瀹屾垚锛屽凡鑷姩閲嶅惎闈㈡澘 "
        exit 0
    fi
}

uninstall() {
    confirm "纭畾瑕佸嵏杞介潰鏉垮悧,xray 涔熶細鍗歌浇?" "n"
    if [[ $? != 0 ]]; then
        if [[ $# == 0 ]]; then
            show_menu
        fi
        return 0
    fi
    systemctl stop x-ui
    systemctl disable x-ui
    rm /etc/systemd/system/x-ui.service -f
    systemctl daemon-reload
    systemctl reset-failed
    rm /etc/x-ui/ -rf
    rm /usr/local/x-ui/ -rf

    echo ""
    echo -e "鍗歌浇鎴愬姛锛屽鏋滀綘鎯冲垹闄ゆ鑴氭湰锛屽垯閫€鍑鸿剼鏈悗杩愯 ${green}rm /usr/bin/x-ui -f${plain} 杩涜鍒犻櫎"
    echo ""

    if [[ $# == 0 ]]; then
        before_show_menu
    fi
}

reset_user() {
    confirm "纭畾瑕佸皢鐢ㄦ埛鍚嶅拰瀵嗙爜閲嶇疆涓?admin 鍚? "n"
    if [[ $? != 0 ]]; then
        if [[ $# == 0 ]]; then
            show_menu
        fi
        return 0
    fi
    /usr/local/x-ui/x-ui setting -username admin -password admin
    echo -e "鐢ㄦ埛鍚嶅拰瀵嗙爜宸查噸缃负 ${green}admin${plain}锛岀幇鍦ㄨ閲嶅惎闈㈡澘"
    confirm_restart
}

reset_config() {
    confirm "纭畾瑕侀噸缃墍鏈夐潰鏉胯缃悧锛岃处鍙锋暟鎹笉浼氫涪澶憋紝鐢ㄦ埛鍚嶅拰瀵嗙爜涓嶄細鏀瑰彉" "n"
    if [[ $? != 0 ]]; then
        if [[ $# == 0 ]]; then
            show_menu
        fi
        return 0
    fi
    /usr/local/x-ui/x-ui setting -reset
    echo -e "鎵€鏈夐潰鏉胯缃凡閲嶇疆涓洪粯璁ゅ€硷紝鐜板湪璇烽噸鍚潰鏉匡紝骞朵娇鐢ㄩ粯璁ょ殑 ${green}54321${plain} 绔彛璁块棶闈㈡澘"
    confirm_restart
}

check_config() {
    info=$(/usr/local/x-ui/x-ui setting -show true)
    if [[ $? != 0 ]]; then
        LOGE "get current settings error,please check logs"
        show_menu
    fi
    LOGI "${info}"
}

set_port() {
    echo && echo -n -e "杈撳叆绔彛鍙穂1-65535]: " && read port
    if [[ -z "${port}" ]]; then
        LOGD "宸插彇娑?
        before_show_menu
    else
        /usr/local/x-ui/x-ui setting -port ${port}
        echo -e "璁剧疆绔彛瀹屾瘯锛岀幇鍦ㄨ閲嶅惎闈㈡澘锛屽苟浣跨敤鏂拌缃殑绔彛 ${green}${port}${plain} 璁块棶闈㈡澘"
        confirm_restart
    fi
}

start() {
    check_status
    if [[ $? == 0 ]]; then
        echo ""
        LOGI "闈㈡澘宸茶繍琛岋紝鏃犻渶鍐嶆鍚姩锛屽闇€閲嶅惎璇烽€夋嫨閲嶅惎"
    else
        systemctl start x-ui
        sleep 2
        check_status
        if [[ $? == 0 ]]; then
            LOGI "x-ui 鍚姩鎴愬姛"
        else
            LOGE "闈㈡澘鍚姩澶辫触锛屽彲鑳芥槸鍥犱负鍚姩鏃堕棿瓒呰繃浜嗕袱绉掞紝璇风◢鍚庢煡鐪嬫棩蹇椾俊鎭?
        fi
    fi

    if [[ $# == 0 ]]; then
        before_show_menu
    fi
}

stop() {
    check_status
    if [[ $? == 1 ]]; then
        echo ""
        LOGI "闈㈡澘宸插仠姝紝鏃犻渶鍐嶆鍋滄"
    else
        systemctl stop x-ui
        sleep 2
        check_status
        if [[ $? == 1 ]]; then
            LOGI "x-ui 涓?xray 鍋滄鎴愬姛"
        else
            LOGE "闈㈡澘鍋滄澶辫触锛屽彲鑳芥槸鍥犱负鍋滄鏃堕棿瓒呰繃浜嗕袱绉掞紝璇风◢鍚庢煡鐪嬫棩蹇椾俊鎭?
        fi
    fi

    if [[ $# == 0 ]]; then
        before_show_menu
    fi
}

restart() {
    systemctl restart x-ui
    sleep 2
    check_status
    if [[ $? == 0 ]]; then
        LOGI "x-ui 涓?xray 閲嶅惎鎴愬姛"
    else
        LOGE "闈㈡澘閲嶅惎澶辫触锛屽彲鑳芥槸鍥犱负鍚姩鏃堕棿瓒呰繃浜嗕袱绉掞紝璇风◢鍚庢煡鐪嬫棩蹇椾俊鎭?
    fi
    if [[ $# == 0 ]]; then
        before_show_menu
    fi
}

status() {
    systemctl status x-ui -l
    if [[ $# == 0 ]]; then
        before_show_menu
    fi
}

enable() {
    systemctl enable x-ui
    if [[ $? == 0 ]]; then
        LOGI "x-ui 璁剧疆寮€鏈鸿嚜鍚垚鍔?
    else
        LOGE "x-ui 璁剧疆寮€鏈鸿嚜鍚け璐?
    fi

    if [[ $# == 0 ]]; then
        before_show_menu
    fi
}

disable() {
    systemctl disable x-ui
    if [[ $? == 0 ]]; then
        LOGI "x-ui 鍙栨秷寮€鏈鸿嚜鍚垚鍔?
    else
        LOGE "x-ui 鍙栨秷寮€鏈鸿嚜鍚け璐?
    fi

    if [[ $# == 0 ]]; then
        before_show_menu
    fi
}

show_log() {
    journalctl -u x-ui.service -e --no-pager -f
    if [[ $# == 0 ]]; then
        before_show_menu
    fi
}

migrate_v2_ui() {
    /usr/local/x-ui/x-ui v2-ui

    before_show_menu
}

install_bbr() {
    # temporary workaround for installing bbr
    bash <(curl -L -s https://raw.githubusercontent.com/teddysun/across/master/bbr.sh)
    echo ""
    before_show_menu
}

update_shell() {
    wget -O /usr/bin/x-ui -N --no-check-certificate https://github.com/FranzKafkaYu/x-ui/raw/master/x-ui.sh
    if [[ $? != 0 ]]; then
        echo ""
        LOGE "涓嬭浇鑴氭湰澶辫触锛岃妫€鏌ユ湰鏈鸿兘鍚﹁繛鎺?Github"
        before_show_menu
    else
        chmod +x /usr/bin/x-ui
        LOGI "鍗囩骇鑴氭湰鎴愬姛锛岃閲嶆柊杩愯鑴氭湰" && exit 0
    fi
}

# 0: running, 1: not running, 2: not installed
check_status() {
    if [[ ! -f /etc/systemd/system/x-ui.service ]]; then
        return 2
    fi
    temp=$(systemctl status x-ui | grep Active | awk '{print $3}' | cut -d "(" -f2 | cut -d ")" -f1)
    if [[ x"${temp}" == x"running" ]]; then
        return 0
    else
        return 1
    fi
}

check_enabled() {
    temp=$(systemctl is-enabled x-ui)
    if [[ x"${temp}" == x"enabled" ]]; then
        return 0
    else
        return 1
    fi
}

check_uninstall() {
    check_status
    if [[ $? != 2 ]]; then
        echo ""
        LOGE "闈㈡澘宸插畨瑁咃紝璇蜂笉瑕侀噸澶嶅畨瑁?
        if [[ $# == 0 ]]; then
            before_show_menu
        fi
        return 1
    else
        return 0
    fi
}

check_install() {
    check_status
    if [[ $? == 2 ]]; then
        echo ""
        LOGE "璇峰厛瀹夎闈㈡澘"
        if [[ $# == 0 ]]; then
            before_show_menu
        fi
        return 1
    else
        return 0
    fi
}

show_status() {
    check_status
    case $? in
    0)
        echo -e "闈㈡澘鐘舵€? ${green}宸茶繍琛?{plain}"
        show_enable_status
        ;;
    1)
        echo -e "闈㈡澘鐘舵€? ${yellow}鏈繍琛?{plain}"
        show_enable_status
        ;;
    2)
        echo -e "闈㈡澘鐘舵€? ${red}鏈畨瑁?{plain}"
        ;;
    esac
    show_xray_status
}

show_enable_status() {
    check_enabled
    if [[ $? == 0 ]]; then
        echo -e "鏄惁寮€鏈鸿嚜鍚? ${green}鏄?{plain}"
    else
        echo -e "鏄惁寮€鏈鸿嚜鍚? ${red}鍚?{plain}"
    fi
}

check_xray_status() {
    count=$(ps -ef | grep "xray-linux" | grep -v "grep" | wc -l)
    if [[ count -ne 0 ]]; then
        return 0
    else
        return 1
    fi
}

show_xray_status() {
    check_xray_status
    if [[ $? == 0 ]]; then
        echo -e "xray 鐘舵€? ${green}杩愯${plain}"
    else
        echo -e "xray 鐘舵€? ${red}鏈繍琛?{plain}"
    fi
}

#this will be an entrance for ssl cert issue
#here we can provide two different methods to issue cert
#first.standalone mode second.DNS API mode
ssl_cert_issue() {
    local method=""
    echo -E ""
    LOGD "******浣跨敤璇存槑******"
    LOGI "璇ヨ剼鏈彁渚涗袱绉嶆柟寮忓疄鐜拌瘉涔︾鍙?璇佷功瀹夎璺緞鍧囦负/root/cert"
    LOGI "鏂瑰紡1:acme standalone mode,闇€瑕佷繚鎸佺鍙ｅ紑鏀?
    LOGI "鏂瑰紡2:acme DNS API mode,闇€瑕佹彁渚汣loudflare Global API Key"
    LOGI "濡傚煙鍚嶅睘浜庡厤璐瑰煙鍚?鍒欐帹鑽愪娇鐢ㄦ柟寮?杩涜鐢宠"
    LOGI "濡傚煙鍚嶉潪鍏嶈垂鍩熷悕涓斾娇鐢–loudflare杩涜瑙ｆ瀽浣跨敤鏂瑰紡2杩涜鐢宠"
    read -p "璇烽€夋嫨浣犳兂浣跨敤鐨勬柟寮?杈撳叆鏁板瓧1鎴栬€?鍚庡洖杞?: method
    LOGI "浣犳墍浣跨敤鐨勬柟寮忎负${method}"

    if [ "${method}" == "1" ]; then
        ssl_cert_issue_standalone
    elif [ "${method}" == "2" ]; then
        ssl_cert_issue_by_cloudflare
    else
        LOGE "杈撳叆鏃犳晥,璇锋鏌ヤ綘鐨勮緭鍏?鑴氭湰灏嗛€€鍑?.."
        exit 1
    fi
}

install_acme() {
    cd ~
    LOGI "寮€濮嬪畨瑁卆cme鑴氭湰..."
    curl https://get.acme.sh | sh
    if [ $? -ne 0 ]; then
        LOGE "acme瀹夎澶辫触"
        return 1
    else
        LOGI "acme瀹夎鎴愬姛"
    fi
    return 0
}

#method for standalone mode
ssl_cert_issue_standalone() {
    #check for acme.sh first
    if ! command -v ~/.acme.sh/acme.sh &>/dev/null; then
        install_acme
        if [ $? -ne 0 ]; then
            LOGE "瀹夎 acme 澶辫触锛岃妫€鏌ユ棩蹇?
            exit 1
        fi
    fi
    #install socat second
    if [[ x"${release}" == x"centos" ]]; then
        yum install socat -y
    else
        apt install socat -y
    fi
    if [ $? -ne 0 ]; then
        LOGE "鏃犳硶瀹夎socat,璇锋鏌ラ敊璇棩蹇?
        exit 1
    else
        LOGI "socat瀹夎鎴愬姛..."
    fi
    #creat a directory for install cert
    certPath=/root/cert
    if [ ! -d "$certPath" ]; then
        mkdir $certPath
    fi
    #get the domain here,and we need verify it
    local domain=""
    read -p "璇疯緭鍏ヤ綘鐨勫煙鍚?" domain
    LOGD "浣犺緭鍏ョ殑鍩熷悕涓?${domain},姝ｅ湪杩涜鍩熷悕鍚堟硶鎬ф牎楠?.."
    #here we need to judge whether there exists cert already
    local currentCert=$(~/.acme.sh/acme.sh --list | grep ${domain} | wc -l)
    if [ ${currentCert} -ne 0 ]; then
        local certInfo=$(~/.acme.sh/acme.sh --list)
        LOGE "鍩熷悕鍚堟硶鎬ф牎楠屽け璐?褰撳墠鐜宸叉湁瀵瑰簲鍩熷悕璇佷功,涓嶅彲閲嶅鐢宠,褰撳墠璇佷功璇︽儏:"
        LOGI "$certInfo"
        exit 1
    else
        LOGI "鍩熷悕鍚堟硶鎬ф牎楠岄€氳繃..."
    fi
    #get needed port here
    local WebPort=80
    read -p "璇疯緭鍏ヤ綘鎵€甯屾湜浣跨敤鐨勭鍙?濡傚洖杞﹀皢浣跨敤榛樿80绔彛:" WebPort
    if [[ ${WebPort} -gt 65535 || ${WebPort} -lt 1 ]]; then
        LOGE "浣犳墍閫夋嫨鐨勭鍙?{WebPort}涓烘棤鏁堝€?灏嗕娇鐢ㄩ粯璁?0绔彛杩涜鐢宠"
    fi
    LOGI "灏嗕細浣跨敤${WebPort}杩涜璇佷功鐢宠,璇风‘淇濈鍙ｅ浜庡紑鏀剧姸鎬?.."
    #NOTE:This should be handled by user
    #open the port and kill the occupied progress
    ~/.acme.sh/acme.sh --set-default-ca --server letsencrypt
    ~/.acme.sh/acme.sh --issue -d ${domain} --standalone --httpport ${WebPort}
    if [ $? -ne 0 ]; then
        LOGE "璇佷功鐢宠澶辫触,鍘熷洜璇峰弬瑙佹姤閿欎俊鎭?
        rm -rf ~/.acme.sh/${domain}
        exit 1
    else
        LOGI "璇佷功鐢宠鎴愬姛,寮€濮嬪畨瑁呰瘉涔?.."
    fi
    #install cert
    ~/.acme.sh/acme.sh --installcert -d ${domain} --ca-file /root/cert/ca.cer \
        --cert-file /root/cert/${domain}.cer --key-file /root/cert/${domain}.key \
        --fullchain-file /root/cert/fullchain.cer

    if [ $? -ne 0 ]; then
        LOGE "璇佷功瀹夎澶辫触,鑴氭湰閫€鍑?
        rm -rf ~/.acme.sh/${domain}
        exit 1
    else
        LOGI "璇佷功瀹夎鎴愬姛,寮€鍚嚜鍔ㄦ洿鏂?.."
    fi
    ~/.acme.sh/acme.sh --upgrade --auto-upgrade
    if [ $? -ne 0 ]; then
        LOGE "鑷姩鏇存柊璁剧疆澶辫触,鑴氭湰閫€鍑?
        ls -lah cert
        chmod 755 $certPath
        exit 1
    else
        LOGI "璇佷功宸插畨瑁呬笖宸插紑鍚嚜鍔ㄦ洿鏂?鍏蜂綋淇℃伅濡備笅"
        ls -lah cert
        chmod 755 $certPath
    fi

}

#method for DNS API mode
ssl_cert_issue_by_cloudflare() {
    echo -E ""
    LOGD "******浣跨敤璇存槑******"
    LOGI "璇ヨ剼鏈皢浣跨敤Acme鑴氭湰鐢宠璇佷功,浣跨敤鏃堕渶淇濊瘉:"
    LOGI "1.鐭ユ檽Cloudflare 娉ㄥ唽閭"
    LOGI "2.鐭ユ檽Cloudflare Global API Key"
    LOGI "3.鍩熷悕宸查€氳繃Cloudflare杩涜瑙ｆ瀽鍒板綋鍓嶆湇鍔″櫒"
    LOGI "4.璇ヨ剼鏈敵璇疯瘉涔﹂粯璁ゅ畨瑁呰矾寰勪负/root/cert鐩綍"
    confirm "鎴戝凡纭浠ヤ笂鍐呭[y/n]" "y"
    if [ $? -eq 0 ]; then
        install_acme
        if [ $? -ne 0 ]; then
            LOGE "鏃犳硶瀹夎acme,璇锋鏌ラ敊璇棩蹇?
            exit 1
        fi
        CF_Domain=""
        CF_GlobalKey=""
        CF_AccountEmail=""
        certPath=/root/cert
        if [ ! -d "$certPath" ]; then
            mkdir $certPath
        fi
        LOGD "璇疯缃煙鍚?"
        read -p "Input your domain here:" CF_Domain
        LOGD "浣犵殑鍩熷悕璁剧疆涓?${CF_Domain},姝ｅ湪杩涜鍩熷悕鍚堟硶鎬ф牎楠?.."
        #here we need to judge whether there exists cert already
        local currentCert=$(~/.acme.sh/acme.sh --list | grep ${CF_Domain} | wc -l)
        if [ ${currentCert} -ne 0 ]; then
            local certInfo=$(~/.acme.sh/acme.sh --list)
            LOGE "鍩熷悕鍚堟硶鎬ф牎楠屽け璐?褰撳墠鐜宸叉湁瀵瑰簲鍩熷悕璇佷功,涓嶅彲閲嶅鐢宠,褰撳墠璇佷功璇︽儏:"
            LOGI "$certInfo"
            exit 1
        else
            LOGI "鍩熷悕鍚堟硶鎬ф牎楠岄€氳繃..."
        fi
        LOGD "璇疯缃瓵PI瀵嗛挜:"
        read -p "Input your key here:" CF_GlobalKey
        LOGD "浣犵殑API瀵嗛挜涓?${CF_GlobalKey}"
        LOGD "璇疯缃敞鍐岄偖绠?"
        read -p "Input your email here:" CF_AccountEmail
        LOGD "浣犵殑娉ㄥ唽閭涓?${CF_AccountEmail}"
        ~/.acme.sh/acme.sh --set-default-ca --server letsencrypt
        if [ $? -ne 0 ]; then
            LOGE "淇敼榛樿CA涓篖ets'Encrypt澶辫触,鑴氭湰閫€鍑?
            exit 1
        fi
        export CF_Key="${CF_GlobalKey}"
        export CF_Email=${CF_AccountEmail}
        ~/.acme.sh/acme.sh --issue --dns dns_cf -d ${CF_Domain} -d *.${CF_Domain} --log
        if [ $? -ne 0 ]; then
            LOGE "璇佷功绛惧彂澶辫触,鑴氭湰閫€鍑?
            rm -rf ~/.acme.sh/${CF_Domain}
            exit 1
        else
            LOGI "璇佷功绛惧彂鎴愬姛,瀹夎涓?.."
        fi
        ~/.acme.sh/acme.sh --installcert -d ${CF_Domain} -d *.${CF_Domain} --ca-file /root/cert/ca.cer \
            --cert-file /root/cert/${CF_Domain}.cer --key-file /root/cert/${CF_Domain}.key \
            --fullchain-file /root/cert/fullchain.cer
        if [ $? -ne 0 ]; then
            LOGE "璇佷功瀹夎澶辫触,鑴氭湰閫€鍑?
            rm -rf ~/.acme.sh/${CF_Domain}
            exit 1
        else
            LOGI "璇佷功瀹夎鎴愬姛,寮€鍚嚜鍔ㄦ洿鏂?.."
        fi
        ~/.acme.sh/acme.sh --upgrade --auto-upgrade
        if [ $? -ne 0 ]; then
            LOGE "鑷姩鏇存柊璁剧疆澶辫触,鑴氭湰閫€鍑?
            ls -lah cert
            chmod 755 $certPath
            exit 1
        else
            LOGI "璇佷功宸插畨瑁呬笖宸插紑鍚嚜鍔ㄦ洿鏂?鍏蜂綋淇℃伅濡備笅"
            ls -lah cert
            chmod 755 $certPath
        fi
    else
        show_menu
    fi
}

#add for cron jobs,including sync geo data,check logs and restart x-ui
cron_jobs() {
    clear
    echo -e "
  ${green}瀹氭椂浠诲姟绠＄悊${plain}
  ${green}0.${plain}  杩斿洖涓昏彍鍗?
  ${green}1.${plain}  寮€鍚畾鏃舵洿鏂癵eo
  ${green}2.${plain}  鍏抽棴瀹氭椂鏇存柊geo
  ${green}3.${plain}  寮€鍚畾鏃跺垹闄ray鏃ュ織
  ${green}4.${plain}  鍏抽棴瀹氭椂鍒犻櫎xray鏃ュ織
  "
    echo && read -p "璇疯緭鍏ラ€夋嫨 [0-4]: " num
    case "${num}" in
    0)
        show_menu
        ;;
    1)
        enable_auto_update_geo
        ;;
    2)
        disable_auto_update_geo
        ;;
    3)
        enable_auto_clear_log
        ;;
    4)
        disable_auto_clear_log
        ;;
    *)
        LOGE "璇疯緭鍏ユ纭殑鏁板瓧 [0-4]"
        ;;
    esac
}

#update geo data
update_geo() {
    #back up first
    mv ${PATH_FOR_GEO_IP} ${PATH_FOR_GEO_IP}.bak
    #update data
    curl -s -L -o ${PATH_FOR_GEO_IP} ${URL_FOR_GEO_IP}
    if [[ $? -ne 0 ]]; then
        echo "update geoip.dat failed"
        mv ${PATH_FOR_GEO_IP}.bak ${PATH_FOR_GEO_IP}
    else
        echo "update geoip.dat succeed"
        rm -f ${PATH_FOR_GEO_IP}.bak
    fi
    mv ${PATH_FOR_GEO_SITE} ${PATH_FOR_GEO_SITE}.bak
    curl -s -L -o ${PATH_FOR_GEO_SITE} ${URL_FOR_GEO_SITE}
    if [[ $? -ne 0 ]]; then
        echo "update geosite.dat failed"
        mv ${PATH_FOR_GEO_SITE}.bak ${PATH_FOR_GEO_SITE}
    else
        echo "update geosite.dat succeed"
        rm -f ${PATH_FOR_GEO_SITE}.bak
    fi
    #restart x-ui
    systemctl restart x-ui
}

enable_auto_update_geo() {
    LOGI "姝ｅ湪寮€鍚嚜鍔ㄦ洿鏂癵eo鏁版嵁..."
    crontab -l >/tmp/crontabTask.tmp
    echo "00 4 */2 * * x-ui geo > /dev/null" >>/tmp/crontabTask.tmp
    crontab /tmp/crontabTask.tmp
    rm /tmp/crontabTask.tmp
    LOGI "寮€鍚嚜鍔ㄦ洿鏂癵eo鏁版嵁鎴愬姛"
}

disable_auto_update_geo() {
    crontab -l | grep -v "x-ui geo" | crontab -
    if [[ $? -ne 0 ]]; then
        LOGI "鍙栨秷x-ui 鑷姩鏇存柊geo鏁版嵁澶辫触"
    else
        LOGI "鍙栨秷x-ui 鑷姩鏇存柊geo鏁版嵁鎴愬姛"
    fi
}

#clear xray log,need enable log in config template
#here we need input an absolute path for log
clear_log() {
    LOGI "娓呴櫎xray鏃ュ織涓?.."
    local filePath=''
    if [[ $# -gt 0 ]]; then
        filePath=$1
    else
        LOGE "鏈緭鍏ユ湁鏁堟枃浠惰矾寰?鑴氭湰閫€鍑?
        exit 1
    fi
    LOGI "鏃ュ織璺緞涓?${filePath}"
    if [[ ! -f ${filePath} ]]; then
        LOGE "娓呴櫎xray鏃ュ織鏂囦欢澶辫触,${filePath}涓嶅瓨鍦?璇风‘璁?
        exit 1
    fi
    fileSize=$(ls -la ${filePath} --block-size=M | awk '{print $5}' | awk -F 'M' '{print$1}')
    if [[ ${fileSize} -gt ${DEFAULT_LOG_FILE_DELETE_TRIGGER} ]]; then
        rm $1
        if [[ $? -ne 0 ]]; then
            LOGE "娓呴櫎xray鏃ュ織鏂囦欢:${filePath}澶辫触"
        else
            LOGI "娓呴櫎xray鏃ュ織鏂囦欢:${filePath}鎴愬姛"
            systemctl restart x-ui
        fi
    else
        LOGI "褰撳墠鏃ュ織澶у皬涓?{fileSize}M,灏忎簬${DEFAULT_LOG_FILE_DELETE_TRIGGER}M,灏嗕笉浼氭竻闄?
    fi
}

#enable auto delete log锛宯eed file path as
enable_auto_clear_log() {
    LOGI "璁剧疆瀹氭椂娓呴櫎xray鏃ュ織..."
    local accessfilePath=''
    local errorfilePath=''
    accessfilePath=$(cat ${PATH_FOR_CONFIG} | jq .log.access | tr -d '"')
    errorfilePath=$(cat ${PATH_FOR_CONFIG} | jq .log.error | tr -d '"')
    if [[ ! -n ${accessfilePath} && ! -n ${errorfilePath} ]]; then
        LOGI "閰嶇疆鏂囦欢涓殑鏃ュ織鏂囦欢璺緞鏃犳晥,鑴氭湰閫€鍑?
        exit 1
    fi
    if [[ -f ${accessfilePath} ]]; then
        crontab -l >/tmp/crontabTask.tmp
        echo "30 4 */2 * * x-ui clear ${accessfilePath} > /dev/null" >>/tmp/crontabTask.tmp
        crontab /tmp/crontabTask.tmp
        rm /tmp/crontabTask.tmp
        LOGI "璁剧疆瀹氭椂娓呴櫎xray鏃ュ織:${accessfilePath}鎴愬姛"
    else
        LOGE "accesslog涓嶅瓨鍦?灏嗕笉浼氫负鍏惰缃畾鏃舵竻闄?
    fi

    if [[ -f ${errorfilePath} ]]; then
        crontab -l >/tmp/crontabTask.tmp
        echo "30 4 */2 * * x-ui clear ${errorfilePath} > /dev/null" >>/tmp/crontabTask.tmp
        crontab /tmp/crontabTask.tmp
        rm /tmp/crontabTask.tmp
        LOGI "璁剧疆瀹氭椂娓呴櫎xray鏃ュ織:${errorfilePath}鎴愬姛"
    else
        LOGE "errorlog涓嶅瓨鍦?灏嗕笉浼氫负鍏惰缃畾鏃舵竻闄?
    fi
}

#disable auto dlete log
disable_auto_clear_log() {
    crontab -l | grep -v "x-ui clear" | crontab -
    if [[ $? -ne 0 ]]; then
        LOGI "鍙栨秷 瀹氭椂娓呴櫎xray鏃ュ織澶辫触"
    else
        LOGI "鍙栨秷 瀹氭椂娓呴櫎xray鏃ュ織鎴愬姛"
    fi
}

show_usage() {
    echo "x-ui 绠＄悊鑴氭湰浣跨敤鏂规硶: "
    echo "------------------------------------------"
    echo "x-ui              - 鏄剧ず绠＄悊鑿滃崟 (鍔熻兘鏇村)"
    echo "x-ui start        - 鍚姩 x-ui 闈㈡澘"
    echo "x-ui stop         - 鍋滄 x-ui 闈㈡澘"
    echo "x-ui restart      - 閲嶅惎 x-ui 闈㈡澘"
    echo "x-ui status       - 鏌ョ湅 x-ui 鐘舵€?
    echo "x-ui enable       - 璁剧疆 x-ui 寮€鏈鸿嚜鍚?
    echo "x-ui disable      - 鍙栨秷 x-ui 寮€鏈鸿嚜鍚?
    echo "x-ui log          - 鏌ョ湅 x-ui 鏃ュ織"
    echo "x-ui v2-ui        - 杩佺Щ鏈満鍣ㄧ殑 v2-ui 璐﹀彿鏁版嵁鑷?x-ui"
    echo "x-ui update       - 鏇存柊 x-ui 闈㈡澘"
    echo "x-ui install      - 瀹夎 x-ui 闈㈡澘"
    echo "x-ui uninstall    - 鍗歌浇 x-ui 闈㈡澘"
    echo "x-ui clear        - 娓呴櫎 x-ui 鏃ュ織"
    echo "x-ui geo          - 鏇存柊 x-ui geo鏁版嵁"
    echo "x-ui cron         - 閰嶇疆 x-ui 瀹氭椂浠诲姟"
    echo "------------------------------------------"
}

show_menu() {
    echo -e "
  ${green}x-ui 闈㈡澘绠＄悊鑴氭湰${plain}
  ${green}0.${plain} 閫€鍑鸿剼鏈?
鈥斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€?
  ${green}1.${plain} 瀹夎 x-ui
  ${green}2.${plain} 鏇存柊 x-ui
  ${green}3.${plain} 鍗歌浇 x-ui
鈥斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€?
  ${green}4.${plain} 閲嶇疆鐢ㄦ埛鍚嶅瘑鐮?
  ${green}5.${plain} 閲嶇疆闈㈡澘璁剧疆
  ${green}6.${plain} 璁剧疆闈㈡澘绔彛
  ${green}7.${plain} 鏌ョ湅褰撳墠闈㈡澘淇℃伅
鈥斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€?
  ${green}8.${plain} 鍚姩 x-ui
  ${green}9.${plain} 鍋滄 x-ui
  ${green}10.${plain} 閲嶅惎 x-ui
  ${green}11.${plain} 鏌ョ湅 x-ui 鐘舵€?
  ${green}12.${plain} 鏌ョ湅 x-ui 鏃ュ織
鈥斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€?
  ${green}13.${plain} 璁剧疆 x-ui 寮€鏈鸿嚜鍚?
  ${green}14.${plain} 鍙栨秷 x-ui 寮€鏈鸿嚜鍚?
鈥斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€斺€?
  ${green}15.${plain} 涓€閿畨瑁?bbr (鏈€鏂板唴鏍?
  ${green}16.${plain} 涓€閿敵璇稴SL璇佷功(acme鐢宠)
  ${green}17.${plain} 閰嶇疆x-ui瀹氭椂浠诲姟
 "
    show_status
    echo && read -p "璇疯緭鍏ラ€夋嫨 [0-17],鏌ョ湅闈㈡澘鐧诲綍淇℃伅璇疯緭鍏ユ暟瀛?:" num

    case "${num}" in
    0)
        exit 0
        ;;
    1)
        check_uninstall && install
        ;;
    2)
        check_install && update
        ;;
    3)
        check_install && uninstall
        ;;
    4)
        check_install && reset_user
        ;;
    5)
        check_install && reset_config
        ;;
    6)
        check_install && set_port
        ;;
    7)
        check_install && check_config
        ;;
    8)
        check_install && start
        ;;
    9)
        check_install && stop
        ;;
    10)
        check_install && restart
        ;;
    11)
        check_install && status
        ;;
    12)
        check_install && show_log
        ;;
    13)
        check_install && enable
        ;;
    14)
        check_install && disable
        ;;
    15)
        install_bbr
        ;;
    16)
        ssl_cert_issue
        ;;
    17)
        check_install && cron_jobs
        ;;
    *)
        LOGE "璇疯緭鍏ユ纭殑鏁板瓧 [0-17],鏌ョ湅闈㈡澘鐧诲綍淇℃伅璇疯緭鍏ユ暟瀛?"
        ;;
    esac
}

if [[ $# > 0 ]]; then
    case $1 in
    "start")
        check_install 0 && start 0
        ;;
    "stop")
        check_install 0 && stop 0
        ;;
    "restart")
        check_install 0 && restart 0
        ;;
    "status")
        check_install 0 && status 0
        ;;
    "enable")
        check_install 0 && enable 0
        ;;
    "disable")
        check_install 0 && disable 0
        ;;
    "log")
        check_install 0 && show_log 0
        ;;
    "v2-ui")
        check_install 0 && migrate_v2_ui 0
        ;;
    "update")
        check_install 0 && update 0
        ;;
    "install")
        check_uninstall 0 && install 0
        ;;
    "uninstall")
        check_install 0 && uninstall 0
        ;;
    "geo")
        check_install 0 && update_geo
        ;;
    "clear")
        check_install 0 && clear_log $2
        ;;
    "cron")
        check_install && cron_jobs
        ;;
    *) show_usage ;;
    esac
else
    show_menu
fi
