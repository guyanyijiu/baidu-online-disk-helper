<template>
    <div id="app">
        <HelloWorld title="百度网盘离线下载助手" />
    </div>
</template>

<script>
import HelloWorld from './components/HelloWorld.vue'

export default {
    name: 'app',
    components: {
        HelloWorld
    }
}
</script>

<style>
#app {
  /* font-family: 'Avenir', Helvetica, Arial, sans-serif; */
  /* -webkit-font-smoothing: antialiased; */
  /* -moz-osx-font-smoothing: grayscale; */
  text-align: left;
  color: #2c3e50;
  margin-top: 2px;
  margin-left: 0px;
  margin-right: 0px;
  width: 540px;
}
</style>
