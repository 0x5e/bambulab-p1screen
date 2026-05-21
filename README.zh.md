# bambulab-p1screen

[English](./README.md) | [简体中文](./README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Vue](https://img.shields.io/badge/Vue-3.5.12-42b883?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.11-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![GHCR](https://img.shields.io/badge/GHCR-ghcr.io%2F0x5e%2Fbambulab--p1screen-2496ED?logo=docker&logoColor=white)](https://github.com/0x5e/bambulab-p1screen/pkgs/container/bambulab-p1screen)
[![Build](https://github.com/0x5e/bambulab-p1screen/actions/workflows/npm-build.yml/badge.svg)](https://github.com/0x5e/bambulab-p1screen/actions/workflows/npm-build.yml)

拓竹 P1 系列控制屏软件。

## 预览图
<img src="./screenshoot/home-idle.png" alt="主页（空闲）" width="50%" />
<img src="./screenshoot/home.png" alt="主页" width="50%" />
<img src="./screenshoot/home-warning.png" alt="主页（警告）" width="50%" />
<img src="./screenshoot/control.png" alt="控制页" width="50%" />
<img src="./screenshoot/printspeed.png" alt="打印速度" width="50%" />
<img src="./screenshoot/motion.png" alt="运动" width="50%" />
<img src="./screenshoot/nozzle.png" alt="喷嘴和挤出机" width="50%" />
<img src="./screenshoot/heatbed.png" alt="热床" width="50%" />
<img src="./screenshoot/filament.png" alt="耗材页" width="50%" />
<img src="./screenshoot/filament-edit.png" alt="耗材编辑页" width="50%" />
<img src="./screenshoot/setting.png" alt="设置页" width="50%" />
<img src="./screenshoot/message.png" alt="消息页" width="50%" />

## 系统要求
- 分辨率：>= 568x320（iPhone 5 尺寸）
- 浏览器/系统版本：Chrome >= 57，iOS >= 10.3
- 局域网控制：P1S固件版本 <= 01.08.01.00，或开启“仅局域网”和“开发者模式”开关

## 使用步骤
### Android 版
[下载地址](https://github.com/0x5e/bambulab-p1screen/releases)

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

```bash
docker run -d ghcr.io/0x5e/bambulab-p1screen:latest
```

##### 方式 3：Docker Compose
使用仓库内的 [docker-compose.yml](./docker-compose.yml)：

```bash
docker compose up -d
```

#### 2. 移动端添加浏览器桌面书签
访问地址：

`http://后端服务地址:端口/`

默认端口：`8888`

- iOS：Safari -> 共享 -> 添加到主屏幕 -> 选中“作为网页 App 打开”
- Android：可使用 [web-to-app](https://github.com/shiahonb777/web-to-app/) 添加桌面快捷方式（选择全屏启动）

只要有办法让网页全屏运行即可，其他方案欢迎共同探索。

## 硬件部分
- [P1S 屏幕改装 - 红米2直供电版](https://makerworld.com.cn/zh/models/2134336)
- [P1S 屏幕改装 - iPhone7/Plus版](https://makerworld.com.cn/zh/models/1945893)

## TODOs
- 首页
  - 文件列表
- 其他
  - 全局弹窗（打印成功 / 失败 / 警告）
  - AMS 2 / AMS HT 适配

## 参考内容
- [P1 系列屏幕操作指南](https://wiki.bambulab.com/en/p1/manual/screen-operation)
- [P2S 屏幕操作指南](https://wiki.bambulab.com/en/p2s/manual/screen-operation)
- [局域网控制协议文档（OpenBambuAPI）](https://github.com/Doridian/OpenBambuAPI/)
- [局域网控制协议实现（bambulabs_api）](https://github.com/BambuTools/bambulabs_api)
- [打印状态码参考（ha-bambulab）](https://github.com/greghesp/ha-bambulab/blob/main/custom_components/bambu_lab/pybambu/const.py)
- [bambu-printer-manager > docs](https://github.com/synman/bambu-printer-manager/tree/main/docs)
