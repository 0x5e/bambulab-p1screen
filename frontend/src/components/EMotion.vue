<template>
  <div class="extruder-card">
    <button class="extruder-btn" type="button" @click="emitMove('e', -1)">
      <span class="material-symbols-rounded">arrow_drop_up</span>
    </button>
    <div class="extruder-imgs">
      <img src="../assets/images/pipe_of_empty.svg" />
      <img src="../assets/images/single_nozzle_xp.svg" />
    </div>
    <button class="extruder-btn" type="button" @click="emitMove('e', 1)">
      <span class="material-symbols-rounded">arrow_drop_down</span>
    </button>
    <div class="extruder-label">挤出机</div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (event: 'move', axis: 'e', step: -1 | 1): void
}>()

const emitMove = (axis: 'e', step: -1 | 1) => {
  emit('move', axis, step)
}
</script>

<style scoped>
.extruder-card {
  background: var(--van-background-2);
  border-radius: 12px;
  padding: 8px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  align-items: center;
  justify-items: center;
  text-align: center;
}

.extruder-imgs {
  display: flex;
  align-items: center;
  flex-direction: column;
}

.extruder-imgs img:first-child {
  width: 8px;
  margin-bottom: -2px;
}

.extruder-label {
  font-size: 13px;
  font-weight: 600;
  padding: 24px 0 8px 0;
}

.extruder-btn {
  background: var(--van-background-4);
  border-radius: 12px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  user-select: none;
  -webkit-user-select: none;
  border: 0;
  cursor: pointer;
}

.extruder-btn:active {
  background: rgba(255, 255, 255, 0.08);
}

</style>
