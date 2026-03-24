# bambulab-p1screen

[English](./README.md) | [简体中文](./README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Vue](https://img.shields.io/badge/Vue-3.5.12-42b883?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.11-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Build](https://github.com/0x5e/bambulab-p1screen/actions/workflows/build.yml/badge.svg)](https://github.com/0x5e/bambulab-p1screen/actions/workflows/build.yml)
[![Lint](https://github.com/0x5e/bambulab-p1screen/actions/workflows/lint.yml/badge.svg)](https://github.com/0x5e/bambulab-p1screen/actions/workflows/lint.yml)

Control screen software for the Bambu Lab P1 series upgrade kit.

Status: In development

## Screenshots
<img src="./screenshoot/home.png" alt="Home" width="50%" />
<img src="./screenshoot/controls.png" alt="Controls" width="50%" />
<img src="./screenshoot/filament.png" alt="Filament" width="50%" />
<img src="./screenshoot/settings.png" alt="Settings" width="50%" />

## Feature List
- Home
  - Print progress
- Controls
  - Nozzle temperature
  - Bed temperature
  - Fan speed
  - Print speed
  - Light
  - XY motion (X/Y)
  - Bed lift (Z)
  - Extruder (E)
- Filament
  - AMS trays
  - External tray
  - Tools
  - Guide
- Settings
  - Network info
  - Device info
  - Accessory info
  - Calibration
- Files
  - File list

## Highlights
- Minimum supported resolution: 568x320 (iPhone 5 size)
- Lower runtime overhead (compared to Home Assistant Web/App), suitable for older devices (Redmi 2 runs smoothly)

## Other Options
- Bambu Handy: Official app does not support landscape well; performance on older devices is untested.
- 3D Apollo: Feature-rich and works well on older devices. Overall UI style (white/yellow) does not match the printer style very well.
- Home Assistant Web/App: High performance overhead (for unknown reasons). Redmi 2 is unusable and may freeze.

## Usage
### Web
#### 1. Deploy backend service
Deploy the backend service (mainly MQTT forwarding) on any device in the same LAN as the printer:

```bash
npm install
npm run build
npm run start
```

#### 2. Add a home screen shortcut on mobile
Access URL:

`http://<server-address>:<port>/?ip=<printer-ip>&serial=<serial>&code=<access-code>`

Default port: `8888`

- iOS: Safari -> Share -> Add to Home Screen -> enable “Open as Web App”
- Android: You can use [web-to-app](https://github.com/shiahonb777/web-to-app/) to create a full-screen home shortcut

Any full-screen web launch method is acceptable. More ideas are welcome.

### Android App
Planned

## Hardware
- [P1S Screen Mod - Redmi 2 Direct Power Version](https://makerworld.com.cn/zh/models/2134336)
- [P1S Screen Mod - iPhone 7/Plus Version](https://makerworld.com.cn/zh/models/1945893)

## TODOs
- Home
  - Persist print task data (project id, url, preview image)
- Controls
  - G-code actions: X, Y, Z, E, Home
  - Sync fan slider with live status
- Filament
  - Filament edit, load/unload, settings, guidance
- Files
  - Fetch file list
- APK build
- Observe status transitions ([reference](https://github.com/greghesp/ha-bambulab/blob/054946b6ab40bdeb772a22abb91b1537a24263fb/custom_components/bambu_lab/pybambu/const.py#L71))
  - `stg_cur`: `CURRENT_STAGE_IDS`
  - `print_type`: `GCODE_STATE_OPTIONS`

## References
- [P1 Screen Operation Guide](https://wiki.bambulab.com/en/p1/manual/screen-operation)
- [P2S Screen Operation Guide](https://wiki.bambulab.com/en/p2s/manual/screen-operation)
- [LAN Control Protocol Docs (OpenBambuAPI)](https://github.com/Doridian/OpenBambuAPI/)
- [LAN Control Protocol Implementation (bambulabs_api)](https://github.com/BambuTools/bambulabs_api)
- [Print State Constants (ha-bambulab)](https://github.com/greghesp/ha-bambulab/blob/main/custom_components/bambu_lab/pybambu/const.py)
