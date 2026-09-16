<script lang="ts">
export interface DrawCmd {
  session: number // 每次抽取递增，变化即触发本列滚动
  card: Card // 本列抽中的目标卡（预计算）
  stopDelay: number // 本列停定延迟 ms（依次停定）
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FlipCard from '@/five-senses/components/FlipCard.vue'
import type { Card } from '@/five-senses/lib/cards'

/**
 * 衣食住行列 · 瀑布流即老虎机（DESIGN §5.1–5.4，按修订）：
 * - 平时：白色慢速轮播，悬停/中央指针选中的卡变黄，可拖拽/滚轮滑动，点击翻转阅读；
 * - 抽取时：本列即滚筒 —— 高速滚动 + 垂直动态模糊（模糊随速度），
 *   按 stopDelay 依次减速停定，目标卡回弹居中到 ▶◀ 指针线并变黄；
 * - 停定后列保持定格（ jackpot ），用户手动滑动后恢复浏览。
 */
const props = defineProps<{
  no: string
  zh: string
  en: string
  items: Card[]
  dir: 1 | -1
  /** 抽取指令（瀑布流即老虎机：无独立滚筒） */
  drawCmd?: DrawCmd | null
}>()
const emit = defineEmits<{ stopped: [card: Card] }>()

const BASE = 0.026 // 巡航速度 px/ms
const SPIN_V = 3.4 // 抽取高速 px/ms

const viewRef = ref<HTMLDivElement | null>(null)
const trackRef = ref<HTMLDivElement | null>(null)

/* rAF 主循环用普通变量（无需响应式） */
let pos = Math.random() * 600
let vel = 0
let half = 1
let centers: number[] = []
let isDrag = false
let moved = 0
let lastY = 0
let lastT = 0
let idle = 0
let pause = false
let mode: 'normal' | 'spin' | 'easing' | 'done' = 'normal'
let ease: { from: number; to: number; t0: number; dur: number } | null = null
let landedIdx = -1 // 停定实例下标：done 模式持续校正
let doneSince = 0 // 停定时刻：展示片刻后自动回归瀑布流
let blur = 0
let press = false // 按下未超拖拽阈值（区分点击翻卡与拖拽滚动）
let hover = false

const centerIdx = ref(-1)
const hoverIdx = ref(-1)
const spinning = ref(false)

/* 稳定回调：滚动时仅 2 张卡重渲染（卡顿修复） */
const handleFlipChange = (f: boolean) => {
  pause = f || hover
}

/* 无缝循环 */
const loop = computed(() => {
  if (props.items.length === 0) return [] as Card[]
  let reps = 1
  while (props.items.length * reps < 6 && reps < 8) reps++
  const base = Array.from({ length: reps }, () => props.items).flat()
  return [...base, ...base]
})

/* 测量（停定前也会重测，避免图片晚载导致中心偏移） */
const measureNow = () => {
  const track = trackRef.value
  if (!track) return
  half = track.scrollHeight / 2 || 1
  centers = Array.from(track.children).map(
    (el) => (el as HTMLElement).offsetTop + (el as HTMLElement).offsetHeight / 2,
  )
}

let ro: ResizeObserver | null = null
watch(
  () => loop.value.length,
  () => {
    const track = trackRef.value
    if (!track || loop.value.length === 0) return
    measureNow()
    ro?.disconnect()
    ro = new ResizeObserver(measureNow)
    ro.observe(track)
  },
  { flush: 'post' },
)

/* 接收抽取指令：高速滚动 → 到时停定（缓动 + 回弹） */
let drawTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => props.drawCmd,
  (cmd) => {
    if (!cmd) return
    mode = 'spin'
    vel = 0
    ease = null
    landedIdx = -1
    centerIdx.value = -1 /* 滚动中不标黄任何卡（未选中标黄 bug 修复） */
    spinning.value = true
    clearTimeout(drawTimer)
    drawTimer = setTimeout(() => {
      /* 停定前重测：图片晚载会改变卡高 */
      measureNow()
      /* 选目标实例：沿滚动方向前方至少 1.2 屏 */
      const H = half
      const vc = viewRef.value ? viewRef.value.clientHeight / 2 : 200
      const cur = pos
      let target: number | null = null
      let targetIdx = -1
      centers.forEach((c, i) => {
        if (loop.value[i]?.id !== cmd.card.id) return
        const t0 = c - vc
        const t = t0 + Math.ceil((cur + vc * 2.4 - t0) / H) * H
        if (target === null || t < target) {
          target = t
          targetIdx = i
        }
      })
      if (target === null) {
        mode = 'done'
        spinning.value = false
        return
      }
      landedIdx = targetIdx
      mode = 'easing'
      ease = { from: cur, to: target, t0: performance.now(), dur: 620 }
    }, cmd.stopDelay)
  },
)

/* 主循环 */
let raf = 0
const startLoop = () => {
  const track = trackRef.value
  if (!track || loop.value.length === 0) return
  let last = performance.now()

  const setBlur = (v: number) => {
    const b = Math.round(v * 10) / 10
    if (Math.abs(b - blur) > 0.15) {
      blur = b
      track.style.filter = b > 0.2 ? `blur(${Math.min(6, b)}px)` : ''
    }
  }

  const step = (now: number) => {
    const dt = Math.min(50, now - last)
    last = now
    const H = half
    const vc = viewRef.value ? viewRef.value.clientHeight / 2 : 200
    const m = mode

    if (m === 'spin') {
      /* P4：高速滚动 + 模糊随速度 */
      pos += SPIN_V * dt
      setBlur(SPIN_V * 1.5)
    } else if (m === 'easing' && ease) {
      /* 依次减速停定：三次缓动逼近目标 */
      const e = ease
      const p = Math.min(1, (now - e.t0) / e.dur)
      const easeOut = 1 - Math.pow(1 - p, 3)
      const prev = pos
      pos = e.from + (e.to - e.from) * easeOut
      setBlur((Math.abs(pos - prev) / Math.max(1, dt)) * 1.5)
      if (p >= 1) {
        mode = 'done'
        ease = null
        doneSince = now
        setBlur(0)
        spinning.value = false
        centerIdx.value = landedIdx /* 仅停定的目标卡标黄 */
        const cmd = props.drawCmd
        if (cmd) emit('stopped', cmd.card)
      }
    } else if (m === 'done') {
      setBlur(0)
      /* 微量校正（>1px 才动、极缓），消除任何可见抽动 */
      const li = landedIdx
      if (li >= 0 && centers[li] != null) {
        const cur = pos
        const t0 = centers[li] - vc
        const t = t0 + Math.round((cur - t0) / H) * H
        if (Math.abs(t - cur) > 1) pos += (t - cur) * Math.min(1, dt * 0.008)
      }
      /* 结果已入工作台：定格展示片刻后自动回归瀑布流 */
      if (now - doneSince > 3000 && !pause) {
        mode = 'normal'
        landedIdx = -1
        idle = now
      }
    } else if (!isDrag) {
      if (Math.abs(vel) > 0.03) {
        pos += vel * dt
        vel *= Math.pow(0.94, dt / 16.7)
      } else if (!pause && now - idle > 2600) {
        pos += BASE * dt * props.dir
      } else if (centers.length > 0) {
        const cur = pos
        let best = Infinity
        let target = cur
        for (const c of centers) {
          const t0 = c - vc
          const t = t0 + Math.round((cur - t0) / H) * H
          if (Math.abs(t - cur) < best) {
            best = Math.abs(t - cur)
            target = t
          }
        }
        pos += (target - cur) * Math.min(1, dt * 0.012)
      }
    }

    let y = pos % H
    if (y < 0) y += H
    track.style.transform = `translate3d(0, ${-y}px, 0)`

    /* 指针读数：仅 normal/done 更新（spin/easing 中不触发重渲染，卡顿修复） */
    if (m === 'normal' || m === 'done') {
      if (centers.length > 0) {
        const probe = y + vc
        let bi = 0
        let bd = Infinity
        for (let i = 0; i < centers.length; i++) {
          const d = Math.abs(centers[i] - probe)
          if (d < bd) {
            bd = d
            bi = i
          }
        }
        if (centerIdx.value !== bi) centerIdx.value = bi
      }
    }
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

/* 滚轮 */
const onWheel = (ev: WheelEvent) => {
  if (mode === 'spin' || mode === 'easing') return
  ev.preventDefault()
  if (mode === 'done') {
    mode = 'normal'
    landedIdx = -1
  }
  idle = performance.now()
  vel += (ev.deltaY > 0 ? 1 : -1) * 0.3
  vel = Math.max(-1.6, Math.min(1.6, vel))
}

/* 拖拽：不用 setPointerCapture，否则 click 会被重定向到容器（翻卡修复）。
   移动超过 6px 才算拖拽；未超阈值保持 press，松手即卡片点击翻卡。 */
const down = (ev: PointerEvent) => {
  if (mode === 'spin' || mode === 'easing') return
  press = true
  isDrag = false
  moved = 0
  lastY = ev.clientY
  lastT = performance.now()
}
const move = (ev: PointerEvent) => {
  if (!press) return
  const dy = ev.clientY - lastY
  const now = performance.now()
  moved += Math.abs(dy)
  if (!isDrag && moved > 6) {
    isDrag = true
    if (mode === 'done') {
      mode = 'normal'
      landedIdx = -1
    }
    vel = 0
  }
  if (isDrag) {
    pos -= dy
    vel = -dy / Math.max(1, now - lastT)
  }
  lastY = ev.clientY
  lastT = now
}
const up = () => {
  if (!press) return
  press = false
  if (!isDrag) return
  isDrag = false
  idle = performance.now()
  vel = Math.max(-2, Math.min(2, vel * 1.6))
}
const clickCapture = (ev: MouseEvent) => {
  if (moved > 6) {
    ev.stopPropagation()
    ev.preventDefault()
    moved = 0
  }
}

onMounted(() => {
  const el = viewRef.value!
  measureNow()
  ro = new ResizeObserver(measureNow)
  if (trackRef.value) ro.observe(trackRef.value)
  startLoop()
  el.addEventListener('wheel', onWheel, { passive: false })
  el.addEventListener('pointerdown', down)
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
  el.addEventListener('click', clickCapture, true)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearTimeout(drawTimer)
  ro?.disconnect()
  const el = viewRef.value
  el?.removeEventListener('wheel', onWheel)
  el?.removeEventListener('pointerdown', down)
  window.removeEventListener('pointermove', move)
  window.removeEventListener('pointerup', up)
  window.removeEventListener('pointercancel', up)
  el?.removeEventListener('click', clickCapture, true)
})

const pointerCard = computed(() => (centerIdx.value >= 0 ? loop.value[centerIdx.value] : null))
</script>

<template>
  <section class="flex flex-col border-[1.5px] border-[var(--yp-ink)] bg-[var(--yp-paper)]">
    <!-- 列头（黑框表头，与卡片列绑定） -->
    <header class="flex items-baseline justify-between gap-2 border-b-[1.5px] border-[var(--yp-ink)] px-3 py-2.5">
      <div class="flex items-baseline gap-2">
        <span class="font-type text-xs text-neutral-500">{{ no }}</span>
        <h3 class="font-type text-lg tracking-wide">{{ en }}</h3>
        <span class="font-type text-sm">{{ zh }}</span>
      </div>
      <span class="font-type text-[9px] tracking-wider text-neutral-500">{{ items.length }} ITEMS</span>
    </header>

    <!-- 滚轮视口（老虎机滚筒） -->
    <div
      ref="viewRef"
      class="drum-mask relative h-[64vh] cursor-grab touch-none overflow-hidden bg-[var(--yp-paper)]/60"
    >
      <!-- 中央指针线（原网站样式：停轮读数指示） -->
      <div class="pointer-events-none absolute left-1/2 top-1/2 z-10 w-full -translate-x-1/2 -translate-y-1/2">
        <div class="flex items-center justify-between px-1.5">
          <span class="font-en text-[10px] font-bold text-[var(--yp-ink)]">▶</span>
          <span class="font-en text-[10px] font-bold text-[var(--yp-ink)]">◀</span>
        </div>
      </div>
      <div v-if="loop.length === 0" class="flex h-full items-center justify-center">
        <p class="font-type text-[10px] tracking-[0.25em] text-neutral-400">NO MATCH</p>
      </div>
      <div
        v-else
        ref="trackRef"
        class="will-change-transform"
        :style="spinning ? { pointerEvents: 'none' } : undefined"
      >
        <div
          v-for="(card, i) in loop"
          :key="`${card.id}-${i}`"
          @mouseenter="
            hoverIdx = i;
            hover = true;
            pause = true
          "
          @mouseleave="
            hoverIdx = -1;
            hover = false;
            pause = false
          "
        >
          <FlipCard :card="card" :selected="i === hoverIdx || i === centerIdx" @flip-change="handleFlipChange" />
        </div>
      </div>
    </div>

    <!-- 列脚：老虎机指针读数 -->
    <footer class="mt-auto flex items-center justify-between gap-2 border-t-[1.5px] border-[var(--yp-ink)] px-3 py-1.5">
      <span class="font-type min-w-0 flex-1 truncate text-[9px] tracking-wider text-neutral-600">
        {{ pointerCard ? `▸ ${pointerCard.id} · ${pointerCard.title}` : 'SCROLLING…' }}
      </span>
      <span class="font-type shrink-0 text-[10px]">{{ spinning ? '◉' : dir === 1 ? '▲' : '▼' }}</span>
    </footer>
  </section>
</template>
