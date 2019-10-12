<template></template>

<script>
export default {
  data() {
    return {};
  },
  created: function() {
    this.client.send('checkLogin', null, true).then(isLogin => {
      if (isLogin) {
        this.client.send('getDownloadStatus', null, true).then(status => {
          if (status) {
            this.$router.push({ path: '/downloading' });
          } else {
            this.client.send('getAutoExtractUrls', null, true).then(urls => {
              if (urls.length > 0) {
                this.$router.push({ path: '/auto' });
              } else {
                this.$router.push({ path: '/input' });
              }
            });
          }
        });
      } else {
        this.$router.push({ path: '/login' });
      }
    });
  },
};
</script>
