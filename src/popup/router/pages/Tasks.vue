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
        <Table size="small" :loading="isLoading" :columns="taskTable" :data="taskList"></Table>
      </Col>
    </Row>
  </div>
</template>

<script>
export default {
  data() {
    return {
      taskTable: [
        {
          title: '文件名',
          key: 'task_name',
          tooltip: true,
        },
        {
          title: '开始时间',
          key: 'start_time',
          width: 90,
          tooltip: true,
        },
        {
          title: '大小',
          key: 'size',
          width: 90,
        },
        {
          title: '状态',
          key: 'statusWord',
          width: 100,
        },
      ],
      taskList: [],
      isLoading: true,
    };
  },
  created: function() {
    this.client.send('getTasks', null, true).then(taskInfo => {
      let taskList = [];
      for (let k in taskInfo) {
        let statusWord = '未知';
        switch (taskInfo[k]['status']) {
          case '0':
            statusWord = '下载成功';
            break;
          case '1':
            statusWord = formatFileSize(taskInfo[k]['finished_size']);
            break;
          case '4':
            statusWord = '下载失败';
            break;
        }
        let startTime = taskInfo[k]['start_time'];
        if (startTime === '0') {
          startTime = '-';
        } else {
          startTime = formatTimestamp(startTime * 1000);
        }
        taskList.push({
          task_id: k,
          status: taskInfo[k]['status'],
          task_name: taskInfo[k]['task_name'],
          statusWord: statusWord,
          size: formatFileSize(taskInfo[k]['file_size']),
          start_time: startTime,
        });
      }
      this.taskList = taskList;
      this.isLoading = false;
    });
  },
};

// 格式化文件大小
function formatFileSize(fileSize) {
  fileSize = parseFloat(fileSize);
  if (fileSize === NaN || fileSize === 0) {
    return '0 B';
  }
  let unitArr = new Array('B', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y');
  let index = 0;
  index = Math.floor(Math.log(fileSize) / Math.log(1024));
  let size = fileSize / Math.pow(1024, index);
  size = size.toFixed(2);
  return size + unitArr[index];
}
// 格式化时间戳
function formatTimestamp(ts) {
  let date = new Date(ts);
  let y = date.getFullYear();
  let m = date.getMonth();
  let d = date.getDate();
  let h = date.getHours();
  let i = date.getMinutes();
  let s = date.getSeconds();

  return y + '-' + m + '-' + d + ' ' + h + ':' + i + ':' + s;
}
</script>
