<script setup lang="ts">
/** 行走手指（Walking Fingers）黄页经典标识，两版官方资源：
 * 默认 P2 版（带左右书侧条的黑框方形图标）—— 全站通用；
 * clean P3 版（干净黑框圆角方形，无侧条）—— 开场地球下方与 CITY MAP 地图 pin 专用。
 */
withDefaults(
  defineProps<{
    size?: number
    className?: string
    /** P3 干净方形（无左右书侧条）：地球下方 / 地图 pin 使用 */
    clean?: boolean
  }>(),
  { size: 24, className: '', clean: false },
)
</script>

<template>
  <img
    :src="clean ? '/images/walking-fingers-clean.png' : '/images/walking-fingers.png'"
    :width="size"
    :height="size"
    :class="className"
    :style="{ width: size + 'px', height: size + 'px' }"
    draggable="false"
    role="img"
    aria-label="walking fingers"
  />
</template>
