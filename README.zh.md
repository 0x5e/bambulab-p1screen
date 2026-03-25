# bambulab-p1screen

[English](./README.md) | [简体中文](./README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Vue](https://img.shields.io/badge/Vue-3.5.12-42b883?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.11-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Build](https://github.com/0x5e/bambulab-p1screen/actions/workflows/build.yml/badge.svg)](https://github.com/0x5e/bambulab-p1screen/actions/workflows/build.yml)
[![Lint](https://github.com/0x5e/bambulab-p1screen/actions/workflows/lint.yml/badge.svg)](https://github.com/0x5e/bambulab-p1screen/actions/workflows/lint.yml)

拓竹 P1 系列升级套件之控制屏软件。

目前：开发中

## 预览图
<img src="./screenshoot/home.png" alt="主页" width="50%" />
<img src="./screenshoot/controls.png" alt="控制页" width="50%" />
<img src="./screenshoot/filament.png" alt="耗材页" width="50%" />
<img src="./screenshoot/settings.png" alt="设置页" width="50%" />

## 功能列表
- 主页
  - 打印进度
- 控制
  - 喷嘴温度
  - 热床温度
  - 风扇速度
  - 打印速度
  - 照明
  - XY 轴控制（X/Y）
  - 热床升降（Z）
  - 挤出机（E）
- 耗材
  - AMS 料盘
  - 外挂料盘
  - 工具
  - 指南
- 设置
  - 网络信息
  - 设备信息
  - 配件信息
  - 校准
- 文件夹
  - 文件列表

## 特性
- 分辨率最低适配到 568x320（iPhone 5 尺寸）
- 性能开销低（相对 Home Assistant 网页端 & App 端），支持老旧设备（红米 2 可流畅运行）

## 其他可选方案
- Bambu Handy：官方应用不支持横屏，老旧设备运行流畅度未测试。
- 3D Apollo：功能完善，老旧设备运行良好。UI 整体风格为白黄色，与打印机整体风格不是很搭。
- Home Assistant 网页版 & App 版：性能开销大（不知何故），红米 2 无法正常使用，卡到死机很多次。

## 使用步骤
### Web 版
#### 1. 部署后端服务
在打印机局域网内任意设备部署（主要负责 MQTT 转发）：

##### 方式 1：npm

```bash
npm install
npm run build
npm run start
```

##### 方式 2：Docker
使用已发布镜像：

```bash
docker run -d --name bambulab-p1screen ghcr.io/0x5e/bambulab-p1screen:latest
```

##### 方式 3：Docker Compose
使用仓库内的 [docker-compose.yml](./docker-compose.yml)：

```bash
docker compose up -d
```

#### 2. 移动端添加浏览器桌面书签
访问地址：

`http://后端服务地址:端口/?ip=打印机地址&serial=序列号&code=访问码`

默认端口：`8888`

- iOS：Safari -> 共享 -> 添加到主屏幕 -> 选中“作为网页 App 打开”
- Android：可使用 [web-to-app](https://github.com/shiahonb777/web-to-app/) 添加桌面快捷方式（选择全屏启动）

只要有办法让网页全屏运行即可，其他方案欢迎共同探索。

### Android 版
待开发

## 硬件部分
- [P1S 屏幕改装 - 红米2直供电版](https://makerworld.com.cn/zh/models/2134336)
- [P1S 屏幕改装 - iPhone7/Plus版](https://makerworld.com.cn/zh/models/1945893)

## TODOs
- 主页
  - 打印任务数据（项目 id、url、预览图）持久化
- 控制页
  - gcode 操作：X、Y、Z、E、Home
  - 风扇滑动条随状态改变
- 耗材页
  - 耗材编辑、进退料、设置、引导
- 文件页
  - 获取文件列表
- APK 构建
- 观察状态变化（[参考链接](https://github.com/greghesp/ha-bambulab/blob/054946b6ab40bdeb772a22abb91b1537a24263fb/custom_components/bambu_lab/pybambu/const.py#L71)）
  - `stg_cur`: `CURRENT_STAGE_IDS`
  - `print_type`: `GCODE_STATE_OPTIONS`

## 参考内容
- [P1 系列屏幕操作指南](https://wiki.bambulab.com/en/p1/manual/screen-operation)
- [P2S 屏幕操作指南](https://wiki.bambulab.com/en/p2s/manual/screen-operation)
- [局域网控制协议文档（OpenBambuAPI）](https://github.com/Doridian/OpenBambuAPI/)
- [局域网控制协议实现（bambulabs_api）](https://github.com/BambuTools/bambulabs_api)
- [打印状态码参考（ha-bambulab）](https://github.com/greghesp/ha-bambulab/blob/main/custom_components/bambu_lab/pybambu/const.py)
