<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CITIES, cityLinks, entriesOfCity, imgUrl, MAP, mapDots } from '@/lib/archive'
import type { Entry } from '@/lib/archive'

const props = defineProps<{
  selected: string | null
  highlightId?: string | null
}>()
const emit = defineEmits<{
  select: [key: string | null]
  open: [e: Entry]
}>()

/**
 * 城市地图：参考米其林轮胎×餐厅的故事，
 * 灰度点阵世界地图上以黄色高亮五座城市（日东京 / 美华盛顿 / 中上海 / 法巴黎 / 意佛罗伦萨），
 * 黑色星标为条目锚点，曲线连接共享主题的城市（寻找连接）。
 */
const showLinks = ref(true)
const links = cityLinks()
const sel = computed(() => CITIES.find((c) => c.key === props.selected))
const selEntries = computed(() => (sel.value ? entriesOfCity(sel.value) : []))

/* 高亮条目变化时自动选中其城市 */
watch(
  () => props.highlightId,
  (id) => {
    if (id) {
      const c = CITIES.find((city) => entriesOfCity(city).some((e) => e.id === id))
      if (c) emit('select', c.key)
    }
  },
)

const countOf = (key: string) => {
  const c = CITIES.find((x) => x.key === key)
  return c ? entriesOfCity(c).length : 0
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[1fr_330px]">
    <!-- 地图 -->
    <div class="yp-border-thick yp-paper-grid relative bg-white p-3">
      <svg :viewBox="`0 0 ${MAP.w} ${MAP.h}`" class="h-auto w-full" role="img" aria-label="城市地图">
        <!-- 大陆点阵 -->
        <g>
          <circle
            v-for="(d, i) in mapDots"
            :key="i"
            :cx="MAP.x(d[0])"
            :cy="MAP.y(d[1])"
            :r="2.1"
            fill="#cfccc0"
          />
        </g>

        <!-- 连接曲线 -->
        <template v-if="showLinks">
          <g v-for="l in links" :key="l.a.key + l.b.key">
            <path
              :d="`M ${MAP.x(l.a.lon)} ${MAP.y(l.a.lat)} Q ${(MAP.x(l.a.lon) + MAP.x(l.b.lon)) / 2} ${Math.min(MAP.y(l.a.lat), MAP.y(l.b.lat)) - Math.abs(MAP.x(l.a.lon) - MAP.x(l.b.lon)) * 0.22 - 14} ${MAP.x(l.b.lon)} ${MAP.y(l.b.lat)}`"
              fill="none"
              :stroke="sel && (l.a.key === sel.key || l.b.key === sel.key) ? 'var(--yp-ink)' : '#b9b52a'"
              :stroke-width="Math.min(2 + l.themes.length, 6)"
              stroke-linecap="round"
              :opacity="sel && !(l.a.key === sel.key || l.b.key === sel.key) ? 0.25 : 0.85"
              class="yp-link-line"
            />
            <text
              v-if="sel && (l.a.key === sel.key || l.b.key === sel.key)"
              :x="(MAP.x(l.a.lon) + MAP.x(l.b.lon)) / 2"
              :y="Math.min(MAP.y(l.a.lat), MAP.y(l.b.lat)) - Math.abs(MAP.x(l.a.lon) - MAP.x(l.b.lon)) * 0.22 - 20"
              text-anchor="middle"
              class="font-en"
              font-size="13"
              font-weight="700"
              fill="var(--yp-ink)"
            >
              {{ l.themes.slice(0, 3).join(' · ').toUpperCase() }}
            </text>
          </g>
        </template>

        <!-- 城市 -->
        <g
          v-for="c in CITIES"
          :key="c.key"
          :transform="`translate(${MAP.x(c.lon)},${MAP.y(c.lat)})`"
          class="cursor-pointer"
          @click="emit('select', selected === c.key ? null : c.key)"
        >
          <circle
            v-if="selected === c.key"
            r="30"
            fill="var(--yp-yellow)"
            opacity="0.55"
            class="yp-spin-slow"
            style="transform-origin: 0 0"
          />
          <circle
            :r="selected === c.key ? 17 : 13"
            :fill="selected === c.key ? 'var(--yp-yellow)' : '#e8e4d2'"
            stroke="var(--yp-ink)"
            stroke-width="2.5"
          />
          <text
            text-anchor="middle"
            dy="7"
            font-size="26"
            font-weight="900"
            fill="var(--yp-ink)"
            style="user-select: none"
          >
            ✳
          </text>
          <g :transform="`translate(0,${selected === c.key ? 34 : 28})`">
            <rect
              x="-52"
              y="-13"
              width="104"
              height="34"
              :fill="selected === c.key ? 'var(--yp-ink)' : 'white'"
              stroke="var(--yp-ink)"
              stroke-width="2"
            />
            <text
              text-anchor="middle"
              dy="1"
              font-size="13"
              font-weight="700"
              :fill="selected === c.key ? 'var(--yp-yellow)' : 'var(--yp-ink)'"
            >
              {{ c.name }} {{ c.en }}
            </text>
            <text
              text-anchor="middle"
              dy="15"
              font-size="9"
              :fill="selected === c.key ? 'var(--yp-yellow)' : '#666'"
              class="font-en"
            >
              {{ c.country }} · {{ countOf(c.key) }} 条
            </text>
          </g>
        </g>
      </svg>

      <!-- 图例 -->
      <div class="mt-2 flex flex-wrap items-center gap-4 border-t border-[var(--yp-ink)]/30 pt-2">
        <span class="yp-label flex items-center gap-1.5 text-[10px]">
          <span class="inline-block h-3 w-3 rounded-full border-2 border-[var(--yp-ink)] bg-[var(--yp-yellow)]" />
          选中城市
        </span>
        <span class="yp-label flex items-center gap-1.5 text-[10px]">
          <span class="font-en text-sm leading-none">✳</span> 条目锚点（参考米其林星标）
        </span>
        <button
          class="yp-label ml-auto border-2 border-[var(--yp-ink)] bg-white px-3 py-1 text-[10px] font-bold hover:bg-[var(--yp-yellow)]"
          @click="showLinks = !showLinks"
        >
          {{ showLinks ? '隐藏连接 HIDE LINKS' : '寻找连接 FIND LINKS' }}
        </button>
      </div>
    </div>

    <!-- 城市条目列表（KASK 黄卡风格） -->
    <aside class="yp-border-thick flex max-h-[640px] flex-col bg-[var(--yp-yellow)]">
      <header class="border-b-2 border-[var(--yp-ink)] p-4">
        <p class="yp-label text-[10px] text-neutral-700">城市 CITY</p>
        <h3 class="text-2xl font-bold">{{ sel ? `${sel.name} ${sel.en}` : '未选择 NONE' }}</h3>
        <p class="yp-label mt-1 text-[10px]">
          {{ sel ? `${sel.country} · ${selEntries.length} 条档案 · 点击星标切换城市` : '点击地图上的星标查看该城档案' }}
        </p>
      </header>
      <div class="yp-scroll flex-1 overflow-y-auto">
        <ul v-if="sel">
          <li v-for="(e, i) in selEntries" :key="e.id">
            <button
              class="group flex w-full items-center gap-3 border-b border-[var(--yp-ink)]/40 px-4 py-2.5 text-left hover:bg-white/60"
              :class="highlightId === e.id ? 'bg-white' : ''"
              @click="emit('open', e)"
            >
              <span class="font-en w-7 shrink-0 text-right text-xs font-bold">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-bold group-hover:underline">{{ e.name }}</span>
                <span class="yp-label text-[9px] text-neutral-700">{{ e.id }} · {{ e.year }} · {{ e.sense }}</span>
              </span>
              <img
                v-if="e.images.length > 0"
                :src="imgUrl(e.images[0])"
                alt=""
                class="h-9 w-9 shrink-0 border border-[var(--yp-ink)] object-cover"
                loading="lazy"
              />
            </button>
          </li>
        </ul>
        <div v-else class="flex h-full min-h-[220px] items-center justify-center p-6">
          <p class="yp-label text-center text-[11px] leading-relaxed text-neutral-600">
            参考米其林轮胎与米其林餐厅的故事：
            <br />
            把分散的条目钉在城市上，
            <br />
            再沿共享的主题寻找连接。
          </p>
        </div>
      </div>
    </aside>
  </div>
</template>
