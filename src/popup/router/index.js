import Vue from 'vue';
import VueRouter from 'vue-router';
import routes from './routes';
import { createClient } from 'connect.io';

import iView from 'iview';
import 'iview/dist/styles/iview.css';

const client = createClient();

Vue.use(VueRouter);
Vue.use(iView);
Vue.prototype.client = client;

export default new VueRouter({
  routes,
});
