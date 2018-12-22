// 百度网盘登录状态
var BaiduLogin = false

function setBaiduLogin(status) {
    BaiduLogin = status
    var popupView = getPopupView()
    if (popupView) {
        popupView.bnd_app.setIsLogin(status)
    }
}

// 标签页中已选择的资源链接
var DownloadUrls = []

// 百度网盘首页地址
var BaiduOnlineDiskUrl = 'https://pan.baidu.com'

function getDownloadUrls(id) {
    return DownloadUrls[id]
}

function setDownloadUrls(id, urls) {
    DownloadUrls[id] = urls
}

function removeDownloadUrl(id, url) {
    if (DownloadUrls[id]) {
        var index = -1
        for (var i = 0; i < DownloadUrls[id].length; i++) {
            if (DownloadUrls[i] === url) {
                index = i
                break
            }
        }
        if (index > -1) {
            DownloadUrls[id].splice(index, 1)
        }
    }
}

function chromeStorageSet(key, value) {
    key = 'BaiduOnlineDiskHelper_' + key
    var obj = {}
    obj[key] = value
    chrome.storage.sync.set(obj)
}

function chromeStorageGet(key, callback) {
    key = 'BaiduOnlineDiskHelper_' + key
    chrome.storage.sync.get(key, values => {
        callback(values[key])
    })
}

function setBaiduDefaultDownloadDir(dir) {
    chromeStorageSet('defaultDownloadDir', dir)
}

function getBaiduDefaultDownloadDir() {
    return new Promise((resolve, reject) => {
        chromeStorageGet('defaultDownloadDir', resolve)
    })
}

function setBaiduTokens(tokens) {
    chromeStorageSet('baiduTokens', tokens)
}

var CookiesNotFoundErr = { name: "CookiesNotFound" }
var TokensNotFoundErr = { name: "TokensNotFound" }
var VcodeRequireErr = { name: "VcodeRequire", img: null, vcode: null }

function getBaiduCookiesAsync() {
    return new Promise(function (resolve, reject) {
        chrome.cookies.getAll({ url: BaiduOnlineDiskUrl }, resolve)
    }).then(function (cookies) {
        if (!cookies) {
            setBaiduLogin(false)
            throw CookiesNotFoundErr
        }
        return cookies
    })
}

function getBaiduTokensAsync() {
    return new Promise(function (resolve, reject) {
        chromeStorageGet('baiduTokens', resolve)
    }).then(function (tokens) {
        if (!tokens) {
            setBaiduLogin(false)
            throw TokensNotFoundErr
        }
        return tokens
    })
}

// 监听检测登录数据
chrome.webRequest.onCompleted.addListener(function (details) {
    if (BaiduLogin) {
        return
    }
    if (details.statusCode === 200) {
        console.log('监测到百度网盘请求', details)
        var params = Qs.parse(details.url)
        if (!params.app_id || !params.bdstoken || !params.logid) {
            return
        }
        if (!BaiduLogin) {
            console.log("发现登录数据")
            setBaiduTokens({
                app_id: params.app_id,
                bdstoken: params.bdstoken,
                logid: params.logid,
            })
            setBaiduLogin(true)
        }
    }
}, { urls: ["*://pan.baidu.com/*"], types: ["main_frame", "sub_frame", "xmlhttprequest"] }, ["responseHeaders"]);


// 右键菜单
chrome.contextMenus.create({
    title: '使用百度网盘离线下载', // %s表示选中的文字
    contexts: ['selection'], // 只有当选中文字时才会出现此右键菜单
    onclick: (info, tab) => {
        console.log(info)
        console.log(tab)
        var url = null
        if (info.linkUrl) {
            if (checkProtocol(info.linkUrl)) {
                url = info.linkUrl
            }
        } else {
            if (checkProtocol(info.selectionText)) {
                url = info.selectionText
            }
        }
        console.log('检测到一个 URL :', url)
        if (url) {
            checkBaiduLogin().then(tokens => {
                console.log(tokens)
                getBaiduDefaultDownloadDir().then(dir => {
                    if (!dir) {
                        dir = '/'
                    }
                    toDownloadUrls(tab.id, [url], dir)
                })
            })
            .catch(error => {
                console.log(error)
                alert('未检测到百度网盘登录状态，请先去登录: ' + BaiduOnlineDiskUrl)
            })
            .then(() => {
                console.log('........')
            })
            
        } else {
            return alert('未检测到支持的链接（仅支持http/https/ftp/电驴/磁力链协议）')
        }
    }
});

// 给某个 tab 发送消息
function sendMessageToTab(tabId, message, callback) {
    if (tabId) {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (callback) callback(response)
        })
    } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
                if (callback) callback(response);
            });
        });
    }
}

function getPopupView() {
    var popupViews = chrome.extension.getViews({ type: 'popup' });
    if (popupViews.length > 0) {
        for (var i = 0; i <= popupViews.length; i++) {
            if (popupViews[i].location.href.indexOf('index.html') > 0) {
                return popupViews[i]
            }
        }
    }
    return false
}

// 监听来自 content 的消息
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    console.log('收到消息:', message, sender);

    var msg = parseMessage(message)
    if (!msg) {
        return
    }
    switch (msg.Type) {
        case 'select-url':
            handleUrlMessage(msg.Data, sender, sendResponse)
            break
        case 'vcode':
            handleVcodeMessage(msg.Data, sender, sendResponse)
            break
    }
});

// 处理 URL 消息
function handleUrlMessage(data, sender, sendResponse) {
    setDownloadUrls(sender.tab.id, data)
    var popupView = getPopupView()
    if (popupView) {
        if (popupView.bnd_app.curTabId === sender.tab.id) {
            popupView.bnd_app.setDlUrls(data)
        }
    }
}

// 处理验证码相关消息
function handleVcodeMessage(data, sender, sendResponse) {
    switch (data.status) {
        case 'init':
            var resp = {
                status: 'init',
                img: CurVcodeErrData.img,
                vcode: CurVcodeErrData.vcode,
            }
            sendMessageToTab(sender.tab.id, makeMessage('vcode', resp))
            break;
        case 'flush':
            getBaiduVcode().then(vcodeResp => {
                CurVcodeErrData.img = vcodeResp.img
                CurVcodeErrData.vcode = vcodeResp.vcode

                var resp = {
                    status: 'flush',
                    img: vcodeResp.img,
                    vcode: vcodeResp.vcode,
                }
                sendMessageToTab(sender.tab.id, makeMessage('vcode', resp))
            }).catch(() => { })

            break;
        case 'submit':
            console.log("接收到 submit", data)
            CurVcodeUserInput = data.inputVcode
            // 关闭验证码窗口
            chrome.windows.remove(CurVcodePageWindowId)
            setTimeout(startBaiduDownload, 0)
            break;
    }
}

/************* baidu ****************/

// 检查登录状态
function checkBaiduLogin() {
    return getBaiduCookiesAsync()
        .then(getBaiduTokensAsync)
}

// 获取百度网盘文件夹列表
function getBaiduOnlineDiskDirList(dir) {
    return checkBaiduLogin().then(function (tokens) {
        if (!dir) {
            dir = '/'
        }
        dir = encodeURI(dir)
        var url = 'https://pan.baidu.com/api/list?dir=' + dir + '&bdstoken=' + tokens.bdstoken + '&logid=' + tokens.logid + '&num=100&order=time&desc=1&clienttype=0&showempty=0&web=1&page=1&channel=chunlei&web=1&app_id=' + tokens.app_id

        return axios.get(url).then(function (response) {
            return response.data.list
        })
    })
}

// 获取百度网盘离线下载任务列表
function getBaiduOnlineDiskTaskList() {
    return checkBaiduLogin().then(function (tokens) {
        var ts = new Date().getTime()
        var url = 'https://pan.baidu.com/rest/2.0/services/cloud_dl?need_task_info=1&status=255&start=0&limit=10&method=list_task&app_id=' + tokens.app_id + '&t=' + ts + '&channel=chunlei&web=1&bdstoken=' + tokens.bdstoken + '&logid=' + tokens.logid + '&clienttype=0'

        return axios.get(url).then(response => {
            return response.data
        })
    })
}

// 获取百度网盘验证码
function getBaiduVcode() {
    return checkBaiduLogin().then(function (tokens) {
        var url = 'https://pan.baidu.com/api/getvcode?prod=pan&channel=chunlei&web=1&app_id=' + tokens.app_id + '&bdstoken=' + tokens.bdstoken + '&logid=' + tokens.logid + '&clienttype=0'

        return axios.get(url)
            .then(function (response) {
                return { 'img': response.data.img, 'vcode': response.data.vcode }
            })
    })
}

// 离线下载一个 URL
function baiduDownloadUrl(source_url, path, vcodeData) {
    return checkBaiduLogin().then(function (tokens) {
        var ts = new Date().getTime()
        var url = 'https://pan.baidu.com/rest/2.0/services/cloud_dl?channel=chunlei&web=1&app_id=' + tokens.app_id + '&bdstoken=' + tokens.bdstoken + '&logid=' + tokens.logid + '&clienttype=0'

        var formData = {
            method: 'add_task',
            app_id: tokens.app_id,
            source_url: source_url,
            save_path: path,
            type: '3',
        }

        if (vcodeData) {
            formData.input = vcodeData.input
            formData.vcode = vcodeData.vcode
        }

        return axios.post(url,
            Qs.stringify(formData),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } }
        )
            .then(function (response) {
                console.log("下载响应", response)
                return response.data
            })
            .catch(function (error) {
                if (error.response.status === 403) {
                    if (error.response.data.error_code === -19) {
                        VcodeRequireErr.img = error.response.data.img
                        VcodeRequireErr.vcode = error.response.data.vcode
                        console.log("下载响应 403")
                        throw VcodeRequireErr
                    }
                }
            })
    })
}

// 当前下载来源网页标签 ID
var CurDownloadTabId = null
// 当前选择下载路径
var CurDownloadPath = null
// 当前下载任务栈
var CurDownloadStack = []
// 当前下载任务验证码信息
var CurVcodeErrData = null
// 当前下载任务用户输入验证码
var CurVcodeUserInput = null

// 验证码窗口 ID
var CurVcodePageWindowId = null
// 验证码窗口内标签 ID
var CurVcodePageTableId = null
// 任务定时检查次数
var CurCheckTimes = 0

function initCurParams() {
    CurDownloadTabId = null
    CurDownloadPath = null
    CurDownloadStack = []
    CurVcodeErrData = null
    CurVcodeUserInput = null
    CurVcodePageWindowId = null
    CurVcodePageTableId = null
}

// 下载成功
function DownloadUrlSuccess(source_url) {
    CurVcodeErrData = null
    CurVcodeUserInput = null
    CurVcodePageWindowId = null
    CurVcodePageTableId = null
    removeDownloadUrl(CurDownloadTabId, source_url)
}

// 检查当前任务状态
function checkDownloadTask() {
    return new Promise(function (resolve, reject) {
        if (CurDownloadStack.length) {
            if (CurVcodeErrData === null) {
                // 正在下载中
                resolve(100)
            }
            // 有错误，检查验证码窗口
            if (CurVcodePageTableId) {
                chrome.tabs.get(CurVcodePageTableId, tab => {
                    if (tab) {
                        // 需要验证码，已有验证码窗口
                        resolve(102)
                    } else {
                        // 需要验证码，无验证码窗口，下载已暂停
                        initCurParams()
                        resolve(101)
                    }
                })
            }
            // 有错误肯定会弹出验证码窗口。应该走不到这，八成出错了
            initCurParams()
            resolve(500)
        }
        // 无下载链接，OK
        resolve(200)
    })
}

// 从任务栈里弹出一个 URL 并开始下载
var startBaiduDownload = () => {
    if (!CurDownloadStack.length) {
        console.log('下载完成')
        chrome.notifications.create(null, {
            type: 'basic',
            iconUrl: 'img/icon.png',
            title: '百度网盘离线下载助手:',
            message: '已成功添加到百度网盘离线下载',
        })
        var popup = getPopupView()
        if (popup) {
            popup.bnd_app.finishedDownload()
        }
        return
    }
    var source_url = CurDownloadStack.shift()
    var vcodeData = null
    if (CurVcodeErrData && CurVcodeUserInput) {
        vcodeData = {
            input: CurVcodeUserInput,
            vcode: CurVcodeErrData.vcode
        }
    }
    CurVcodeErrData = null
    CurVcodeUserInput = null
    console.log("使用验证码: ", vcodeData)
    baiduDownloadUrl(source_url, CurDownloadPath, vcodeData)
        .then(response => {
            console.log('下载成功: ', response)
            DownloadUrlSuccess(source_url)
            setTimeout(startBaiduDownload, 1500)
        }).catch(error => {
            if (error === VcodeRequireErr) {
                console.log("需要验证码: ", error)
                CurVcodeErrData = {
                    img: error.img,
                    vcode: error.vcode,
                }
                CurDownloadStack.unshift(source_url)
                openVcodePage()
            }
        })
}

// 打开一个验证码页面
var openVcodePage = () => {
    chrome.windows.create({
        url: chrome.extension.getURL("vcode.html"),
        type: "popup",
        width: 750,
        height: 450,
        focused: true,
    }, function (w) {
        CurVcodePageWindowId = w.id
        CurVcodePageTableId = w.tabs[0].id
    });
}

// 开始下载一组任务
function toDownloadUrls(tabId, urls, path) {
    if (CurDownloadStack.length) {
        return { code: 400, msg: '有未下载完成的任务, 请稍等' }
    }
    CurDownloadTabId = tabId
    CurDownloadPath = path
    CurDownloadStack = urls

    setTimeout(startBaiduDownload, 0);
    return { code: 200, msg: '添加任务成功' }
}

/************* baidu ****************/

function makeMessage(type, data) {
    return {
        BaiduOnlineDiskHelperMessage: true,
        Type: type,
        Data: data
    }
}

function parseMessage(message) {
    if (message.BaiduOnlineDiskHelperMessage) {
        return { Type: message.Type, Data: message.Data }
    }
    return false
}

function checkProtocol(url) {
    var supportProtocols = [
        "http",
        "https",
        "ftp",
        "ed2k",
        "magnet"
    ];
    var reg = /^([^:]+):.+/g;
    var ret = reg.exec(url);
    if (!ret) {
        return false;
    }
    var protocol = ret[1];
    for (var i = 0; i < supportProtocols.length; i++) {
        if (protocol == supportProtocols[i]) {
            return true;
        }
    }
    return false;
}
