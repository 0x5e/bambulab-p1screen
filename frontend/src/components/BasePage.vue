<template>
  <div class="page" :class="{ 'first-level-page': isFirstLevelPage }">
    <div class="navbar">
      <van-nav-bar
        :title="title"
        :left-arrow="!isFirstLevelPage"
        safe-area-inset-top
        @click-left="router.back"
      >
        <template #right>
          <slot name="right"></slot>
        </template>
      </van-nav-bar>
    </div>
    <div class="content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router'

defineProps<{
  title: string
}>()

const route = useRoute()
const router = useRouter()
const isFirstLevelPage = computed(() => route.path.split('/').length === 2)
</script>

<style scoped>
.page {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.content {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
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

  .first-level-page {
    grid-template-rows: 1fr;
  }

  .first-level-page .navbar {
    display: none;
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
