<template>
  <div>
    <Row>
      <Col span="24">
        <img :src="img" alt />
      </Col>
    </Row>
    <br />
    <Row>
      <Col span="24">
        <Input v-model="userInputVcode" placeholder="百度网盘离线下载超过10次需要验证码" />
      </Col>
    </Row>
    <br />
    <br />
    <Row :gutter="16" type="flex" justify="center">
      <Col span="10">
        <Button @click="submitVcode" long>确定</Button>
      </Col>
      <Col span="10">
        <Button @click="getNewVcodeShow" long>换一个</Button>
      </Col>
    </Row>
  </div>
</template>

<script>
export default {
  data() {
    return {
      img: null,
      userInputVcode: null,
    };
  },
  created: function() {
    this.client.send('getVcodeShow', null, true).then(img => {
      this.img = img;
    });
  },
  methods: {
    getNewVcodeShow() {
      this.client.send('getNewVcodeShow', null, true).then(img => {
        this.img = img;
      });
    },
    submitVcode() {
      this.client.send('submitUserInputVcode', this.userInputVcode, true);
    },
  },
};
</script>
