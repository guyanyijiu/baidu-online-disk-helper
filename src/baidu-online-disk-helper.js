function sendMessageToContent(data) {
  window.postMessage({ baiduOnlineDiskHelper: data }, '*');
}

function searchUrl(node) {
  if (!node) {
    return [];
  }

  let urls = [];
  let queue = [];
  queue.push(node);

  while (queue.length) {
    let curNode = queue.shift();
    if (curNode.nodeType === 1) {
      if (curNode.nodeName === 'A') {
        let url = curNode.getAttribute('href');
        if (url && checkProtocol(url)) {
          urls.push(url);
        }
      } else {
        if (curNode.hasChildNodes) {
          for (let i = 0; i < curNode.childNodes.length; i++) {
            queue.push(curNode.childNodes[i]);
          }
        }
      }
    }
  }

  if (!urls.length) {
    let parentNode = null;
    let i = 4;
    while (i) {
      i--;
      parentNode = node.parentNode;
      if (!parentNode) {
        break;
      }
      if (parentNode.childNodes.length === 1) {
        if (parentNode.nodeName === 'A') {
          let url = node.parentNode.getAttribute('href');
          if (url && checkProtocol(url)) {
            urls.push(url);
          }
          break;
        }
        parentNode = parentNode.parentNode;
        continue;
      }
      break;
    }
  }

  return urls;
}

window.onmouseup = function() {
  let selObj = window.getSelection();

  let anchorOffset = selObj.anchorOffset;
  let focusOffset = selObj.focusOffset;

  if (selObj.isCollapsed) {
    return;
  }

  let range = selObj.getRangeAt(0);
  let allNode = range.commonAncestorContainer.childNodes;
  let startNode = null;
  let endNode = null;

  if (anchorOffset > focusOffset) {
    startNode = selObj.focusNode.parentNode;
    endNode = selObj.anchorNode.parentNode;
  } else {
    startNode = selObj.anchorNode.parentNode;
    endNode = selObj.focusNode.parentNode;
  }

  let urls = [];

  if (startNode.isEqualNode(endNode)) {
    urls = searchUrl(startNode);
  } else {
    let hit = false;
    for (let i = 0; i < allNode.length; i++) {
      if (allNode[i].isEqualNode(startNode) || allNode[i].contains(startNode)) {
        hit = true;
      }
      if (hit) {
        urls = urls.concat(searchUrl(allNode[i]));
      }
      if (allNode[i].isEqualNode(endNode) || allNode[i].contains(endNode)) {
        break;
      }
    }
  }

  console.log('提取到 URL', urls);
  if (urls.length) {
    sendMessageToContent(urls);
  }
};

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
