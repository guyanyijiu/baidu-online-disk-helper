var background = chrome.extension.getBackgroundPage()
function getCurrentTabId() {
    return new Promise(function (resolve, reject) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            var id = tabs.length ? tabs[0].id : null
            resolve(id)
        });
    })
}

import Vue from 'vue'
import App from './App.vue'
import './plugins/iview.js'

Vue.prototype.bnd_background = background
Vue.prototype.bnd_getCurrentTabId = getCurrentTabId
Vue.config.productionTip = false

new Vue({
    render: h => h(App)
}).$mount('#app')