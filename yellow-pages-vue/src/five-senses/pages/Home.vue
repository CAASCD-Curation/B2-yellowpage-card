<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CategoryColumn from '@/five-senses/components/CategoryColumn.vue'
import type { DrawCmd } from '@/five-senses/components/CategoryColumn.vue'
import DrawSidebar from '@/five-senses/components/DrawSidebar.vue'
import type { Link } from '@/five-senses/components/DrawSidebar.vue'
import ClassicMap from '@/five-senses/components/ClassicMap.vue'
import CitySections from '@/five-senses/components/CitySections.vue'
import TypeTitle from '@/five-senses/components/TypeTitle.vue'
import CardOverlay from '@/five-senses/components/CardOverlay.vue'
import { CATEGORIES, byCategory, cards, drawPool } from '@/five-senses/lib/cards'
import type { Card } from '@/five-senses/lib/cards'
import { playFlip } from '@/five-senses/lib/sound'

const router = useRouter()
const route = useRoute()

const drawn = ref<Card[]>([])
const links = ref<Link[]>([])
const spinning = ref(false)
const session = ref(0)
const picks = ref<Card[]>([])
const pulseKey = ref(0)
const citySel = ref<string | null>(null)
const overlayCard = ref<Card | null>(null)
const mapRef = ref<HTMLDivElement | null>(null)
let stopped = 0

/* 主界面搜索（P2 版式）：受控输入 + 实时联想 */
const q = ref('')
const suggest = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (s.length < 1) return []
  return cards
    .filter(
      (c) =>
        c.title.toLowerCase().includes(s) ||
        c.id.toLowerCase().includes(s) ||
        c.summary.toLowerCase().includes(s),
    )
    .slice(0, 6)
})
const setQuery = (query: Record<string, string>) => router.push({ query })
const submitSearch = () => {
  const s = q.value.trim()
  playFlip(0.4)
  setQuery(s ? { q: s } : {})
  q.value = ''
}

/* URL 搜索：?q= 关键词结果条 / ?card= 直接放大阅读 */
const query = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))
const queryHits = computed(() => {
  const s = query.value.trim().toLowerCase()
  if (!s) return []
  return cards
    .filter(
      (c) =>
        c.title.toLowerCase().includes(s) ||
        c.id.toLowerCase().includes(s) ||
        c.summary.toLowerCase().includes(s),
    )
    .slice(0, 8)
})
const directCard = computed(() => {
  const id = route.query.card
  return typeof id === 'string' ? (cards.find((c) => c.id === id) ?? null) : null
})
const closeSearch = () => router.replace({ query: {} })

/** DRAW：预计算四张结果卡，四列瀑布流即老虎机依次停定 */
const draw = () => {
  if (spinning.value) return
  const picked = CATEGORIES.map((c) => {
    const pool = drawPool(c.key)
    return pool[Math.floor(Math.random() * pool.length)]
  })
  stopped = 0
  picks.value = picked
  session.value += 1
  spinning.value = true
  playFlip(0.55)
}

/** 抽取指令：computed 保证引用稳定，避免误触发重复 spin */
const drawCmds = computed<(DrawCmd | null)[]>(() =>
  session.value > 0 && picks.value.length === CATEGORIES.length
    ? picks.value.map((p, i) => ({ session: session.value, card: p, stopDelay: 2200 + i * 400 }))
    : CATEGORIES.map(() => null),
)

/** 每列停定回报；四列齐后 jackpot：结果入工作台，老虎机随后自动回归瀑布流 */
const onColumnStopped = (card: Card) => {
  stopped += 1
  playFlip(0.3) /* 每列停定一声轻翻页 */
  if (stopped >= CATEGORIES.length) {
    spinning.value = false
    drawn.value = picks.value.length ? picks.value : [card]
    links.value = []
  }
}

const onViewMap = () => {
  pulseKey.value += 1
  mapRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const onCitySelect = (key: string | null) => {
  citySel.value = key
  if (key) document.getElementById(`city-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="yp-aged-paper yp-page-in min-h-screen">
    <!-- HEADER：页码细线 + 页面标题 -->
    <header class="border-b-[1.5px] border-[var(--yp-ink)]">
      <div class="flex items-center gap-3 px-5 pt-4">
        <button class="font-type text-xs hover:underline" title="返回入口页" @click="router.push('/')">←110</button>
        <span class="h-px flex-1 bg-[var(--yp-ink)]/60" />
        <span class="font-type text-[10px] tracking-[0.3em] text-[var(--yp-gray)]">
          {{ cards.length }} CARDS · SHANGHAI × WORLD
        </span>
        <button
          class="font-type border border-[var(--yp-ink)] px-2 py-0.5 text-[10px] tracking-[0.15em] transition-colors hover:bg-[var(--yp-ink)] hover:text-[var(--yp-yellow)]"
          title="打开档案索引（表格图文交互卡）"
          @click="router.push('/archive')"
        >ARCHIVE INDEX 档案索引 →</button>
      </div>
      <div class="mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-3 px-4 pb-5 pt-4">
        <h1 class="font-en text-3xl font-bold tracking-tight sm:text-5xl">
          <TypeTitle text="YELLOW PAGES ARCHIVE" :speed="55" />
        </h1>
        <p class="font-type max-w-md text-[10px] leading-relaxed tracking-[0.15em] text-neutral-600">
          衣 CLOTHING · 食 FOOD · 住 HOUSING · 行 TRANSPORT — 四列轮播，点击卡片翻转放大阅读，DRAW 同抽四张。
        </p>
      </div>

      <!-- 主界面搜索条（P2 版式：SEARCH 黄块在左 + 白底黑框输入框，靠左） -->
      <div class="mx-auto max-w-[1600px] px-4 pb-4">
        <div class="relative w-full max-w-xl">
          <form class="flex items-stretch" role="search" @submit.prevent="submitSearch">
            <button
              type="submit"
              class="font-type shrink-0 bg-[var(--yp-yellow)] px-4 py-2.5 text-xs tracking-[0.2em] transition-colors hover:bg-[var(--yp-ink)] hover:text-[var(--yp-yellow)]"
            >
              SEARCH
            </button>
            <input
              v-model="q"
              placeholder="Name / abstract / year / tag …"
              class="min-w-0 flex-1 border-[1.5px] border-[var(--yp-ink)] bg-white px-3 text-sm outline-none placeholder:text-neutral-400"
              aria-label="搜索档案"
            />
          </form>
          <!-- 实时联想 -->
          <ul
            v-if="suggest.length > 0"
            class="absolute inset-x-0 top-full z-20 mt-1 border-[1.5px] border-[var(--yp-ink)] bg-white shadow-[0_10px_30px_rgba(18,18,18,0.16)]"
          >
            <li v-for="c in suggest" :key="c.id">
              <button
                class="flex w-full items-baseline gap-2 px-3 py-2 text-left hover:bg-[var(--yp-yellow)]"
                @click="
                  q = '';
                  overlayCard = c
                "
              >
                <span class="font-en shrink-0 text-[10px] font-bold text-neutral-500">{{ c.id }}</span>
                <span class="min-w-0 flex-1 truncate text-[13px] font-bold">{{ c.title }}</span>
                <span class="font-en shrink-0 text-[10px] text-neutral-400">{{ c.year || '—' }}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <!-- 搜索关键词结果条（精简罗列，点击放大阅读） -->
      <div v-if="query" class="border-t border-[var(--yp-ink)]/20 bg-[var(--yp-yellow)]/60 px-4 py-2">
        <div class="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2">
          <span class="font-type shrink-0 text-[10px] tracking-[0.2em]">
            「{{ query }}」{{ queryHits.length > 0 ? ` · ${queryHits.length} 条结果` : ' · 无匹配' }}
          </span>
          <button
            v-for="c in queryHits"
            :key="c.id"
            class="font-type max-w-[220px] truncate bg-white px-2 py-1 text-[10px] tracking-wider hover:bg-[var(--yp-ink)] hover:text-[var(--yp-yellow)]"
            :title="c.title"
            @click="overlayCard = c"
          >
            {{ c.id }} · {{ c.title }}
          </button>
          <button class="font-type ml-auto px-2 text-xs hover:underline" aria-label="清除搜索" @click="closeSearch">
            ✕ 清除
          </button>
        </div>
      </div>
    </header>

    <!-- 四列瀑布流（即老虎机）+ 右侧抽取工作台：四栏等宽固定、栏间距一致 -->
    <section class="mx-auto max-w-[1600px] px-3 py-6 md:px-4">
      <div class="grid grid-cols-1 gap-x-[14px] gap-y-[14px] md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_290px]">
        <div v-for="(c, i) in CATEGORIES" :key="c.key" class="min-w-0">
          <CategoryColumn
            :no="c.no"
            :zh="c.zh"
            :en="c.en"
            :items="byCategory(c.key)"
            :dir="i % 2 === 0 ? 1 : -1"
            :draw-cmd="drawCmds[i]"
            @stopped="onColumnStopped"
          />
        </div>
        <DrawSidebar
          :drawn="drawn"
          :links="links"
          :spinning="spinning"
          @links-change="links = $event"
          @view-map="onViewMap"
          @draw="draw"
        />
      </div>
    </section>

    <!-- 城市地图（原网站风格）+ 五城分区（选中城市才展开条目） -->
    <section ref="mapRef" class="border-t-[1.5px] border-[var(--yp-ink)]">
      <div class="mx-auto max-w-[1600px] scroll-mt-4 px-2 py-8 md:px-4">
        <div class="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
          <h2 class="font-en text-2xl font-bold tracking-tight sm:text-4xl">
            <TypeTitle text="CITY MAP" :speed="55" />
          </h2>
          <p class="font-type max-w-md text-[10px] leading-relaxed tracking-[0.15em] text-neutral-600">
            点阵世界地图 · 五城连线 · 行走手指 pin · 点击城市查看分区档案
          </p>
        </div>
        <ClassicMap :drawn="drawn" :links="links" :pulse-key="pulseKey" :selected="citySel" @select="onCitySelect" />
        <CitySections :drawn="drawn" :selected-city="citySel" @select="onCitySelect" />
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="border-t-[1.5px] border-[var(--yp-ink)] py-6">
      <div class="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4">
        <p class="font-en text-sm font-bold tracking-wide">YELLOW PAGES ARCHIVE · LET YOUR FINGERS DO THE WALKING</p>
        <p class="font-type text-[9px] tracking-[0.2em] text-neutral-500">
          DATA: 上海黄页档案 × 黄页经典艺术档案（合并 {{ cards.length }} 条）· TYPE: CHILLDINGOTHIC / BAHNSCHRIFT
        </p>
      </div>
    </footer>

    <!-- 搜索结果/直达卡的放大阅读 -->
    <CardOverlay
      v-if="overlayCard || directCard"
      :card="(overlayCard ?? directCard)!"
      @close="
        overlayCard = null;
        if (directCard) closeSearch()
      "
    />
  </div>
</template>
