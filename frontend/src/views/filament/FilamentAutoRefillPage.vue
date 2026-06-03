<template>
  <BasePage :title="t('auto_refill')">
    <van-empty :description="t('developing')" />
  </BasePage>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<style scoped>
:deep(.van-empty__image) {
  opacity: 0.5;
}
</style>
