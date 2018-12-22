function makeMessage(type, data) {
    return {
        BaiduOnlineDiskHelperMessage: true,
        Type: type,
        Data: data
    }
}

function sendMessageToContent(data) {
    window.postMessage(makeMessage('select-url', data), '*')
}

function searchUrl(node) {
    if (!node) {
        return []
    }

    var urls = []
    var queue = []
    queue.push(node)

    while (queue.length) {
        var curNode = queue.shift()
        if (curNode.nodeType == 1) {
            if (curNode.nodeName == 'A') {
                var url = curNode.getAttribute('href')
                if (url && checkProtocol(url)) {
                    urls.push(url)
                }
            } else {
                if (curNode.hasChildNodes) {
                    for (var i = 0; i < curNode.childNodes.length; i++) {
                        queue.push(curNode.childNodes[i])
                    }
                }
            }
        }
    }

    if (!urls.length) {
        var parentNode = null
        var i = 4
        while (i) {
            i--
            parentNode = node.parentNode
            if (!parentNode) {
                break
            }
            if (parentNode.childNodes.length == 1) {
                if (parentNode.nodeName == 'A') {
                    var url = node.parentNode.getAttribute('href')
                    if (url && checkProtocol(url)) {
                        urls.push(url)
                    }
                    break
                }
                parentNode = parentNode.parentNode
                continue
            }
            break
        }
    }

    return urls
}

window.onmouseup = function () {
    var selObj = window.getSelection()

    var anchorOffset = selObj.anchorOffset
    var focusOffset = selObj.focusOffset

    if (selObj.isCollapsed) {
        return
    }

    var range = selObj.getRangeAt(0);
    var allNode = range.commonAncestorContainer.childNodes

    if (anchorOffset > focusOffset) {
        var startNode = selObj.focusNode.parentNode
        var endNode = selObj.anchorNode.parentNode
    } else {
        var startNode = selObj.anchorNode.parentNode
        var endNode = selObj.focusNode.parentNode
    }

    var urls = []

    if (startNode.isEqualNode(endNode)) {
        urls = searchUrl(startNode)
    } else {
        var hit = false
        for (var i = 0; i < allNode.length; i++) {
            if (allNode[i].isEqualNode(startNode) || allNode[i].contains(startNode)) {
                hit = true
            }
            if (hit) {
                urls = urls.concat(searchUrl(allNode[i]))
            }
            if (allNode[i].isEqualNode(endNode) || allNode[i].contains(endNode)) {
                break
            }
        }
    }

    console.log("提取到 URL", urls)
    if (urls.length) {
        sendMessageToContent(urls)
    }
}

var supportProtocols = [
    "http",
    "https",
    "ftp",
    "ed2k",
    "magnet"
];

function checkProtocol(url) {
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