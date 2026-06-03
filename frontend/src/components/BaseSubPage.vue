<template>
  <div class="base-sub-page">
    <div class="navbar">
      <van-nav-bar
        :title="title"
        left-arrow
        safe-area-inset-top
        @click-left="router.back"
      >
        <template #right>
          <slot name="right"></slot>
        </template>
      </van-nav-bar>
    </div>
    <div class="base-sub-page-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{
  title: string
}>()

const router = useRouter()
</script>

<style scoped>
.base-sub-page {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
  overflow-x: hidden;
}

.base-sub-page-content {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
}

.navbar {
  --van-nav-bar-icon-color: var(--van-text-color-2);
}

@media (orientation: landscape) {
  .navbar {
    --van-nav-bar-height: 50px;
    --van-nav-bar-background: transparent;
    --van-nav-bar-arrow-size: 20px;
    --van-nav-bar-title-font-size: 18px;
    margin-bottom: -10px;
  }

  :deep(.van-nav-bar__title) {
    font-weight: initial;
    margin: 0 55px;
  }

  :deep(.van-hairline--bottom:after) {
    display: none;
  }
}
</style>
