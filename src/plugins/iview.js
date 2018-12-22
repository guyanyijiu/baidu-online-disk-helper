import Vue from 'vue'
import {
    Button,
    Row,
    Divider,
    Table,
    Spin,
} from 'iview'

Vue.component('Button', Button)
Vue.component('Row', Row)
Vue.component('Divider', Divider)
Vue.component('Table', Table)

Vue.prototype.$Spin = Spin;

import 'iview/dist/styles/iview.css'
