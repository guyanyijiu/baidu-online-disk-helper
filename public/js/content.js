// 注意，必须设置了run_at=document_start 此段代码才会生效
document.addEventListener('DOMContentLoaded', function () {
	// 注入自定义JS
	injectCustomJs();
});

// 监听来自 inject js 的消息
window.addEventListener("message", function (e) {
	var message = parseMessage(e.data)
	if (!message) {
		return
	}

	// console.log('收到 inject 的消息：', message);

	if (message.Type === 'select-url') {
		sendMessageToBackground(e.data)
	}
}, false);

// 主动发送消息给后台
function sendMessageToBackground(message) {
	chrome.runtime.sendMessage(message)
}

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

// 向页面注入JS
function injectCustomJs(jsPath) {
	jsPath = jsPath || 'js/baidu-online-disk-helper.js';
	var temp = document.createElement('script');
	temp.setAttribute('type', 'text/javascript');
	// 获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
	temp.src = chrome.extension.getURL(jsPath);
	temp.onload = function () {
		// 放在页面不好看，执行完后移除掉
		this.parentNode.removeChild(this);
	};
	document.body.appendChild(temp);
}


