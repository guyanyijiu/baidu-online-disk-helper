<template>
  <div>
    <Divider orientation="center" style="margin-top: 6px; margin-bottom: 2px">当前有任务正在下载中...</Divider>
    <Row>
      <Col span="24">
        <Table ref="selection" size="small" :columns="urlTable" :data="urlList"></Table>
      </Col>
    </Row>
    <br />
    <Row>
      <Col span="24">
        <Button type="primary" @click="stopDownload" long>立即取消当前离线下载</Button>
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
      urlTable: [
        {
          title: '链接',
          key: 'url',
          tooltip: true,
        },
      ],
      urlList: [],
      timer: null,
    };
  },
  created: function() {
    this.updateList();
  },
  methods: {
    updateList() {
      if (this.timer) {
        clearTimeout(this.timer);
      }
      this.client
        .send('getDownloadUrls', null, true)
        .then(urls => {
          if (urls.length === 0) {
            this.checkDownloadStatus();
            return;
          }
          let urlList = [];
          for (let i = 0; i < urls.length; i++) {
            urlList.push({
              url: urls[i],
              _checked: true,
            });
          }
          this.urlList = urlList;
          this.timer = setTimeout(this.updateList, 3000);
        })
        .catch(err => {});
    },
    checkDownloadStatus() {
      this.client.send('getDownloadStatus', null, true).then(status => {
        if (status) {
          this.timer = setTimeout(this.updateList, 3000);
        } else {
          this.$router.push({ path: '/' });
        }
      });
    },
    stopDownload() {
      this.client
        .send('stopDownload', null, true)
        .then(isDownloading => {
          this.$router.push({ path: '/' });
        })
        .catch(err => {
          this.$router.push({ path: '/' });
        });
    },
  },
};
</script>
