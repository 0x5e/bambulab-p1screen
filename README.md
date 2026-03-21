# 简介
为拓竹P1提供与拓竹P2S屏幕接近一致的操作界面与使用体验。

P2S屏幕操作指南：https://wiki.bambulab.com/en/p2s/manual/screen-operation
P1系列屏幕操作指南：https://wiki.bambulab.com/en/p1/manual/screen-operation
MQTT协议文档：https://github.com/Doridian/OpenBambuAPI/

# 打印屏功能列表
- 主页
- 控制
    - 喷嘴温度
    - 热床温度
    - 打印速度
    - 上下料
    - 挤出机（E）
    - Z轴升降（Z）
    - XY轴控制（X/Y）
- 耗材
    - AMS料盘
    - 外挂料盘
    - 工具
    - 指南
- 设置
    - 账号（绑定）
    - SD卡
    - 设备
    - 固件
    - 配件
    - 校准
- 文件夹

# 使用场景
- 触屏移动端设备，横屏使用
<!-- - 分辨率最低需适配640x360 -->
- 分辨率最低需适配568x320（iPhone5）
- 老旧设备，避免性能开销大的阴影和动画效果

# 整体架构
## 前端
- 主要使用 typescript + vue3 + vant4 实现
- 左侧导航栏，右侧显示页面，占满屏幕
- 页面默认占满一屏，若内容较多则向下滑动显示

## 后端
- 使用 typescript 运行 mqtt to websocket 转发服务
- 协议实现参考：https://github.com/BambuTools/bambulabs_api

## 使用步骤
1. 部署后端服务
2. 手机端添加浏览器桌面书签（http://后端ip/?ip=打印机&serial=序列号&code=访问码）

## TODO
- 主页：预览图(3mf解压，提取./Metadata/plate_1.png)
- 控制页gcode操作：X、Y、Z、E、Home
- 耗材页：耗材编辑、进退料、UI优化
- 文件页：ftp获取文件列表、预览图
- apk构建
