<script setup lang="ts">
import { computed, ref } from 'vue'
import { cardsOfCity, cityLinks, MAP, mapDots, WORLD_CITIES } from '@/five-senses/lib/cards'
import type { Card } from '@/five-senses/lib/cards'
import type { Link } from '@/five-senses/components/DrawSidebar.vue'
import WalkingFingers from '@/five-senses/components/WalkingFingers.vue'

/** P3 两行标签的国家行 */
const CITY_COUNTRY: Record<string, string> = {
  tokyo: '日本',
  dc: '美国',
  shanghai: '中国 · 上海',
  paris: '法国',
  florence: '意大利',
}

/**
 * 城市地图（保持原网站风格）：
 * 灰度点阵世界地图 + 五城两行地名标注 + 细线连接（共享主题）+ 行走手指 pin；
 * 抽中卡以黄态手指 pin 落到对应城市，关联线动态描线生长。
 */
const props = defineProps<{
  drawn: Card[]
  links: Link[]
  /** VIEW ON MAP 点击计数：变化时抽中 pin 依次弹出 + 关联线逐条生长 */
  pulseKey: number
  /** 受控选中城市（与分区联动） */
  selected: string | null
}>()
const emit = defineEmits<{ select: [key: string | null] }>()

const showLinks = ref(true)
const tip = ref<{ x: number; y: number; text: string } | null>(null)

/* 较短连接线：仅保留共享主题最强且距离最近的 4 条，弧度压低 */
const clinks = (() => {
  const dist = (l: { a: { lon: number; lat: number }; b: { lon: number; lat: number } }) =>
    Math.hypot(l.a.lon - l.b.lon, l.a.lat - l.b.lat)
  return cityLinks()
    .sort((x, y) => y.themes.length - x.themes.length || dist(x) - dist(y))
    .slice(0, 4)
})()

/* 下方导栏城市集合：点击的城市 + 抽中卡/关联涉及的城市 */
const infoCities = computed(() => {
  const keys = new Set<string>()
  if (props.selected) keys.add(props.selected)
  const drawnIds = new Set(props.drawn.map((d) => d.id))
  if (drawnIds.size > 0) {
    for (const c of WORLD_CITIES) {
      if (cardsOfCity(c.key).some((card) => drawnIds.has(card.id))) keys.add(c.key)
    }
  }
  return WORLD_CITIES.filter((c) => keys.has(c.key))
})

/* 抽中卡 pin：世界坐标；上海城区级坐标归并到上海城市点（按 id 散列微抖动） */
const drawnPins = computed(() =>
  props.drawn.map((c) => {
    let lon = c.mapLink?.lng ?? 0
    let lat = c.mapLink?.lat ?? 0
    if (c.mapLink?.scope === 'shanghai') {
      let h = 0
      for (const ch of c.id) h = (h * 31 + ch.charCodeAt(0)) % 997
      lon = 121.47 + ((h % 9) - 4) * 0.9
      lat = 31.23 + ((Math.floor(h / 9) % 7) - 3) * 0.9
    }
    return { card: c, x: MAP.x(lon), y: MAP.y(lat) }
  }),
)
const pinOf = (id: string) => drawnPins.value.find((p) => p.card.id === id)

const linkLines = computed(() =>
  props.links
    .map((l, i) => {
      const pa = pinOf(l.a)
      const pb = pinOf(l.b)
      if (!pa || !pb) return null
      const mx = (pa.x + pb.x) / 2
      const my = Math.min(pa.y, pb.y) - Math.abs(pa.x - pb.x) * 0.2 - 14
      return { l, i, d: `M ${pa.x} ${pa.y} Q ${mx} ${my} ${pb.x} ${pb.y}` }
    })
    .filter(Boolean) as { l: Link; i: number; d: string }[],
)

/** 五城连接曲线几何（控制点钳制在画框内） */
const clinkPaths = clinks.map(({ a, b, themes }) => {
  const ax = MAP.x(a.lon)
  const ay = MAP.y(a.lat)
  const bx = MAP.x(b.lon)
  const by = MAP.y(b.lat)
  const mx = Math.max(70, Math.min(MAP.w - 70, (ax + bx) / 2))
  const my = Math.max(18, Math.min(ay, by) - Math.abs(ax - bx) * 0.12 - 10)
  return { a, b, themes, d: `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`, mx, my }
})

/** 五城 pin + 两行标签几何（钳制在画框内；东京标签上移防与上海重叠） */
const cityMarks = WORLD_CITIES.map((c) => {
  const x = MAP.x(c.lon)
  const y = MAP.y(c.lat)
  const labelX = Math.max(60, Math.min(MAP.w - 60, x))
  const above = c.key === 'tokyo'
  return { c, x, y, labelX, above, count: cardsOfCity(c.key).length, country: CITY_COUNTRY[c.key] ?? '' }
})

const labelYOf = (m: (typeof cityMarks)[number], active: boolean) =>
  m.above ? Math.max(m.y - 40, 24) : Math.min(m.y + (active ? 44 : 34), MAP.h - 24)

const showTip = (e: MouseEvent, text: string) => {
  const r = (e.target as SVGPathElement).getBoundingClientRect()
  tip.value = { x: r.left + r.width / 2, y: r.top, text }
}
</script>

<template>
  <div class="border-[1.5px] border-[var(--yp-ink)] bg-white">
    <!-- 图例栏 -->
    <div class="flex flex-wrap items-center gap-4 border-b-[1.5px] border-[var(--yp-ink)] px-3 py-2">
      <span class="font-type flex items-center gap-1.5 text-[10px] tracking-wider">
        <span class="inline-block h-3 w-3 rounded-full border-2 border-[var(--yp-ink)] bg-[var(--yp-yellow)]" />
        选中城市
      </span>
      <span class="font-type flex items-center gap-1.5 text-[10px] tracking-wider">
        <WalkingFingers :size="14" clean /> 条目锚点（行走手指）
      </span>
      <button
        class="font-type ml-auto bg-[var(--yp-paper)] px-3 py-1 text-[10px] tracking-wider hover:bg-[var(--yp-yellow)]"
        @click="showLinks = !showLinks"
      >
        {{ showLinks ? '隐藏连接 HIDE LINKS' : '寻找连接 FIND LINKS' }}
      </button>
    </div>

    <div class="yp-paper-grid relative p-3">
      <svg :viewBox="`0 0 ${MAP.w} ${MAP.h}`" class="h-auto w-full" role="img" aria-label="城市地图">
        <!-- 大陆点阵（原网站灰点） -->
        <g>
          <circle v-for="(pt, i) in mapDots" :key="i" :cx="MAP.x(pt[0])" :cy="MAP.y(pt[1])" :r="2.1" fill="#cfccc0" />
        </g>

        <!-- 五城连接曲线（细线，选中相关为墨色） -->
        <template v-if="showLinks">
          <g v-for="p in clinkPaths" :key="p.a.key + p.b.key">
            <path
              :d="p.d"
              fill="none"
              :stroke="selected && (p.a.key === selected || p.b.key === selected) ? 'var(--yp-ink)' : '#6e6a5e'"
              stroke-width="1.5"
              stroke-linecap="round"
              :opacity="selected && p.a.key !== selected && p.b.key !== selected ? 0.25 : 0.85"
              class="yp-link-line"
            />
            <text
              v-if="selected && (p.a.key === selected || p.b.key === selected)"
              :x="p.mx"
              :y="Math.max(14, p.my - 6)"
              text-anchor="middle"
              class="font-en"
              font-size="13"
              font-weight="700"
              fill="var(--yp-ink)"
            >
              {{ p.themes.slice(0, 3).join(' · ').toUpperCase() }}
            </text>
          </g>
        </template>

        <!-- 关联线（抽中卡之间，动态描线） -->
        <path
          v-for="ln in linkLines"
          :key="ln.l.a + ln.l.b + pulseKey"
          :d="ln.d"
          fill="none"
          stroke="var(--yp-ink)"
          stroke-width="1.5"
          stroke-dasharray="6 4"
          :pathLength="1"
          class="cursor-pointer"
          :style="{
            strokeDashoffset: 1,
            animation: `yp-dash 0.6s ease-in-out ${0.15 * ln.i + drawnPins.length * 0.12}s forwards`,
          }"
          @mouseenter="showTip($event, ln.l.note)"
          @mouseleave="tip = null"
        />

        <!-- 五城 · 行走手指锚点 + P3 两行标签 -->
        <g
          v-for="m in cityMarks"
          :key="m.c.key"
          :transform="`translate(${m.x},${m.y})`"
          class="cursor-pointer"
          @click="emit('select', selected === m.c.key ? null : m.c.key)"
        >
          <circle
            v-if="selected === m.c.key"
            r="26"
            fill="var(--yp-yellow)"
            opacity="0.55"
            class="yp-spin-slow"
            style="transform-origin: 0 0"
          />
          <image
            href="/images/walking-fingers-clean.png"
            :x="selected === m.c.key ? -19 : -15"
            :y="selected === m.c.key ? -19 : -15"
            :width="selected === m.c.key ? 38 : 30"
            :height="selected === m.c.key ? 38 : 30"
            style="pointer-events: none"
          />
          <g :transform="`translate(${m.labelX - m.x},${labelYOf(m, selected === m.c.key) - m.y})`" style="pointer-events: none">
            <rect
              x="-58"
              y="-17"
              width="116"
              height="34"
              :fill="selected === m.c.key ? 'var(--yp-ink)' : 'white'"
              :stroke="selected === m.c.key ? 'none' : 'var(--yp-ink)'"
              :stroke-width="selected === m.c.key ? 0 : 1.5"
            />
            <text
              text-anchor="middle"
              dy="-2"
              font-size="12.5"
              font-weight="700"
              :fill="selected === m.c.key ? 'var(--yp-yellow)' : 'var(--yp-ink)'"
            >
              {{ m.c.name }} {{ m.c.en }}
            </text>
            <text
              text-anchor="middle"
              dy="12"
              font-size="10"
              :fill="selected === m.c.key ? 'var(--yp-yellow)' : '#6e6a5e'"
              :opacity="selected === m.c.key ? 0.9 : 1"
            >
              {{ m.country }} · {{ m.count }} 条
            </text>
          </g>
        </g>

        <!-- 抽中卡 · 黄态手指 pin（依次弹出） -->
        <g
          v-for="(p, i) in drawnPins"
          :key="p.card.id + pulseKey"
          :transform="`translate(${p.x},${p.y})`"
          class="yp-pop"
          :style="{ animationDelay: `${i * 0.12}s`, transformOrigin: '0 0' }"
        >
          <image
            href="/images/walking-fingers-clean.png"
            x="-14"
            y="-14"
            width="28"
            height="28"
            style="pointer-events: none"
          />
          <text
            y="28"
            text-anchor="middle"
            font-size="11"
            font-weight="700"
            fill="var(--yp-ink)"
            class="font-en"
            :x="Math.max(-p.x + 34, Math.min(MAP.w - p.x - 34, 0))"
          >
            {{ p.card.id }}
          </text>
        </g>
      </svg>

      <!-- 关联说明 tooltip -->
      <div
        v-if="tip"
        class="pointer-events-none fixed z-50 max-w-[260px] border-[1.5px] border-[var(--yp-ink)] bg-[var(--yp-yellow)] px-3 py-2 text-[11px] leading-snug shadow-[4px_4px_0_var(--yp-ink)]"
        :style="{ left: tip.x - 130 + 'px', top: tip.y - 8 + 'px', transform: 'translateY(-100%)' }"
      >
        {{ tip.text }}
      </div>

      <p
        v-if="drawn.length === 0"
        class="font-type pointer-events-none absolute inset-x-0 top-3 text-center text-[10px] tracking-[0.2em] text-neutral-500"
      >
        DRAW 抽取四张卡片后，行走手指 pin 将在此亮起 · 点击城市前往分区
      </p>
    </div>

    <!-- 下方导栏：仅在点击城市或抽中/连接涉及该城市时出现对应介绍 -->
    <div
      v-if="infoCities.length > 0"
      class="flex flex-wrap items-stretch gap-2 border-t-[1.5px] border-[var(--yp-ink)] bg-[var(--yp-paper)] px-3 py-2.5"
    >
      <button
        v-for="c in infoCities"
        :key="c.key"
        class="flex min-w-0 items-center gap-2.5 px-2.5 py-1.5 text-left shadow-[0_1px_6px_rgba(20,20,20,0.10)] transition-colors"
        :class="selected === c.key ? 'bg-[var(--yp-yellow)]' : 'bg-white hover:bg-[var(--yp-yellow)]'"
        title="前往城市分区"
        @click="emit('select', c.key)"
      >
        <WalkingFingers :size="24" />
        <span class="min-w-0">
          <span class="block text-[12px] font-bold leading-tight">
            {{ c.name }} <span class="font-en">{{ c.en }}</span>
          </span>
          <span class="font-type block truncate text-[9px] tracking-wider text-neutral-600">
            {{ cardsOfCity(c.key).length }} 条档案
            <template v-if="clinks.filter((l) => l.a.key === c.key || l.b.key === c.key).length > 0">
              · {{ Array.from(new Set(clinks.filter((l) => l.a.key === c.key || l.b.key === c.key).flatMap((l) => l.themes))).slice(0, 3).join(' / ') }}
            </template>
            · 前往分区 →
          </span>
        </span>
      </button>
    </div>
  </div>
</template>
