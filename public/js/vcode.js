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

function sendMessage(data) {
    chrome.runtime.sendMessage(makeMessage('vcode', data));
}

var appData = {
    img: "",
    vcode: "",
    inputVcode: "",
    disablSubmitButton: true,
    disableFlushButton: false,
}

sendMessage({ status: 'init' })

chrome.runtime.onMessage.addListener(function (message, sender) {
    console.log('收到消息: ', message)
    msg = parseMessage(message)
    if (!msg) {
        return
    }
    switch (msg.Data.status) {
        case "init":
            appData.img = msg.Data.img
            appData.vcode = msg.Data.vcode
            break
        case "flush":
            appData.img = msg.Data.img
            appData.vcode = msg.Data.vcode

            appData.disableFlushButton = false
            break
    }
});

var app = new Vue({
    el: '#app',
    data: appData,
    methods: {
        flushVcode() {
            this.inputVcode = ''
            this.disableFlushButton = true
            sendMessage({ status: 'flush' })
        },
        submitVcode() {
            if (!this.inputVcode) {
                return
            }
            this.disablSubmitButton = true
            this.disableFlushButton = true
            sendMessage({
                status: 'submit',
                inputVcode: this.inputVcode
            })
        }
    },
    watch: {
        inputVcode: function (val) {
            if (val) {
                this.disablSubmitButton = false
            } else {
                this.disablSubmitButton = true
            }
        }
    }
})