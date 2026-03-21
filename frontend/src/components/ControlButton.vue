<template>
  <div class="control-button" @click="onClick">
    <img :src="icon" />
    <span :style="{ fontSize }">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">

const props = withDefaults(
  defineProps<{
    icon: string
    label: string
    fontSize?: string
    disabled?: boolean
    onClick?: () => void
  }>(),
  {
    fontSize: '14px'
  }
)
</script>

<style scoped>
.control-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  border-radius: 10px;
  background: var(--van-background-3);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.control-button:active {
  filter: brightness(0.9);
}

.control-button > img {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-button > span {
  text-align: center;
  font-weight: 500;
}

</style>
