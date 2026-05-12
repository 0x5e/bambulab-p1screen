<template>
  <BaseSubPage :title="t('toolbox')">
    <van-empty :description="t('developing')" />
  </BaseSubPage>
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
