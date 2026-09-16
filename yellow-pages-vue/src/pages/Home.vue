<script setup lang="ts">
import { computed, ref } from 'vue'
import SenseFlow from '@/components/SenseFlow.vue'
import CityMap from '@/components/CityMap.vue'
import DetailPanel from '@/components/DetailPanel.vue'
import { archive, cityOfEntry, searchEntries, SENSES } from '@/lib/archive'
import type { Entry } from '@/lib/archive'

const query = ref('')
const openEntry = ref<Entry | null>(null)
const mapCity = ref<string | null>(null)
const mapHighlight = ref<string | null>(null)
const mapRef = ref<HTMLElement | null>(null)

/* 关键词筛选 → 五列各自的条目 */
const bySense = computed(() => {
  const map: Record<string, Entry[]> = {}
  for (const s of SENSES) {
    map[s] = searchEntries(
      archive.entries.filter((e) => e.sense === s),
      query.value,
    )
  }
  return map
})

const matchCount = computed(() =>
  Object.values(bySense.value).reduce((n, l) => n + l.length, 0),
)

const openDetail = (e: Entry) => (openEntry.value = e)

/** 详情 → 地图：滚动到地图并高亮城市 */
const locate = (e: Entry) => {
  const city = cityOfEntry(e)
  openEntry.value = null
  mapHighlight.value = e.id
  if (city) mapCity.value = city.key
  mapRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const related = computed(() => {
  if (!openEntry.value) return []
  return archive.entries
    .filter((e) => e.sense === openEntry.value!.sense && e.id !== openEntry.value!.id)
    .slice(0, 6)
})

const onMapSelect = (k: string | null) => {
  mapCity.value = k
  if (!k) mapHighlight.value = null
}
</script>

<template>
  <div class="min-h-screen">
    <!-- 通往档案索引子路由 -->
    <RouterLink
      to="/archive"
      class="yp-label fixed right-4 top-4 z-50 border-2 border-[var(--yp-ink)] bg-[var(--yp-yellow)] px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] hover:bg-[var(--yp-ink)] hover:text-[var(--yp-yellow)]"
    >
      ARCHIVE INDEX · 档案索引 ↗
    </RouterLink>

    <!-- ===== HERO · 极简标题（无页眉导航） ===== -->
    <header class="border-b-[1.5px] border-[var(--yp-ink)]">
      <div class="mx-auto flex max-w-7xl flex-col items-center px-4 pb-12 pt-16 text-center">
        <p class="yp-label text-[10px] tracking-[0.35em] text-neutral-500">
          CLASSIC ART ARCHIVE · FIVE SENSES EDITION
        </p>
        <h1 class="font-en mt-5 text-[15vw] font-bold leading-[0.9] tracking-tight sm:text-8xl">
          YELLOW
          <br />
          PAGES
        </h1>
        <p class="yp-label mt-5 text-[11px] tracking-[0.2em] text-neutral-600">
          ARCHIVE — {{ archive.entries.length }} ENTRIES + {{ archive.extEntries.length }} EXTENDED
        </p>

        <!-- 检索（单行极简） -->
        <form
          class="mt-8 flex w-full max-w-xl items-center border-[1.5px] border-[var(--yp-ink)] bg-white"
          @submit.prevent
        >
          <span
            class="yp-label border-r-[1.5px] border-[var(--yp-ink)] bg-[var(--yp-yellow)] px-3 py-2.5 text-[10px] font-bold"
          >
            SEARCH
          </span>
          <input
            v-model="query"
            placeholder="Name / abstract / year / tag …"
            class="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm font-bold outline-none placeholder:font-normal placeholder:text-neutral-400"
          />
          <button
            v-if="query"
            type="button"
            class="yp-label border-l-[1.5px] border-[var(--yp-ink)] px-3 py-2.5 text-[10px] font-bold hover:bg-[var(--yp-yellow)]"
            @click="query = ''"
          >
            ✕ CLEAR
          </button>
        </form>
        <p class="yp-label mt-3 text-[10px] text-neutral-500">
          {{ query ? `MATCH ${matchCount} / ${archive.entries.length}` : 'SCROLL TO EXPLORE THE FIVE SENSES ↓' }}
        </p>
      </div>
    </header>

    <!-- ===== FIVE SENSES · 五列瀑布流（老虎机 × 索引 合并） ===== -->
    <section class="border-b-[1.5px] border-[var(--yp-ink)]">
      <div class="mx-auto max-w-[1400px] px-4 py-12">
        <div class="mb-6 flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <p class="yp-label text-[10px] tracking-[0.3em] text-neutral-500">INDEX × SLOT MACHINE</p>
            <h2 class="font-en mt-1 text-4xl font-bold tracking-tight md:text-5xl">FIVE SENSES</h2>
          </div>
          <p class="yp-label max-w-sm text-[10px] leading-relaxed text-neutral-600">
            SIGHT · HEARING · SMELL · TOUCH · TASTE — FIVE ENDLESS COLUMNS. HOVER TO PAUSE, CLICK A CARD TO OPEN ITS
            FILE.
          </p>
        </div>
        <SenseFlow :by-sense="bySense" @open="openDetail" />
      </div>
    </section>

    <!-- ===== CITY MAP ===== -->
    <section ref="mapRef" class="border-b-[1.5px] border-[var(--yp-ink)]">
      <div class="mx-auto max-w-6xl scroll-mt-6 px-4 py-14">
        <div class="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="yp-label text-[10px] tracking-[0.3em] text-neutral-500">GEOGRAPHY</p>
            <h2 class="font-en mt-1 text-4xl font-bold tracking-tight md:text-5xl">CITY MAP</h2>
          </div>
          <p class="yp-label max-w-sm text-[10px] leading-relaxed text-neutral-600">
            TOKYO · WASHINGTON · SHANGHAI · PARIS · FLORENCE — ONE CITY PER COUNTRY, LINKED BY SHARED THEMES.
          </p>
        </div>
        <CityMap
          :selected="mapCity"
          :highlight-id="mapHighlight"
          @select="onMapSelect"
          @open="openDetail"
        />
      </div>
    </section>

    <!-- 页脚：浅色，减少黑色占比 -->
    <footer class="border-t-[1.5px] border-[var(--yp-ink)] bg-[var(--yp-yellow)] py-10">
      <div class="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-6 px-4">
        <div>
          <p class="font-en text-2xl font-bold tracking-tight">YELLOW PAGES ARCHIVE</p>
          <p class="yp-label mt-1 text-[10px] text-neutral-700">FIVE SENSES EDITION · EST. 1883</p>
        </div>
        <div class="yp-label space-y-1 text-[10px] leading-relaxed text-neutral-700">
          <p>SOURCE: YELLOW PAGES CLASSIC ART ARCHIVE (XLSX)</p>
          <p>TYPE: CHILLDINGOTHIC / BAHNSCHRIFT · KEY COLOR #FFEC00</p>
          <p>MOTION: INFINITE COLUMN SCROLL · WHEEL IMPULSE · HOVER PAUSE</p>
        </div>
      </div>
    </footer>

    <!-- 详情面板 -->
    <DetailPanel
      :entry="openEntry"
      :related="related"
      @close="openEntry = null"
      @locate="locate"
      @open-related="(e) => (openEntry = e)"
    />
  </div>
</template>
