<template>
  <div class="settings-page">
    <van-cell-group inset title="基础信息">
      <van-cell
        title="IP地址"
        :value="baseInfo.ip"
        is-link
        @click="onBaseClick('ip')"
      />
      <van-cell
        title="序列号"
        :value="baseInfo.serial"
        is-link
        @click="onBaseClick('serial')"
      />
      <van-cell
        title="访问码"
        :value="baseInfo.accessCode"
        is-link
        @click="onBaseClick('accessCode')"
      />
      <van-cell title="状态" :value="statusLabel" />
    </van-cell-group>

    <van-cell-group inset title="设备信息" v-if="deviceInfo">
      <van-cell title="设备型号" :value="deviceInfo.product_name" />
      <van-cell title="序列号" :value="deviceInfo.sn" />
      <van-cell title="固件版本" :value="deviceInfo.sw_ver" />
      <van-cell title="WiFi信号强度" :value="device.print.wifi_signal" />
    </van-cell-group>

    <template v-for="(module, index) in modules" :key="index">
      <van-cell-group inset title="配件信息">
        <van-cell title="配件" :value="module.product_name" />
        <van-cell title="序列号" :value="module.sn" />
        <van-cell title="固件版本" :value="module.sw_ver" />
      </van-cell-group>
    </template>

    <template v-if="isDev">
      <van-cell-group inset title="调试">
        <van-cell title="重连WebSocket" is-link @click="WSService.getInstance().connect()"/>
      </van-cell-group>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { device } from '../store/device'
import { WSService } from '../store/ws'

const isDev = import.meta.env.DEV

const onBaseClick = (key: 'ip' | 'serial' | 'accessCode') => {
  console.log('[Settings] base click', key)
}

const baseInfo = computed(() => {
  return {
    ip: window.localStorage.getItem('ip') ?? '',
    serial: window.localStorage.getItem('serial') ?? '',
    accessCode: window.localStorage.getItem('accessCode') ?? ''
  }
})

const deviceInfo = computed(() => {
  if (!device.module) return null
  return device.module.find(item => item.name === 'ota')
})

const modules = computed(() => {
  if (!device.module) return []
  return device.module.filter(item => item.name.includes('ams'))
})

const statusLabel = computed(() => {
  const state = WSService.getInstance().getReadyStateRef().value
  if (state === null) return '未连接'
  switch (state) {
    case WebSocket.CONNECTING:
      return '连接中'
    case WebSocket.OPEN:
      return '已连接'
    case WebSocket.CLOSING:
      return '断开中'
    case WebSocket.CLOSED:
      return '已断开'
    default:
      return '未知'
  }
})

</script>

<style scoped>
.settings-page {
  display: grid;
  gap: 12px;
  padding: 8px 8px 12px;
  overscroll-behavior: none;
}
</style>
