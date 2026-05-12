<template>
  <BaseSubPage title="运动：XYZ">
    <div class="motion-card">
      <div>
        <span>工具头</span>
        <div class="motion-xy">
          <div class="axis-dial">
            <div class="axis-ring">
              <div class="axis-segments">
                <button class="axis-seg tl" type="button" @click="handleMove('y', 10)"></button>
                <button class="axis-seg tr" type="button" @click="handleMove('x', 10)"></button>
                <button class="axis-seg br" type="button" @click="handleMove('y', -10)"></button>
                <button class="axis-seg bl" type="button" @click="handleMove('x', -10)"></button>
              </div>
            </div>
            <div class="axis-ring inner">
              <div class="axis-segments">
                <button class="axis-seg tl" type="button" @click="handleMove('y', 1)"></button>
                <button class="axis-seg tr" type="button" @click="handleMove('x', 1)"></button>
                <button class="axis-seg br" type="button" @click="handleMove('y', -1)"></button>
                <button class="axis-seg bl" type="button" @click="handleMove('x', -1)"></button>
              </div>
            </div>
            <div class="axis-label-outer y">Y</div>
            <div class="axis-label-outer x">X</div>
            <div class="axis-label-outer ny">-Y</div>
            <div class="axis-label-outer nx">-X</div>
            <div class="axis-label-inner plus10">+10</div>
            <div class="axis-label-inner plus1">+1</div>
            <div class="axis-label-inner minus1">-1</div>
            <div class="axis-label-inner minus10">-10</div>
          </div>
          <button class="axis-home" @click="handleMove('home', 0)"></button>
        </div>
      </div>
      <div>
        <span>热床</span>
        <div class="motion-z">
          <van-button
            class="heatbed-btn"
            type="default"
            size="large"
            :icon="bedUpImage"
            @click="handleMove('z', -10)"
          >
            10
          </van-button>
          <van-button
            class="heatbed-btn inner"
            type="default"
            size="large"
            :icon="bedUpImage"
            @click="handleMove('z', -1)"
          >
            1
          </van-button>
          <div class="space"></div>
          <van-button
            class="heatbed-btn inner"
            type="default"
            size="large"
            :icon="bedDownImage"
            @click="handleMove('z', 1)"
          >
            1
          </van-button>
          <van-button
            class="heatbed-btn"
            type="default"
            size="large"
            :icon="bedDownImage"
            @click="handleMove('z', 10)"
          >
            10
          </van-button>
        </div>
      </div>
    </div>
  </BaseSubPage>
</template>

<script setup lang="ts">
import { PrinterClient } from '../../api/PrinterClient'
import bedUpImage from '../../assets/images/monitor_bed_up.svg'
import bedDownImage from '../../assets/images/monitor_bed_down.svg'

const client = PrinterClient.getInstance()

const handleMove = (axis: 'home' | 'x' | 'y' | 'z', step: -10 | -1 | 0| 1 | 10) => {
  console.log(`[XYMotion] move axis=${axis}, step=${step}`)
  let gcode = ''
  switch(axis) {
    case 'home':
      client.request('print.gcode_line', { param: 'G28 \n' })
      break
    case 'x':
    case 'y':
    case 'z':
      gcode = `M211 S
M211 X1 Y1 Z1
M1002 push_ref_mode
G91
G1 ${axis.toUpperCase()}${step} F${axis === 'z' ? 900 : 3000}
M1002 pop_ref_mode
M211 R
`
      client.request('print.gcode_line', { param: gcode })
      break
  }
}

</script>

<style scoped>
.motion-card {
  height: calc(100% - 16px);
  margin: 0 8px;
  display: grid;
  grid-template-columns: repeat(2, auto);
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  background: var(--van-background-2);
}
.motion-card > div {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center
}
.motion-card > div > span {
  text-align: center;
  font-size: 12px;
  line-height: 25px;
  color: var(--van-text-color-2);
}
.motion-card > div > div {
  flex: 1;
  width: 100%;
}

.motion-xy {
  display: grid;
  place-items: center;
  position: relative;
  max-width: calc(100vh - 40px - 16px);
  overflow: hidden;
}

.axis-dial {
  width: 82%;
  height: 0;
  padding-top: 82%;
  margin: 8px;
  border-radius: 50%;
  position: relative;
  display: grid;
  place-items: center;
}

.axis-ring {
  position: absolute;
  inset: 0;
}

.axis-ring.inner {
  inset: 20%;
}

.axis-segments {
  position: absolute;
  inset: 0;
  transform: rotate(45deg);
}

.axis-seg {
  border: 0;
  padding: 0;
  position: absolute;
  width: 50%;
  height: 50%;
  background: var(--van-background-4);
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}

.axis-ring.inner .axis-seg {
  background: var(--van-background-3);
}

.axis-seg.tl {
  top: -4px;
  left: -4px;
  border-radius: 100% 0 0 0;
}

.axis-seg.tr {
  top: -4px;
  right: -4px;
  border-radius: 0 100% 0 0;
}

.axis-seg.br {
  bottom: -4px;
  right: -4px;
  border-radius: 0 0 100% 0;
}

.axis-seg.bl {
  bottom: -4px;
  left: -4px;
  border-radius: 0 0 0 100%;
}

.axis-label-outer {
  position: absolute;
  font-size: 14px;
  font-weight: 600;
  pointer-events: none;
}

.axis-label-outer.y {
  top: 6%;
  left: 50%;
  transform: translateX(-50%);
}

.axis-label-outer.x {
  right: 6%;
  top: 50%;
  transform: translateY(-50%);
}

.axis-label-outer.ny {
  bottom: 6%;
  left: 50%;
  transform: translateX(-50%);
}

.axis-label-outer.nx {
  left: 6%;
  top: 50%;
  transform: translateY(-50%);
}

.axis-label-inner {
  position: absolute;
  font-size: 12px;
  font-weight: 600;
  color: var(--van-text-color-2);
  pointer-events: none;
  top: calc(50% + var(--y));
  left: calc(50% + var(--x));
  transform: translate(-50%, -50%) rotate(45deg);
}

.axis-label-inner.plus10 {
  --x: 34%;
  --y: -26%;
}

.axis-label-inner.plus1 {
  --x: 16%;
  --y: -10%;
}

.axis-label-inner.minus1 {
  --x: -16%;
  --y: 10%;
  padding-left: 16%;
}

.axis-label-inner.minus10 {
  --x: -34%;
  --y: 26%;
  padding-left: 23%;
}

.axis-home {
  width: 20%;
  height: 0;
  padding-top: 20%;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);

  border-radius: 40%;
  border-width: 0;
  z-index: 3;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  color: var(--van-primary-color);
  background-color: var(--van-background-4);
  background-image: url(../../assets/images/monitor_axis_home.svg);
  background-repeat: no-repeat;
  background-position: center;
}

.axis-seg:active, .axis-home:active {
  filter: brightness(0.9);
}

.motion-z {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.heatbed-btn {
  max-width: 250px;
  max-height: 75px;
  flex: 1;
  border-radius: 0;
  border: 0;
  font-size: 14px;
  color: var(--van-text-color-2);
  background: var(--van-background-4);
}

.heatbed-btn.inner {
  background: var(--van-background-3);
}

:deep(.heatbed-btn.inner .van-button__text) {
  padding: 0 4px;
}

.space {
  padding: 2px;
}

.heatbed-btn:first-child {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.heatbed-btn:last-child {
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

@media (orientation: portrait) {
  .motion-card {
    grid-template-columns: auto;
    grid-template-rows: 100vw 100vw;
    height: 210vw;
  }
}

</style>
