# bambulab-p1screen

[English](./README.md) | [简体中文](./README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Vue](https://img.shields.io/badge/Vue-3.5.12-42b883?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.11-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![GHCR](https://img.shields.io/badge/GHCR-ghcr.io%2F0x5e%2Fbambulab--p1screen-2496ED?logo=docker&logoColor=white)](https://github.com/0x5e/bambulab-p1screen/pkgs/container/bambulab-p1screen)
[![Build](https://github.com/0x5e/bambulab-p1screen/actions/workflows/npm-build.yml/badge.svg)](https://github.com/0x5e/bambulab-p1screen/actions/workflows/npm-build.yml)

Control screen software for the Bambu Lab P1 series.

## Screenshots
<img src="./screenshoot/home-idle.png" alt="Home Idle" width="50%" />
<img src="./screenshoot/home.png" alt="Home" width="50%" />
<img src="./screenshoot/home-warning.png" alt="Home Warning" width="50%" />
<img src="./screenshoot/control.png" alt="Controls" width="50%" />
<img src="./screenshoot/printspeed.png" alt="PrintSpeed" width="50%" />
<img src="./screenshoot/motion.png" alt="Motion" width="50%" />
<img src="./screenshoot/nozzle.png" alt="Nozzle" width="50%" />
<img src="./screenshoot/heatbed.png" alt="Heatbed" width="50%" />
<img src="./screenshoot/filament.png" alt="Filament" width="50%" />
<img src="./screenshoot/filament-edit.png" alt="FilamentEdit" width="50%" />
<img src="./screenshoot/setting.png" alt="Settings" width="50%" />
<img src="./screenshoot/message.png" alt="Message" width="50%" />

## System Requirements
- Display: >= 568x320 (iPhone 5 resolution)
- Browser/System version: Chrome >= 57，iOS >= 10.3
- Printer firmware version: P1S <= 01.08.01.00 (above this version, MQTT control protocol was encrypted, not available anymore)

## Usage
### Android App
[Download Link](https://github.com/0x5e/bambulab-p1screen/releases)

### Web
#### 1. Deploy backend service
Deploy the backend service on any device in the same LAN as the printer (mainly MQTT forwarding):

##### Option 1: npm

```bash
npm install
npm run build
npm run start
```

##### Option 2: Docker
```bash
docker run -d ghcr.io/0x5e/bambulab-p1screen:latest
```

##### Option 3: Docker Compose
Use the provided [docker-compose.yml](./docker-compose.yml):

```bash
docker compose up -d
```

#### 2. Add a home screen shortcut on mobile
Access URL:

`http://<server-address>:<port>/`

Default port: `8888`

- iOS: Safari -> Share -> Add to Home Screen -> enable “Open as Web App”
- Android: You can use [web-to-app](https://github.com/shiahonb777/web-to-app/) to create a full-screen home shortcut

Any full-screen web launch method is acceptable. More ideas are welcome.

## Hardware
- [P1S Screen Mod - Redmi 2 Direct Power Version](https://makerworld.com.cn/zh/models/2134336)
- [P1S Screen Mod - iPhone 7/Plus Version](https://makerworld.com.cn/zh/models/1945893)

## TODOs
- Homepage
  - File list
- Other
  - Global Dialog(Print Success / Failure / Warning)
  - AMS 2 / AMS HT support

## References
- [P1 Screen Operation Guide](https://wiki.bambulab.com/en/p1/manual/screen-operation)
- [P2S Screen Operation Guide](https://wiki.bambulab.com/en/p2s/manual/screen-operation)
- [LAN Control Protocol Docs (OpenBambuAPI)](https://github.com/Doridian/OpenBambuAPI/)
- [LAN Control Protocol Implementation (bambulabs_api)](https://github.com/BambuTools/bambulabs_api)
- [Print State Constants (ha-bambulab)](https://github.com/greghesp/ha-bambulab/blob/main/custom_components/bambu_lab/pybambu/const.py)
- [bambu-printer-manager > docs](https://github.com/synman/bambu-printer-manager/tree/main/docs)
