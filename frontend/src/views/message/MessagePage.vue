<template>
  <div class="msg-page">
    <div class="card detail-panel" v-if="selectedMsg">
      <canvas ref="qrCanvasRef" class="qr-canvas"></canvas>
      <a class="detail-url" :href="url(selectedMsg)" target="_blank">{{ url(selectedMsg) }}</a>
      <div class="detail-text">{{ text(selectedMsg) }}</div>
    </div>
    <van-empty v-else class="card" :description="t('empty_message_hint')" />

    <div class="card list-panel">
      <div class="list-header">
        {{ t('assistant') }} {{ device && device.hms.length > 0 ? `(${device.hms.length})` : '' }}
      </div>
      <div class="list-body">
        <div
          v-for="item in device?.hms"
          :key="item.attr + '-' + item.code"
          class="msg-item"
          :class="[`msg-level-${msgLevel(item)}`, { 'msg-selected': selectedMsg?.attr === item.attr && selectedMsg?.code === item.code }]"
          @click="selectedMsg = item"
        >
          <div class="msg-item-text">{{ text(item) }}</div>
          <div class="msg-item-code">[{{ ecode(item, true) }}]</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode'
import { usePrinterStore } from '../../stores/printer'
import { DeviceHMS } from '../../api/device'
import hmsData from '../../assets/devicehms@202602042359/01S/hms.json'

const { locale, t } = useI18n()
const { device } = usePrinterStore()
const selectedMsg = ref<DeviceHMS | null>(device.value?.hms[0] || null)
const qrCanvasRef = ref<HTMLCanvasElement | null>(null)

watch(device, () => {
  if (!selectedMsg.value && device.value?.hms.length) {
    selectedMsg.value = device.value.hms[0]
  }
}, { immediate: true })

watch(selectedMsg, async () => {
  await nextTick()
  if (qrCanvasRef.value && selectedMsg.value) {
    QRCode.toCanvas(qrCanvasRef.value, url(selectedMsg.value), {
      width: 120,
      margin: 1,
      color: { dark: '#000', light: '#fff' },
    })
  }
}, { immediate: true })

const msgLevel = (msg: DeviceHMS) => (msg.code >> 16)
const ecode = (msg: DeviceHMS, readable: boolean) => {
  let code = `${(msg.attr >> 16).toString(16).padStart(4, '0')}-${(msg.attr & 0xffff).toString(16).padStart(4, '0')}-${(msg.code >> 16).toString(16).padStart(4, '0')}-${(msg.code & 0xffff).toString(16).padStart(4, '0')}`
  if (!readable) code = code.replace(/-/g, '')
  return code
}
const url = (msg: DeviceHMS) => `https://e.bambulab.com/?e=${ecode(msg, false)}`
const text = (msg: DeviceHMS) => {
  const hmsList = hmsData['data']['device_hms'][locale.value.startsWith('zh') ? 'zh-cn' : 'en']
  const code = ecode(msg, false)
  const hmsInfo = hmsList.find((item: any) => item.ecode === code)
  return hmsInfo?.intro || ''
}
</script>

<style scoped>
.msg-page {
  display: grid;
  grid-template-columns: minmax(0, 2.7fr) minmax(0, 2.3fr);
  height: 100%;
  overflow: hidden;
  padding: 10px;
  gap: 10px;
}

.detail-panel {
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow-y: auto;
  overflow-x: hidden;
}

.qr-canvas {
  margin: 8px;
  align-self: center;
}

.detail-url {
  display: block;
  font-size: 12px;
  color: var(--van-text-color-2);
  word-break: break-all;
  text-align: center;
  border-radius: 6px;
  width: 100%;
  text-decoration: none;
}

.detail-text {
  font-size: 15px;
  line-height: 1.5;
  color: var(--van-text-color);
  padding: 12px;
  background: var(--van-background-2);
  border-radius: 6px;
  width: 100%;
}

.list-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-header {
  padding: 8px 16px;
  font-size: 16px;
  font-weight: 500;
}

.list-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.msg-item {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 80px;
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 8px;
  border: 1px solid;
  border-left: 5px solid;
}

.msg-item:active {
  filter: brightness(0.95);
}

.msg-level-1 { border-color: red; }
.msg-level-2 { border-color: orange; }
.msg-level-3 { border-color: cyan; }

.msg-selected {
  background: var(--van-background-3);
}

.msg-item-text {
  font-size: 13px;
  color: var(--van-text-color);
}

.msg-item-code {
  font-size: 11px;
  font-family: monospace;
  color: var(--van-text-color-2);
}

:deep(.van-empty__image) {
  opacity: 0.5;
}

@media (orientation: portrait) {
  .msg-page {
    grid-template-columns: 1fr;
    grid-template-rows: 280px auto;
  }
}

</style>
