<template>
  <div class="msg-page">
    <van-empty :description="t('developing')" />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
/*
"hms":[{"attr":117448704,"code":131073,"action":0,"timestamp":1777383334}]}
AMS耗材用尽。请把耗材放入同一个AMS槽位后继续。
[0700-8011 213628]
*/
</script>

<style scoped>
.msg-page {
  display: grid;
  height: 100%;
}

:deep(.van-empty__image) {
  opacity: 0.5;
}
</style>
