<script lang="ts">
export interface Link {
  a: string // card id
  b: string
  note: string
}
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { CATEGORIES, imgUrl } from '@/five-senses/lib/cards'
import type { Card } from '@/five-senses/lib/cards'
import TypeTitle from '@/five-senses/components/TypeTitle.vue'

const CAT_DOT: Record<string, string> = {
  clothing: '#c46a1b',
  food: '#7a9a3a',
  housing: '#4a6fa5',
  transport: '#a54747',
}
const CAT_ZH: Record<string, string> = { clothing: '衣', food: '食', housing: '住', transport: '行' }

/**
 * 右侧抽取工作台（修订版）：
 * 顶部 DRAW 按钮启动四列老虎机同抽；抽中卡在此罗列展示介绍，
 * 每张可展开展签（拓展：完整说明 + 出处链接）；
 * 两两点选建立关联线，底部 VIEW ON MAP 跳转地图。
 */
const props = defineProps<{
  drawn: Card[]
  links: Link[]
  spinning: boolean
}>()
const emit = defineEmits<{
  linksChange: [links: Link[]]
  viewMap: []
  draw: []
}>()

const pick = ref<string | null>(null)
const openId = ref<string | null>(null)

const clickTag = (id: string) => {
  if (!pick.value) {
    pick.value = id
    return
  }
  if (pick.value === id) {
    pick.value = null
    return
  }
  const exists = props.links.some(
    (l) => (l.a === pick.value && l.b === id) || (l.a === id && l.b === pick.value),
  )
  if (!exists) {
    const ca = props.drawn.find((c) => c.id === pick.value)
    const cb = props.drawn.find((c) => c.id === id)
    const note = `${CAT_ZH[ca?.category ?? '']}×${CAT_ZH[cb?.category ?? '']}：「${ca?.title}」与「${cb?.title}」在地图上建立了联系。`
    emit('linksChange', [...props.links, { a: pick.value!, b: id, note }])
  }
  pick.value = null
}
</script>

<template>
  <aside class="flex max-h-[78vh] flex-col border-[1.5px] border-[var(--yp-ink)] bg-[var(--yp-paper)] p-3 xl:sticky xl:top-3">
    <!-- DRAW 抽取按钮（P2 黄底黑字，无黑边） -->
    <button
      :disabled="spinning"
      class="font-type px-3 py-3.5 text-xl tracking-[0.25em] transition-all"
      :class="
        spinning
          ? 'cursor-wait bg-white text-neutral-400'
          : 'bg-[var(--yp-yellow)] shadow-[0_2px_10px_rgba(20,20,20,0.12)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none'
      "
      @click="emit('draw')"
    >
      {{ spinning ? '··· ROLLING' : 'DRAW' }}
    </button>
    <p class="font-type mt-1 text-center text-[9px] tracking-[0.2em] text-neutral-500">
      {{ spinning ? '四列老虎机依次停定中' : '从四列瀑布流中各抽一张' }}
    </p>

    <h3 class="font-type mt-4 text-lg tracking-wide">
      <TypeTitle text="YOUR DRAW" :speed="55" :keep-caret="false" />
    </h3>
    <p class="font-type mt-0.5 text-[9px] tracking-[0.2em] text-neutral-500">
      本次抽取 · 介绍与拓展 · 点选两卡建立关联
    </p>

    <!-- 抽中卡：罗列展示介绍 + 可拓展展签 -->
    <div class="yp-scroll mt-3 flex-1 space-y-2 overflow-y-auto pr-0.5">
      <p v-if="drawn.length === 0" class="font-type py-8 text-center text-[10px] leading-relaxed tracking-wider text-neutral-400">
        点击 DRAW 同时抽取
        <br />
        衣食住行四张卡片
      </p>
      <div
        v-for="c in drawn"
        :key="c.id"
        class="rounded-sm transition-colors"
        :class="pick === c.id ? 'bg-[var(--yp-yellow)] shadow-[0_2px_10px_rgba(20,20,20,0.08)]' : 'bg-white'"
      >
        <div class="flex items-center gap-2 px-2.5 py-2">
          <span
            class="h-2.5 w-2.5 shrink-0 rounded-full"
            :style="{ background: CAT_DOT[c.category] }"
            :title="c.category"
          />
          <button class="min-w-0 flex-1 text-left" title="点选两卡建立关联" @click="clickTag(c.id)">
            <span class="block truncate text-[12px] font-bold leading-tight hover:underline">
              {{ c.title }}
            </span>
            <span class="font-type text-[9px] tracking-wider text-neutral-500">
              {{ CAT_ZH[c.category] }} · {{ c.id }} · {{ c.year || '—' }}
            </span>
          </button>
          <button
            class="font-type shrink-0 bg-[var(--yp-paper)] px-1.5 py-0.5 text-[9px] tracking-wider hover:bg-[var(--yp-yellow)]"
            @click="openId = openId === c.id ? null : c.id"
          >
            {{ openId === c.id ? '收起 ▲' : '拓展 ▼' }}
          </button>
        </div>
        <!-- 介绍 -->
        <p class="line-clamp-2 px-2.5 pb-2 text-[10.5px] leading-relaxed text-neutral-600">{{ c.summary }}</p>
        <!-- 拓展展签 -->
        <div v-if="openId === c.id" class="border-t border-dashed border-[var(--yp-ink)]/25 px-2.5 py-2">
          <img
            v-if="c.media.back"
            :src="imgUrl(c.media.back)"
            alt=""
            class="mb-2 max-h-28 w-full rounded-sm object-cover"
            loading="lazy"
          />
          <p class="text-[10.5px] leading-relaxed text-neutral-700">{{ c.detail || c.summary }}</p>
          <p class="font-type mt-1.5 text-[9px] tracking-wider text-neutral-500">
            {{ c.sourceRef.publisher }}
            <span v-if="c.verify === 'partial'" class="text-[var(--yp-stamp)]"> · 部分核实</span>
            <a
              v-if="c.sourceRef.url"
              :href="c.sourceRef.url"
              target="_blank"
              rel="noreferrer"
              class="ml-2 font-bold text-[var(--yp-stamp)] underline"
            >
              SOURCE ↗
            </a>
          </p>
        </div>
        <p v-if="pick === c.id" class="font-type px-2.5 pb-1.5 text-[9px] text-neutral-500">再点一张卡建立关联 ×?</p>
      </div>

      <!-- 关联线列表 -->
      <div v-if="links.length > 0" class="mt-3 border-t border-dashed border-[var(--yp-ink)]/30 pt-2">
        <p class="font-type text-[9px] tracking-[0.2em] text-neutral-500">关联 LINKS ×{{ links.length }}</p>
        <ul class="mt-1.5 space-y-1.5">
          <li v-for="(l, i) in links" :key="l.a + l.b" class="flex items-start gap-1.5 text-[10px] leading-snug">
            <span class="font-type shrink-0 text-[var(--yp-stamp)]">⌁{{ i + 1 }}</span>
            <span class="min-w-0 flex-1 text-neutral-700">{{ l.note }}</span>
            <button
              class="font-type shrink-0 text-neutral-400 hover:text-[var(--yp-ink)]"
              aria-label="解散关联"
              @click="emit('linksChange', links.filter((x) => x !== l))"
            >
              ✕
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- 跳转地图（无黑边） -->
    <button
      :disabled="drawn.length === 0"
      class="font-type mt-3 px-3 py-2.5 text-sm tracking-[0.15em] transition-all"
      :class="
        drawn.length === 0
          ? 'cursor-not-allowed bg-white text-neutral-300'
          : 'bg-[var(--yp-yellow)] shadow-[0_2px_10px_rgba(20,20,20,0.12)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none'
      "
      @click="emit('viewMap')"
    >
      VIEW ON MAP ↓
    </button>
    <p class="font-type mt-1 text-center text-[8px] tracking-[0.2em] text-neutral-400">
      {{ CATEGORIES.map((c) => c.zh).join(' · ') }} 四卡关联后跳转地图描线
    </p>
  </aside>
</template>
