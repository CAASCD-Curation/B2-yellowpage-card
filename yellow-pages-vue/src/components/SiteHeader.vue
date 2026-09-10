<script setup>
defineProps({
  state: { type: Object, required: true },
})
const emit = defineEmits(['set-col'])

const tabs = [
  { col: '经典艺术档案', label: 'ART' },
  { col: '文学意象', label: 'LIT' },
  { col: '社会素材', label: 'SOC' },
  { col: '形式灵感', label: 'FRM' },
]
</script>

<template>
  <header>
    <div class="header-inner">
      <div class="logotype">
        <h1>黄页经典艺术档案</h1>
        <span class="en">YELLOW&nbsp;PAGES&nbsp;ARCHIVE</span>
      </div>
      <p class="header-sub">
        从 1878 年纽黑文第一张 50 户纸板电话名单，到行走手指、Bell Gothic
        字体与 J.R. Hartley 的眼泪——<b>200 条档案</b>，四个采集角度，把一本「过时的书」当作艺术史现场重新翻开。点击任意卡片展开完整档案。
      </p>
    </div>
    <nav class="thumb-index" aria-label="档案分类快翻">
      <span
        v-for="t in tabs"
        :key="t.col"
        :class="{ on: state.col === t.col }"
        @click="emit('set-col', t.col)"
      >{{ t.label }}</span>
    </nav>
  </header>
</template>
