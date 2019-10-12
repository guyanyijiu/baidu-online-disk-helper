<template>
  <div>
    <Row>
      <Col span="24">
        <Input v-model="parseUrls" :rows="10" type="textarea" placeholder="输入或粘贴资源链接到此处（每行一个）" />
      </Col>
    </Row>
    <br />
    <Row>
      <Col span="24">
        <Button type="primary" @click="startDownload" long>开始下载</Button>
      </Col>
    </Row>
    <br />
    <Row :gutter="16" type="flex" justify="center">
      <Col span="10">
        <Button to="/tasks" long>离线任务列表</Button>
      </Col>
      <Col span="10">
        <Button to="/dirs" long>默认下载目录</Button>
      </Col>
    </Row>
  </div>
</template>

<script>
export default {
  data() {
    return {
      parseUrls: '',
    };
  },
  methods: {
    checkProtocol(url) {
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
    },
    startDownload() {
      let parseUrls = this.parseUrls.trim();
      if (!parseUrls) {
        return;
      }
      let urls = parseUrls.split('\n');
      let downloadUrls = [];
      for (let i = 0; i < urls.length; i++) {
        let url = urls[i].trim();
        if (this.checkProtocol(url)) {
          downloadUrls.push(url);
        }
      }
      this.client.send('download', downloadUrls, true).then(isDownloading => {
        if (isDownloading) {
          this.$router.push({ path: '/downloading' });
        }
      });
    },
    openVcode() {
      this.client.send('openVcodePage', null, true);
    },
  },
};
</script>
