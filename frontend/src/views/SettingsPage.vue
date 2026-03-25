<template>
  <div class="settings-page">
    <van-cell-group inset title="网络信息">
      <van-cell title="IP 地址" :value="ip" />
      <van-cell title="WiFi 信号强度" :value="device.print.wifi_signal ?? '未知'" />
      <van-cell title="状态" :value="statusLabel" />
    </van-cell-group>

    <van-cell-group v-if="deviceInfo" inset title="设备信息">
      <van-cell title="设备型号" :value="deviceInfo.product_name" />
      <van-cell title="序列号" :value="deviceInfo.sn" />
      <van-cell title="固件版本" :value="deviceInfo.sw_ver" />
    </van-cell-group>

    <van-cell-group v-for="(module, index) in modules" :key="index" inset title="配件信息">
      <van-cell title="配件" :value="module.product_name" />
      <van-cell title="序列号" :value="module.sn" />
      <van-cell title="固件版本" :value="module.sw_ver" />
    </van-cell-group>

    <van-cell-group v-if="isDev" inset title="调试">
      <van-cell title="重新连接" is-link @click="client.connect(ip, serial, code)"/>
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PrinterClient } from '../api/PrinterClient'

const isDev = import.meta.env.DEV
const client = PrinterClient.getInstance()
const device = client.device
const params = new URLSearchParams(location.search)
const ip = params.get('ip') ?? ''
const serial = params.get('serial') ?? ''
const code = params.get('code') ?? ''

const deviceInfo = computed(() => device.module.find(item => item.name === 'ota') ?? null)
const modules = computed(() => device.module.filter(item => item.name.includes('ams')))

const statusLabel = computed(() => {
  const state = client.readyState.value
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
