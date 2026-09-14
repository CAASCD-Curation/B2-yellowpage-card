<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { imgUrl, SENSE_EN } from '@/lib/archive'
import type { Entry, ExtEntry } from '@/lib/archive'

export type CardItem = { kind: 'entry'; e: Entry } | { kind: 'ext'; x: ExtEntry }

const props = defineProps<{
  sense: string
  index: number
  items: CardItem[]
  dir: 1 | -1
}>()
const emit = defineEmits<{ open: [e: Entry] }>()

const trackRef = ref<HTMLDivElement | null>(null)
/* 非响应式滚动状态（rAF 高频更新，避免触发渲染） */
const st = { pos: Math.random() * 800, vel: 0, hover: false, half: 1 }

/* 无缝循环：短列表先重复到 ≥6 张，再整体复制一份用于取模回绕 */
const loop = computed<CardItem[]>(() => {
  if (props.items.length === 0) return []
  let reps = 1
  while (props.items.length * reps < 6 && reps < 8) reps++
  const base = Array.from({ length: reps }, () => props.items).flat()
  return [...base, ...base]
})

let raf = 0
let ro: ResizeObserver | null = null
let removeWheel: (() => void) | null = null

onMounted(() => {
  const track = trackRef.value
  if (!track) return
  const measure = () => {
    st.half = track.scrollHeight / 2 || 1
  }
  measure()
  ro = new ResizeObserver(measure)
  ro.observe(track)

  /* 老虎机式滚动主循环：匀速巡航 + 滚轮冲量 + 惯性衰减 */
  const BASE = 0.028 // px/ms ≈ 28px/s
  let last = performance.now()
  const step = (now: number) => {
    const dt = Math.min(50, now - last)
    last = now
    const cruise = st.hover ? 0 : BASE
    st.pos += (cruise + st.vel) * dt * props.dir
    st.vel *= 0.94
    const H = st.half
    let y = st.pos % H
    if (y < 0) y += H
    track.style.transform = `translate3d(0, ${-y}px, 0)`
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)

  /* 滚轮冲量（不拦截页面滚动，只给列一个推动） */
  const viewport = track.parentElement
  if (viewport) {
    const onWheel = (ev: WheelEvent) => {
      st.vel += (ev.deltaY > 0 ? 1 : -1) * 0.22
      st.vel = Math.max(-1.4, Math.min(1.4, st.vel))
    }
    viewport.addEventListener('wheel', onWheel, { passive: true })
    removeWheel = () => viewport.removeEventListener('wheel', onWheel)
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
  removeWheel?.()
})

const senseEn = computed(() => SENSE_EN[props.sense] ?? '')
</script>

<template>
  <section
    class="border-[var(--yp-ink)] max-xl:border-b-[1.5px] sm:max-xl:odd:border-r-[1.5px] lg:max-xl:[&:nth-child(3n+1)]:border-r-0 lg:max-xl:[&:nth-child(3n+2)]:border-r-0 xl:border-r-[1.5px] xl:last:border-r-0"
  >
    <!-- 列头：编号 + 五感英文名 -->
    <header class="flex items-baseline justify-between gap-2 border-b-[1.5px] border-[var(--yp-ink)] px-3 py-2.5">
      <div class="flex items-baseline gap-2">
        <span class="font-en text-xs font-bold text-neutral-500">{{ String(index + 1).padStart(2, '0') }}</span>
        <h3 class="font-en text-xl font-bold tracking-wide">{{ senseEn }}</h3>
        <span class="text-xs font-bold text-neutral-600">{{ sense }}</span>
      </div>
      <span class="yp-label text-[9px] text-neutral-500">{{ items.length }} ITEMS</span>
    </header>

    <!-- 滚动视口 -->
    <div
      class="drum-mask relative h-[68vh] overflow-hidden"
      @mouseenter="st.hover = true"
      @mouseleave="st.hover = false"
    >
      <div v-if="loop.length === 0" class="flex h-full items-center justify-center">
        <p class="yp-label text-[10px] tracking-[0.25em] text-neutral-400">NO MATCH</p>
      </div>
      <div v-else ref="trackRef" class="will-change-transform">
        <template v-for="(it, i) in loop" :key="(it.kind === 'entry' ? it.e.id : it.x.id) + '-' + i">
          <!-- 档案条目卡：黄底细黑框，参照 40plus 黄页目录单元格 -->
          <div v-if="it.kind === 'entry'" class="p-2">
            <button
              class="group block w-full border-[1.5px] border-[var(--yp-ink)] bg-[var(--yp-yellow)] p-3 text-left transition-colors hover:bg-white"
              @click="emit('open', it.e)"
            >
              <div class="flex items-baseline justify-between gap-2">
                <span class="font-en text-[10px] font-bold tracking-widest">{{ it.e.id }}</span>
                <span class="font-en text-[10px] text-neutral-700">{{ it.e.year || '—' }}</span>
              </div>
              <h4 class="mt-1 text-sm font-bold leading-snug group-hover:underline">{{ it.e.name }}</h4>
              <div v-if="it.e.images.length > 0" class="mt-2 overflow-hidden border border-[var(--yp-ink)] bg-white">
                <img
                  :src="imgUrl(it.e.images[0])"
                  :alt="it.e.name"
                  loading="lazy"
                  draggable="false"
                  class="aspect-[4/3] w-full object-cover"
                />
              </div>
              <p
                class="mt-2 border-t border-[var(--yp-ink)]/40 pt-1.5 text-[11px] leading-relaxed text-neutral-800"
                :class="it.e.images.length > 0 ? 'line-clamp-3' : 'line-clamp-5'"
              >
                {{ it.e.summary }}
              </p>
              <p class="yp-label mt-1.5 text-[9px] text-neutral-600">{{ it.e.category }} · {{ it.e.type }}</p>
            </button>
          </div>

          <!-- 拓展采集卡：白底虚线框 -->
          <div v-else class="p-2">
            <component
              :is="it.x.link ? 'a' : 'div'"
              :href="it.x.link || undefined"
              :target="it.x.link ? '_blank' : undefined"
              rel="noreferrer"
              class="group block w-full border-[1.5px] border-dashed border-[var(--yp-ink)]/70 bg-white p-3 text-left transition-colors hover:bg-[var(--yp-yellow)]"
            >
              <div class="flex items-baseline justify-between gap-2">
                <span class="yp-label text-[9px] font-bold text-neutral-500">EXT · {{ it.x.id }}</span>
                <span v-if="it.x.link" class="font-en text-[10px] font-bold">LINK ↗</span>
              </div>
              <h4 class="mt-1 text-[13px] font-bold leading-snug group-hover:underline">{{ it.x.name }}</h4>
              <p class="mt-1.5 text-[11px] leading-relaxed text-neutral-700 line-clamp-4">{{ it.x.desc }}</p>
            </component>
          </div>
        </template>
      </div>
    </div>

    <!-- 列脚：滚动方向提示 -->
    <footer class="flex items-center justify-between border-t-[1.5px] border-[var(--yp-ink)] px-3 py-1.5">
      <span class="yp-label text-[9px] text-neutral-500">SCROLL · HOVER TO PAUSE</span>
      <span class="font-en text-[10px] font-bold">{{ dir === 1 ? '▲' : '▼' }}</span>
    </footer>
  </section>
</template>
