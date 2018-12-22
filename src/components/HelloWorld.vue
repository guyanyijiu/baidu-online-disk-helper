<template>
    <div>

        <Row type="flex" justify="center" style="margin: 0px; padding: 0px;">
            <Col span="24">
            <Button type="text" disabled>{{title}}</Button>
            </Col>
        </Row>

        <Row type="flex" justify="center" style="margin-bottom:10px;" v-if="!isLogin">
            <Col span="24">
            <Button type="primary" to="https://pan.baidu.com" target="_blank">去登录百度网盘</Button>
            </Col>
        </Row>

        <Row type="flex" justify="center" style="margin-bottom:10px;" v-if="isLogin && !dlYes">
            <Col span="24">
            <Button type="success" long>请先在页面中选择链接</Button>
            </Col>
        </Row>

        <Row type="flex" justify="center" v-if="isLogin && dlYes">
            <Col span="24">
            <Table width="540" height="200" size="small" border ref="selection" :columns="dlTableColumn" :data="dlTableUrls" @on-selection-change="dlSelectChange"></Table>
            </Col>
        </Row>

        <Divider orientation="center" style="margin-top: 6px; margin-bottom: 2px" v-if="isLogin && dlYes">选择下载目录</Divider>
        <Row type="flex" justify="space-around" align="middle" style="margin:8px 0;" v-if="isLogin && dlYes">
            <Col span="8">
            <span style="margin-left: 4px;"> 默认目录: {{dirDefault}} </span>
            </Col>
            <Col span="8">
            <Button type="success" size="small" @click="dirUseDefault">选择</Button>
            </Col>
        </Row>

        <Row type="flex" justify="left" align="middle" style="margin-bottom:10px;" v-if="isLogin && dlYes">
            <Col span="12">
            <Table width="540" height="300" size="small" disabled-hover :show-header=false :columns="dirTableColumn" :data="dirList"></Table>
            </Col>
        </Row>

    </div>
</template>

<script>

export default {
    name: 'HelloWorld',
    props: {
        title: String
    },
    beforeCreate: function () {
        window.bnd_app = this;
    },
    created: function () {
        // 初始化默认下载地址
        this.bnd_background.getBaiduDefaultDownloadDir().then(dir => {
            if (dir) {
                this.dirDefault = dir
            }
        })
        // 初始化 URL
        this.bnd_getCurrentTabId().then(tabId => {
            if (tabId) {
                this.curTabId = tabId
                var urls = this.bnd_background.getDownloadUrls(tabId)
                console.log('检查资源链接', urls)
                this.setDlUrls(urls)
            }
        })

        // 初始化网盘文件夹列表
        this.bnd_background.getBaiduOnlineDiskDirList().then(data => {
            this.setIsLogin(true)
            console.log('检查网盘文件夹:', data)
            this.dirListCache['/'] = data

            this.dirList.push({
                dir: this.dirKeyTitle + this.dirCurrent
            })
            if (data) {
                for (var i = 0; i < data.length; i++) {
                    if (data[i].isdir === 1) {
                        this.dirList.push({
                            dir: data[i].server_filename + '/',
                        })
                    }
                }
            }
        })

        // 初始化下载任务状态
        this.bnd_background.checkDownloadTask().then(status => {
            console.log("检查状态:", status)
            switch (status) {
                case 200:
                    console.log('无未完成任务')
                    break
                case 100:
                    this.globalSpinShow()
                    break
                case 102:
                    console.log('有未完成的任务')
                    break
                case 500:
                    console.log('莫名其妙')
                    break
                default:
                    console.log('未知状态')
                    break
            }
        })
    },
    data() {
        return {
            isLogin: false,
            curTabId: null,
            spinMsg: '正在添加到离线下载...',

            dlYes: false,
            dlCheckedUrls: [],

            dlTableColumn: [
                {
                    type: 'selection',
                    width: 40,
                    align: 'center'
                },
                {
                    title: '选择链接',
                    key: 'url'
                }
            ],
            dlTableUrls: [],

            dirDefault: '/',
            dirKeyTitle: '当前位置: ',
            dirListCache: [],
            dirList: [],
            dirCurrent: '/',
            dirSelected: '/',

            dirTableColumn: [
                {
                    title: '目录',
                    key: 'dir',
                    align: 'left'
                },
                {
                    title: '操作',
                    key: 'action',
                    width: 160,
                    align: 'center',
                    render: (h, params) => {
                        if (params.index === 0) {
                            return h('div', [
                                h('Button', {
                                    props: {
                                        type: 'primary',
                                        size: 'small',
                                    },
                                    style: {
                                        marginRight: '4px'
                                    },
                                    on: {
                                        click: () => {
                                            this.dirGoBack()
                                        }
                                    }
                                }, '返回上级'),
                                h('Button', {
                                    props: {
                                        type: 'success',
                                        size: 'small'
                                    },
                                    on: {
                                        click: () => {
                                            this.storeDirDefault()
                                        }
                                    }
                                }, '设为默认')
                            ])
                        }
                        return h('div', [
                            h('Button', {
                                props: {
                                    type: 'primary',
                                    size: 'small'
                                },
                                style: {
                                    marginRight: '5px'
                                },
                                on: {
                                    click: () => {
                                        this.dirInto(params.row)
                                    }
                                }
                            }, '查看'),
                            h('Button', {
                                props: {
                                    type: 'success',
                                    size: 'small'
                                },
                                on: {
                                    click: () => {
                                        this.dirChecked(params.row)
                                    }
                                }
                            }, '选择'),
                        ]);
                    }
                }
            ]
        }
    },
    methods: {
        setIsLogin(status) {
            this.isLogin = status
        },
        storeDirDefault() {
            this.dirDefault = this.dirCurrent
            this.bnd_background.setBaiduDefaultDownloadDir(this.dirDefault)
        },
        setDlUrls(urls) {
            if (urls && urls.length) {
                this.dlYes = true
                this.dlCheckedUrls = urls
                for (var i = 0; i < urls.length; i++) {
                    this.dlTableUrls.push({ url: urls[i], _checked: true })
                }
            }
        },
        globalSpinShow() {
            this.$Spin.show({
                render: (h) => {
                    return h('div', [
                        h('Icon', {
                            'class': 'demo-spin-icon-load',
                            props: {
                                type: 'ios-loading',
                                size: 22
                            }
                        }),
                        h('div', this.spinMsg)
                    ])
                }
            });
        },
        globalSpinHide() {
            this.$Spin.hide()
            this.dlYes = false
            this.dlCheckedUrls = []
        },
        dlSelectChange(selection) {
            this.dlCheckedUrls = []
            for (var i = 0; i < selection.length; i++) {
                this.dlCheckedUrls.push(selection[i].url)
            }
        },

        dirInto(row) {
            var dir = this.dirCurrent + row.dir
            var path = dir.slice(0, -1)

            if (this.dirListCache[path]) {
                this.dirCurrent = dir
                this.dirList = []
                this.dirList.push({
                    dir: this.dirKeyTitle + this.dirCurrent
                })
                for (var i = 0; i < this.dirListCache[path].length; i++) {
                    if (this.dirListCache[path][i].isdir === 1) {
                        this.dirList.push({
                            dir: this.dirListCache[path][i].server_filename + '/',
                        })
                    }
                }
            } else {
                this.bnd_background.getBaiduOnlineDiskDirList(path).then((function (data) {
                    this.dirListCache[path] = data
                    this.dirCurrent = dir
                    this.dirList = []
                    this.dirList.push({
                        dir: this.dirKeyTitle + this.dirCurrent
                    })
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].isdir === 1) {
                            this.dirList.push({
                                dir: data[i].server_filename + '/',
                            })
                        }
                    }

                }).bind(this))
            }
        },
        dirChecked(row) {
            this.dirSelected = (this.dirCurrent + row.dir).slice(0, -1)
            this.startDownload()
        },
        dirUseDefault() {
            this.dirSelected = this.dirDefault
            this.startDownload.call(this)
        },
        dirGoBack() {
            if (this.dirCurrent === '/') {
                return
            }

            var dir = ''
            var path = this.dirCurrent.slice(0, this.dirCurrent.slice(0, -1).lastIndexOf("/"))
            if (!path) {
                path = '/'
                dir = '/'
            } else {
                dir = path + '/'
            }

            if (this.dirListCache[path]) {
                this.dirCurrent = dir
                this.dirList = []
                this.dirList.push({
                    dir: this.dirKeyTitle + this.dirCurrent
                })
                for (var i = 0; i < this.dirListCache[path].length; i++) {
                    if (this.dirListCache[path][i].isdir === 1) {
                        this.dirList.push({
                            dir: this.dirListCache[path][i].server_filename + '/',
                        })
                    }
                }
            } else {
                this.bnd_background.getBaiduOnlineDiskDirList(path).then((function (data) {
                    this.dirListCache[path] = data
                    this.dirCurrent = dir
                    this.dirList = []
                    this.dirList.push({
                        dir: this.dirKeyTitle + this.dirCurrent
                    })
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].isdir === 1) {
                            this.dirList.push({
                                dir: data[i].server_filename + '/',
                            })
                        }
                    }

                }).bind(this))
            }
        },
        startDownload() {
            if (!this.dirSelected || !this.dlCheckedUrls) {
                alert('未选择下载的链接')
                return
            }
            console.log('开始下载')
            console.log(this.dirSelected)
            console.log(this.dlCheckedUrls)

            var ret = this.bnd_background.toDownloadUrls(this.curTabId, this.dlCheckedUrls, this.dirSelected)
            console.log(ret)
            if (ret.code && ret.code !== 200) {
                alert(ret.msg)
            }
            this.globalSpinShow()
        },
        finishedDownload() {
            this.spinMsg = '添加到离线下载成功'
            setTimeout(this.globalSpinHide, 3000)
        }

    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
.dl-checkbox {
  text-align: left;
}
.dl-item {
  display: block;
}
.ivu-table-cell {
  padding-left: 10px;
  padding-right: 10px;
}
.demo-spin-icon-load {
  animation: ani-demo-spin 1s linear infinite;
}
</style>
