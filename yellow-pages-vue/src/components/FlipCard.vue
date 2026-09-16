<script setup lang="ts">
import { ref } from 'vue'
import type { Card } from '@/lib/cards'
import CardOverlay from '@/components/CardOverlay.vue'
import { playFlip } from '@/lib/sound'

/**
 * 档案卡片：瀑布流中纯文字（编号 / 年代 / 标题 / 摘要），
 * 图片、完整介绍与标签只在点击放大后的覆盖层中出现。
 */
const props = defineProps<{
  card: Card
  /** 被鼠标或老虎机指针选中 → 变黄 */
  selected: boolean
}>()
const emit = defineEmits<{ flipChange: [flipped: boolean] }>()

const flipped = ref(false)

const toggle = () => {
  playFlip(0.35) /* 翻书音效 */
  flipped.value = !flipped.value
  emit('flipChange', flipped.value)
}
</script>

<template>
  <div class="p-2">
    <div class="yp-flip relative min-h-[150px] cursor-pointer" :class="{ flipped }" @click="toggle">
      <div class="yp-flip-inner relative">
        <!-- 正面 · 纯文字 -->
        <div
          class="yp-flip-face relative rounded-sm p-3 shadow-[0_2px_10px_rgba(20,20,20,0.08)] transition-colors duration-200"
          :class="selected ? 'bg-[var(--yp-yellow)]' : 'bg-white'"
        >
          <div class="flex items-baseline justify-between gap-2">
            <span class="font-type text-[10px] tracking-widest">{{ card.id }}</span>
            <span class="font-type text-[10px] text-neutral-500">{{ card.year || '—' }}</span>
          </div>
          <h4 class="mt-1 text-sm font-bold leading-snug">{{ card.title }}</h4>
          <p class="mt-2 line-clamp-5 text-[11px] leading-relaxed text-neutral-700">{{ card.summary }}</p>
          <p class="font-type mt-2 border-t border-dashed border-[var(--yp-ink)]/25 pt-1.5 text-[9px] tracking-wider text-neutral-500">
            点击放大阅读 · 图片与标签
          </p>
        </div>

        <!-- 背面 · 过渡小展签（大图见覆盖层） -->
        <div
          class="yp-flip-face yp-flip-back absolute inset-0 overflow-hidden rounded-sm shadow-[0_2px_10px_rgba(20,20,20,0.08)]"
          :class="selected ? 'bg-[var(--yp-yellow)]' : 'bg-white'"
        >
          <div class="yp-scroll h-full overflow-y-auto p-3">
            <p class="font-type text-[10px] tracking-widest text-neutral-500">
              {{ card.id }} · {{ card.year || '—' }}
            </p>
            <h4 class="mt-0.5 text-sm font-bold leading-snug">{{ card.title }}</h4>
            <p class="mt-1.5 line-clamp-6 text-[11px] leading-relaxed text-neutral-700">
              {{ card.detail || card.summary }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 翻动后放大展示图片 / 介绍 / 标签；点击遮罩或卡片关闭，回归瀑布流 -->
    <CardOverlay v-if="flipped" :card="card" @close="toggle" />
  </div>
</template>
