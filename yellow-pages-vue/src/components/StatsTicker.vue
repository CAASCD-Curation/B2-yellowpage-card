<script setup>
import { computed } from 'vue'

const props = defineProps({
  all: { type: Array, required: true },
})

const items = computed(() => {
  const imgCount = props.all.reduce((n, e) => n + e.images.length, 0)
  const withImg = props.all.filter((e) => e.images.length).length
  return [
    ['200', '档案条目 RECORDS'],
    [String(imgCount), '图像资产 IMAGES'],
    ['4', '采集角度 ANGLES'],
    ['1878', '最早条目 EARLIEST'],
    ['2026', '最新条目 LATEST'],
    [String(withImg), '含图条目 WITH IMAGE'],
  ]
})

const trackHtml = computed(() => {
  const half = items.value
    .map(
      ([n, l]) =>
        `<span class="stat-item"><span class="n">${n}</span><span class="l">${l}</span></span>`
    )
    .join('')
  return half + half
})
</script>

<template>
  <div class="stats" aria-hidden="true">
    <div class="stats-track" v-html="trackHtml"></div>
  </div>
</template>
