<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import TypeTitle from '@/five-senses/components/TypeTitle.vue'
import Globe from '@/five-senses/components/Globe.vue'
import { playFlip } from '@/five-senses/lib/sound'

/**
 * 入口页（P1 黄页广告版式，DESIGN §4）：
 * 做旧黄纸底 + 打字机逐行登场 + 线稿地球（XYZ 三轴拖拽/滚轮旋转 + 缓慢自转）。
 * 搜索框已移至主界面标题下；只有点击 ENTER THE ARCHIVE 才进入主页（带平滑离场过渡）。
 */
const router = useRouter()
const stage = ref(0) // 打字序列进度
const ready = ref(false) // AT YOUR FINGERTIPS 可点击态
const leaving = ref(false) // 离场过渡

/* 盖印登场后推进 stage 3（用计时器而非 animationend：
   地球波纹的 animationend 会冒泡误触，曾导致右下文字被反复打回 stage 3 而闪动） */
let stageTimer: ReturnType<typeof setTimeout> | undefined
watch(stage, (s) => {
  if (s !== 2) return
  clearTimeout(stageTimer)
  stageTimer = setTimeout(() => (stage.value = 3), 500)
})

/* 平滑衔接到主界面（翻书音效） */
const go = (to: string) => {
  if (leaving.value) return
  leaving.value = true
  playFlip(0.55)
  setTimeout(() => router.push(to), 380)
}
</script>

<template>
  <div class="yp-aged-paper relative flex min-h-screen flex-col overflow-hidden transition-none" :class="{ 'yp-page-out': leaving }">
    <!-- 页码 + 细线（P1 页角） -->
    <div class="flex items-center gap-3 px-5 pt-4">
      <span class="font-type text-xs">110</span>
      <span class="h-px flex-1 bg-[var(--yp-ink)]/60" />
      <span class="font-type text-[10px] tracking-[0.3em] text-[var(--yp-gray)]">YELLOW PAGES ARCHIVE</span>
    </div>

    <div class="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-8">
      <!-- 打字机标题 · 错落分行 -->
      <h1 class="font-type text-[10vw] leading-[1.04] tracking-tight text-[var(--yp-ink)] sm:text-7xl">
        <span class="block">
          <TypeTitle text="WHAT ARE YOU" :speed="65" @done="stage = 1" />
        </span>
        <span class="block pl-[8vw]">
          <TypeTitle v-if="stage >= 1" text="LOOKING FOR?" :speed="65" @done="stage = 2" />
        </span>
      </h1>

      <!-- 线稿地球（盖印式登场） -->
      <div class="relative mt-4 flex items-center justify-center">
        <div v-if="stage >= 2" class="yp-stamp shrink-0">
          <Globe :size="300" />
        </div>
        <div v-else :style="{ height: '320px' }" />
      </div>

      <!-- 后段标题 -->
      <h2 class="font-type mt-2 text-right text-[7vw] leading-[1.1] tracking-tight text-[var(--yp-ink)] sm:text-5xl">
        <span class="block">
          <TypeTitle v-if="stage >= 3" text="YOUR WORLD" :speed="65" @done="stage = 4" />
        </span>
        <span class="mt-3 block">
          <TypeTitle v-if="stage >= 4" text="AT YOUR FINGERTIPS" :speed="65" @done="ready = true" />
        </span>
      </h2>

      <!-- 进入按钮（P2 黄底黑字，无黑边） -->
      <div class="mt-6 flex justify-end">
        <button
          class="font-type px-6 py-3 text-base tracking-[0.15em] transition-all sm:text-lg"
          :class="
            ready
              ? 'bg-[var(--yp-yellow)] shadow-[0_4px_16px_rgba(20,20,20,0.16)] hover:-translate-y-0.5'
              : 'pointer-events-none bg-transparent opacity-30'
          "
          @click="go('/main')"
        >
          ENTER THE ARCHIVE →
        </button>
      </div>

      <!-- P1 底部说明小段 -->
      <p class="mx-auto mt-8 max-w-md text-center text-[13px] leading-relaxed text-[var(--yp-ink)]/80">
        The Yellow Pages Archive is a complete classified directory of the culture of
        directories — 衣食住行四列档案、老虎机抽取与五城地图，
        features both Shanghai and the world. Let your fingers do the walking.
      </p>
    </div>

    <!-- 拖拽提示 -->
    <p class="font-type pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.25em] text-[var(--yp-gray)]">
      DRAG THE GLOBE X / Y · SCROLL FOR Z · PRESS ENTER THE ARCHIVE
    </p>
  </div>
</template>
