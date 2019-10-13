import { createServer } from 'connect.io';
import chromeCall from 'chrome-call';
import Qs from 'qs';
import axios from 'axios';

// 持久化存储相关
const storagePrefix = 'BaiduOnlineDiskHelper_';
const storageKeyBaiduTokens = storagePrefix + 'baiduTokens';
const storageKeyDefaultDir = storagePrefix + 'defaultDir';

// 全局变量
// 是否登录
var _baiduLogined = false;
// tokens
var _baiduTokens = null;
// 最后一次检查登录是否有效的时间戳
var _lastCheckedTime = 0;
// 默认下载目录
var _downloadDefaultDir = '/';
// 是否正在下载
var _isDownloading = false;
// 是否需要验证码了
var _isRequireVcode = false;
// 当前验证码图片地址
var _vcodeImg = null;
// 当前验证码校验码
var _vcodeVcode = null;
// 当前用户输入的验证码
var _vcodeUserInput = null;
// 当前验证码弹出页面的 window ID
var _vcodePageWindowId = null;
// 当前下载URL栈
var _downloadUrls = [];
// 当前自动提取的URL列表
var _autoExtractUrls = [];

// 错误定义
const NotLoginError = { name: 'NotLoginError' };
const VcodeRequireError = { name: 'VcodeRequireError' };

// 初始化
checkStorageTokens();
listenBaiduRequestTokens();
loadDownloadDefaultDir();

/**
 * 和 popup/content 脚本通信相关
 */
const server = createServer();
server.on('connect', client => {
  // 获取登陆状态
  client.on('getLogin', (data, resolve, reject) => {
    resolve(isLogined());
  });

  // 检查登陆状态
  client.on('checkLogin', (data, resolve, reject) => {
    checkStorageTokens().then(() => {
      resolve(isLogined());
    });
  });

  // 获取 tokens
  client.on('getTokens', (data, resolve, reject) => {
    queryBaiduTokens()
      .then(tokens => {
        resolve(tokens);
      })
      .catch(err => {
        reject(err);
      });
  });

  // 获取离线下载任务数据
  client.on('getTasks', (data, resolve, reject) => {
    getBaiduOnlineDiskTaskList()
      .then(tasks => {
        resolve(tasks);
      })
      .catch(err => {
        reject(err);
      });
  });

  // 获取网盘目录列表
  client.on('getDirs', (dir, resolve, reject) => {
    getBaiduOnlineDiskDirList(dir)
      .then(dirList => {
        resolve(dirList);
      })
      .catch(err => {
        reject(err);
      });
  });

  // 获取默认下载目录
  client.on('getDefaultDir', (data, resolve, reject) => {
    resolve(_downloadDefaultDir);
  });

  // 保存默认下载目录
  client.on('saveDefaultDir', (dir, resolve, reject) => {
    if (dir[dir.length - 1] !== '/') {
      dir = dir + '/';
    }
    saveDownloadDefaultDir(dir).then(() => {
      resolve();
    });
  });

  // 获取当前标签页ID, 仅可在 content.js 中调用
  client.on('getTabId', (data, resolve, reject) => {
    resolve(client.sender.tab.id);
  });

  // 接收下载URL列表
  client.on('download', (urls, resolve, reject) => {
    _downloadUrls = urls;
    startDownload();
    resolve(_isDownloading);
  });

  // 获取当前验证码
  client.on('getVcodeShow', (urls, resolve, reject) => {
    resolve(_vcodeImg);
  });

  // 打开验证码页面
  client.on('openVcodePage', (data, resolve, reject) => {
    openVcodePage();
  });

  // 获取一个新的验证码
  client.on('getNewVcodeShow', (urls, resolve, reject) => {
    getBaiduOnlineDiskVcode().then(() => {
      resolve(_vcodeImg);
    });
  });

  // 提交验证码并继续下载
  client.on('submitUserInputVcode', (userInputVcode, resolve, reject) => {
    setVcodeUserInputData(userInputVcode);
    startDownload();
    resolve(_isDownloading);
  });

  // 获取当前下载状态
  client.on('getDownloadStatus', (data, resolve, reject) => {
    resolve(_isDownloading);
  });

  // 停止当前下载任务
  client.on('stopDownload', (data, resolve, reject) => {
    stopDownload();
    resolve(_isDownloading);
  });

  // 获取当前队列中的URL
  client.on('getDownloadUrls', (data, resolve, reject) => {
    resolve(_downloadUrls);
  });

  // 设置自动提取的URL
  client.on('setAutoExtractUrls', (urls, resolve, reject) => {
    _autoExtractUrls = urls;
  });

  // 获取自动提取的URL
  client.on('getAutoExtractUrls', (urls, resolve, reject) => {
    resolve(_autoExtractUrls);
  });

  // 下载自动提取的URL
  client.on('downloadAutoExtractUrls', (urls, resolve, reject) => {
    if (!_isDownloading) {
      _downloadUrls = urls;
      _autoExtractUrls = [];
      startDownload();
    }
    resolve(_isDownloading);
  });

  // 清除当前自动提取的URL
  client.on('cleanAutoExtractUrls', (urls, resolve, reject) => {
    _autoExtractUrls = [];
    resolve(true);
  });
});

/**
 * 登录状态相关函数
 */

// 设置登录token
function setLogin(tokens) {
  _baiduLogined = true;
  _baiduTokens = tokens;
  _lastCheckedTime = new Date().getTime();
  addContextMenu();
}

// 清除登录数据
function setLogout() {
  _baiduLogined = false;
  _baiduTokens = null;
  removeContextMenu();
}

// 是否登录
function isLogined() {
  return _baiduLogined;
}

// 存储登录token
function saveBaiduTokens(tokens) {
  let obj = {};
  obj[storageKeyBaiduTokens] = tokens;
  chromeCall(chrome.storage.sync, 'set', obj).then(() => {
    setLogin(tokens);
  });
}

// 获取登录token
async function queryBaiduTokens() {
  return new Promise((resolve, reject) => {
    if (_baiduLogined) {
      resolve(_baiduTokens);
    } else {
      reject(NotLoginError);
    }
  });
}

// 从网络获取登录数据
function listenBaiduRequestTokens() {
  chrome.webRequest.onCompleted.addListener(
    details => {
      if (isLogined()) {
        return;
      }
      if (details.statusCode === 200) {
        var params = Qs.parse(details.url);
        if (!params.app_id || !params.bdstoken || !params.logid || params.bdstoken === 'undefined') {
          return;
        }
        if (!_baiduLogined) {
          console.log('发现登录数据', params);
          let appId = params.app_id;
          if (isArray(appId)) {
            appId = appId[0];
          }
          saveBaiduTokens({
            app_id: appId,
            bdstoken: params.bdstoken,
            logid: params.logid,
          });
        }
      }
    },
    { urls: ['*://pan.baidu.com/*'], types: ['main_frame', 'sub_frame', 'xmlhttprequest'] },
    ['responseHeaders']
  );
}

// 从存储中获取 tokens 并检查是否有效
async function checkStorageTokens() {
  if (isLogined()) {
    let n = new Date().getTime();
    if ((n - _lastCheckedTime) / 1000 < 600) {
      return;
    }
  }
  return chromeCall(chrome.storage.sync, 'get', storageKeyBaiduTokens)
    .then(obj => {
      let tokens = obj[storageKeyBaiduTokens];
      let url = 'https://pan.baidu.com/rest/2.0/services/cloud_dl?';
      let params = {
        need_task_info: 1,
        status: 255,
        start: 0,
        limit: 1,
        method: 'list_task',
        app_id: tokens.app_id,
        t: new Date().getTime(),
        channel: 'chunlei',
        web: 1,
        bdstoken: tokens.bdstoken,
        logid: tokens.logid,
        clienttype: 0,
      };
      axios.get(url + Qs.stringify(params)).then(response => {
        if (response.data['total'] >= 0) {
          setLogin(tokens);
        } else {
          setLogout();
        }
      });
    })
    .catch(() => {
      setLogout();
    });
}

/**
 * 离线下载任务相关
 */

// 请求离线下载任务列表
async function getBaiduOnlineDiskTaskList() {
  const tokens = await queryBaiduTokens();
  let listUrl = 'https://pan.baidu.com/rest/2.0/services/cloud_dl?';
  let listParams = {
    need_task_info: 1,
    status: 255,
    start: 0,
    limit: 10,
    method: 'list_task',
    app_id: tokens.app_id,
    t: new Date().getTime(),
    channel: 'chunlei',
    web: 1,
    bdstoken: tokens.bdstoken,
    logid: tokens.logid,
    clienttype: 0,
  };
  const listResponse = await axios.get(listUrl + Qs.stringify(listParams));
  let taskInfo = listResponse.data['task_info'];
  let len = taskInfo.length;
  if (len === 0) {
    return [];
  }
  let taskIds = [];
  for (let i = 0; i < len; i++) {
    taskIds[i] = taskInfo[i]['task_id'];
  }
  let queryUrl = 'https://pan.baidu.com/rest/2.0/services/cloud_dl?';
  let queryParams = {
    task_ids: taskIds.join(','),
    op_type: '1',
    method: 'query_task',
    app_id: tokens.app_id,
    t: new Date().getTime(),
    channel: 'chunlei',
    web: '1',
    bdstoken: tokens.bdstoken,
    logid: tokens.logid,
    clienttype: '0',
  };
  const queryResponse = await axios.get(queryUrl + Qs.stringify(queryParams));
  return queryResponse.data['task_info'];
}

// 获取百度网盘文件夹列表
async function getBaiduOnlineDiskDirList(dir) {
  const tokens = await queryBaiduTokens();
  if (!dir) {
    dir = '/';
  }
  let url = 'https://pan.baidu.com/api/list?';
  let params = {
    dir: dir,
    bdstoken: tokens.bdstoken,
    logid: tokens.logid,
    num: 100,
    order: 'time',
    desc: 1,
    clienttype: 0,
    showempty: 0,
    web: 1,
    page: 1,
    channel: 'chunlei',
    app_id: tokens.app_id,
  };
  const response = await axios.get(url + Qs.stringify(params));
  return response.data.list;
}

// 获取百度网盘验证码
async function getBaiduOnlineDiskVcode() {
  if (!_isRequireVcode) {
    return;
  }
  const tokens = await queryBaiduTokens();
  let url = 'https://pan.baidu.com/api/getvcode?';
  let params = {
    prod: 'pan',
    channel: 'chunlei',
    web: 1,
    app_id: tokens.app_id,
    bdstoken: tokens.bdstoken,
    logid: tokens.logid,
    clienttype: 0,
  };
  const response = await axios.get(url + Qs.stringify(params));
  setVcodeShowData(response.data.img, response.data.vcode);
}

// 保存默认下载目录
async function saveDownloadDefaultDir(dir) {
  if (_downloadDefaultDir === dir) {
    return;
  }
  let obj = {};
  obj[storageKeyDefaultDir] = dir;
  await chromeCall(chrome.storage.sync, 'set', obj);
  _downloadDefaultDir = dir;
}

// 读取默认下载目录
function loadDownloadDefaultDir() {
  chromeCall(chrome.storage.sync, 'get', storageKeyDefaultDir).then(obj => {
    if (obj[storageKeyDefaultDir]) {
      _downloadDefaultDir = obj[storageKeyDefaultDir];
    }
  });
}

// 离线下载一个磁力链接
async function downloadMagnetUrl(sourceUrl, savePath, isRequireVcode) {
  const tokens = await queryBaiduTokens();
  let queryParams = {
    channel: 'chunlei',
    web: 1,
    app_id: tokens.app_id,
    bdstoken: tokens.bdstoken,
    logid: tokens.logid,
    clienttype: 0,
  };
  let queryFormData = {
    method: 'query_magnetinfo',
    app_id: tokens.app_id,
    source_url: sourceUrl,
    save_path: savePath,
    type: 4,
  };
  try {
    const response = await downloadRequest(queryParams, queryFormData);
    let total = response.data['total'];
    if (total <= 0) {
      return;
    }
    let idx = [];
    for (let i = 1; i <= total; i++) {
      idx.push(i);
    }
    // 下载
    let addParams = {
      channel: 'chunlei',
      web: 1,
      app_id: tokens.app_id,
      bdstoken: tokens.bdstoken,
      logid: tokens.logid,
      clienttype: 0,
    };
    let addFormData = {
      method: 'add_task',
      app_id: tokens.app_id,
      file_sha1: '',
      save_path: savePath,
      selected_idx: idx.join(','),
      task_from: 1,
      t: new Date().getTime(),
      source_url: sourceUrl,
      type: 4,
    };
    if (isRequireVcode) {
      addFormData.input = _vcodeUserInput;
      addFormData.vcode = _vcodeVcode;
    }
    const addResponse = await downloadRequest(addParams, addFormData);
    return addResponse;
  } catch (error) {
    console.log('请求百度接口返回失败: ', error);
    if (error.response.status === 403) {
      if (error.response.data['error_code'] === -19) {
        if (_isDownloading) {
          setVcodeShowData(error.response.data.img, error.response.data.vcode);
          throw VcodeRequireError;
        }
      }
    }
  }
}

// 离线下载一个普通链接
async function downloadNormalUrl(sourceUrl, savePath, isRequireVcode) {
  const tokens = await queryBaiduTokens();
  let queryParams = {
    channel: 'chunlei',
    web: 1,
    app_id: tokens.app_id,
    bdstoken: tokens.bdstoken,
    logid: tokens.logid,
    clienttype: 0,
  };
  let queryFormData = {
    method: 'add_task',
    app_id: tokens.app_id,
    source_url: sourceUrl,
    save_path: savePath,
    type: 3,
  };
  if (isRequireVcode) {
    queryFormData.input = _vcodeUserInput;
    queryFormData.vcode = _vcodeVcode;
  }
  try {
    const response = await downloadRequest(queryParams, queryFormData);
    return response;
  } catch (error) {
    console.log('请求百度接口返回失败: ', error);
    if (error.response.status === 403) {
      if (error.response.data['error_code'] === -19) {
        if (_isDownloading) {
          setVcodeShowData(error.response.data.img, error.response.data.vcode);
          throw VcodeRequireError;
        }
      }
    }
  }
}

// 发起一个离线下载请求
function downloadRequest(queryParams, formData) {
  let url = 'https://pan.baidu.com/rest/2.0/services/cloud_dl?';
  return axios.post(url + Qs.stringify(queryParams), Qs.stringify(formData), { headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } });
}

// 设置开始下载状态
function setStartDownload() {
  _isDownloading = true;
  clearVcodeShowData();
}

// 设置结束下载状态
function setEndDownload() {
  _isDownloading = false;
  clearVcodeShowData();
}

// 设置验证码显示数据
function setVcodeShowData(img, vcode) {
  _isRequireVcode = true;
  _vcodeImg = img;
  _vcodeVcode = vcode;
}

// 清除验证码显示数据
function clearVcodeShowData() {
  _isRequireVcode = false;
  _vcodeImg = null;
  _vcodeVcode = null;
}

// 设置用户输入的验证码
function setVcodeUserInputData(input) {
  _vcodeUserInput = input;
  // 关闭验证码窗口
  chrome.windows.remove(_vcodePageWindowId);
}

// 开始下载
async function startDownload() {
  if (!_isDownloading) {
    if (!_downloadUrls.length) {
      return;
    }
    setStartDownload();
  }
  if (!_downloadUrls.length) {
    chrome.notifications.create(null, {
      type: 'basic',
      iconUrl: 'img/icon.png',
      title: '百度网盘离线下载助手:',
      message: '当前链接已全部添加到离线下载',
    });
    setEndDownload();
    return;
  }
  let sourceUrl = _downloadUrls.shift();
  try {
    if (sourceUrl.indexOf('magnet') === 0) {
      await downloadMagnetUrl(sourceUrl, _downloadDefaultDir, _isRequireVcode);
    } else {
      await downloadNormalUrl(sourceUrl, _downloadDefaultDir, _isRequireVcode);
    }
    clearVcodeShowData();
    if (_isDownloading) {
      setTimeout(startDownload, 1500);
    }
  } catch (err) {
    if (err === VcodeRequireError) {
      console.log('下载需要验证码: ', sourceUrl);
      _downloadUrls.unshift(sourceUrl);
      openVcodePage();
    } else {
      clearVcodeShowData();
      if (_isDownloading) {
        setTimeout(startDownload, 1500);
      }
    }
  }
}

// 强制停止下载
function stopDownload() {
  _downloadUrls = [];
  setEndDownload();
  clearVcodeShowData();
}

// 打开一个验证码页面
function openVcodePage() {
  if (_isDownloading) {
    chrome.windows.create(
      {
        url: chrome.extension.getURL('popup/popup.html#/vcode'),
        type: 'popup',
        width: 540,
        height: 450,
        focused: true,
      },
      w => {
        _vcodePageWindowId = w.id;
      }
    );
  }
}

// 检查URL
function checkProtocol(url) {
  const supportProtocols = ['http', 'https', 'ftp', 'ed2k', 'magnet'];
  let reg = /^([^:]+):.+/g;
  let ret = reg.exec(url);
  if (!ret) {
    return false;
  }
  let protocol = ret[1];
  for (let i = 0; i < supportProtocols.length; i++) {
    if (protocol === supportProtocols[i]) {
      return true;
    }
  }
  return false;
}

// 右键菜单直接下载
function addContextMenu() {
  removeContextMenu();
  chrome.contextMenus.create({
    title: '使用百度网盘离线下载', // %s表示选中的文字
    contexts: ['selection'], // 只有当选中文字时才会出现此右键菜单
    onclick: (info, tab) => {
      let url = null;
      if (info.linkUrl) {
        if (checkProtocol(info.linkUrl)) {
          url = info.linkUrl;
        }
      } else {
        if (checkProtocol(info.selectionText)) {
          url = info.selectionText;
        }
      }
      console.log('检测到一个 URL :', url);
      if (url) {
        if (!_isDownloading) {
          _downloadUrls = [url];
          startDownload();
        } else {
          return alert('有正在下载的任务，请稍后重试');
        }
      } else {
        return alert('未检测到支持的链接（仅支持http/https/ftp/电驴/磁力链协议）');
      }
    },
  });
}

// 移除右键菜单
function removeContextMenu() {
  chrome.contextMenus.removeAll();
}

function isArray(o) {
  return Object.prototype.toString.call(o) === '[object Array]';
}
