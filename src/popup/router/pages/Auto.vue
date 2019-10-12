<template>
  <div>
    <Row>
      <Col span="24">
        <Table ref="selection" size="small" @on-selection-change="tableSelectionChange" :columns="urlTable" :data="urlList"></Table>
      </Col>
    </Row>
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
      urlTable: [
        {
          type: 'selection',
          width: 60,
          align: 'center',
        },
        {
          title: '链接',
          key: 'url',
          tooltip: true,
        },
      ],
      urlList: [],
      selectionUrlList: [],
    };
  },
  created: function() {
    this.client.send('getAutoExtractUrls', null, true).then(urls => {
      let urlList = [];
      for (let i = 0; i < urls.length; i++) {
        urlList.push({
          url: urls[i],
          _checked: true,
        });
      }
      this.urlList = urlList;
      this.selectionUrlList = urls;
    });
  },
  methods: {
    startDownload() {
      this.client
        .send('downloadAutoExtractUrls', this.selectionUrlList, true)
        .then(isDownloading => {
          if (isDownloading) {
            this.$router.push({ path: '/downloading' });
          }
        })
        .catch(err => {
          console.log(err);
        });
    },
    tableSelectionChange(selection) {
      let selectionUrlList = [];
      for (let i = 0; i < selection.length; i++) {
        selectionUrlList[i] = selection[i]['url'];
      }
      this.selectionUrlList = selectionUrlList;
    },
  },
};
</script>
