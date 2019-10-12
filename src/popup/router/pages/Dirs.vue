<template>
  <div>
    <Row>
      <Col span="24">
        <Button type="primary" to="/" long>返回</Button>
      </Col>
    </Row>
    <br />
    <Row>
      <Col span="24">
        <Button type="text">当前默认下载目录: {{ dirDefault }}</Button>
      </Col>
    </Row>
    <Row>
      <Col span="24">
        <Button type="text" @click="dirGoBack">返回上一级</Button>
      </Col>
    </Row>
    <Row>
      <Col span="24">
        <Table size="small" :columns="dirTable" :data="dirList"></Table>
      </Col>
    </Row>
  </div>
</template>

<script>
export default {
  data() {
    return {
      dirDefault: '/',
      dirCurrent: '',
      dirTable: [
        {
          title: '目录',
          key: 'name',
          tooltip: true,
        },
        {
          title: '操作',
          key: 'path',
          width: 160,
          align: 'center',
          render: (h, params) => {
            return h('div', [
              h(
                'Button',
                {
                  props: {
                    type: 'primary',
                    size: 'small',
                  },
                  style: {
                    marginRight: '5px',
                  },
                  on: {
                    click: () => {
                      this.dirOpen(params.row);
                    },
                  },
                },
                '打开'
              ),
              h(
                'Button',
                {
                  props: {
                    type: 'success',
                    size: 'small',
                  },
                  on: {
                    click: () => {
                      this.dirSetDefault(params.row);
                    },
                  },
                },
                '选择'
              ),
            ]);
          },
        },
      ],
      dirList: [],
    };
  },
  created: function() {
    this.client.send('getDirs', null, true).then(dirInfo => {
      this.renderDirs(dirInfo);
      this.dirCurrent = '/';
    });
    this.client.send('getDefaultDir', null, true).then(dir => {
      this.dirDefault = dir;
    });
  },
  methods: {
    renderDirs(dirs) {
      let len = dirs.length;
      let dirList = [];
      for (let i = 0; i < len; i++) {
        if (dirs[i]['isdir'] === 1) {
          dirList.push({
            name: dirs[i]['server_filename'],
            path: dirs[i]['path'],
          });
        }
      }
      this.dirList = dirList;
    },
    dirOpen(row) {
      let path = row['path'];
      this.client.send('getDirs', path, true).then(dirInfo => {
        this.renderDirs(dirInfo);
        this.dirCurrent = path;
      });
    },
    dirSetDefault(row) {
      this.client.send('saveDefaultDir', row['path'], true).then(() => {
        this.dirDefault = row['path'];
      });
    },
    dirGoBack() {
      if (this.dirCurrent === '/') {
        return;
      }
      let path = this.dirCurrent.slice(0, this.dirCurrent.slice(0, -1).lastIndexOf('/'));
      if (!path) {
        path = '/';
      }
      this.client.send('getDirs', path, true).then(dirInfo => {
        this.renderDirs(dirInfo);
        this.dirCurrent = path;
      });
    },
  },
};
</script>
