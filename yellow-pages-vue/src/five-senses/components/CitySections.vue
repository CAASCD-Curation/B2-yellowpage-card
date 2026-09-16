<script setup lang="ts">
import { ref } from 'vue'
import { cardsOfCity, imgUrl, WORLD_CITIES } from '@/five-senses/lib/cards'
import type { Card } from '@/five-senses/lib/cards'
import WalkingFingers from '@/five-senses/components/WalkingFingers.vue'

const PAGE = 10

/**
 * 五城分区（选中才展开，词条保持精简）：
 * 未选中：仅分区头（编号 + 手指 + 双语名 + 条数 + 展开提示）；
 * 选中：单行精简条目（编号 / 标题 / 年代），点击条目展开短展签（摘要截断 + 出处）；
 * 抽中卡在分区内以黄底标出。
 */
const props = defineProps<{
  drawn: Card[]
  /** 只有选中的城市才展开对应卡片条目 */
  selectedCity: string | null
}>()
const emit = defineEmits<{ select: [key: string | null] }>()

const openId = ref<string | null>(null)
const showAll = ref(false)

const drawnIds = () => new Set(props.drawn.map((d) => d.id))
const hitsOf = (list: Card[]) => props.drawn.filter((d) => list.includes(d)).length
</script>

<template>
  <div class="mt-6 space-y-5">
    <section
      v-for="(city, i) in WORLD_CITIES"
      :key="city.key"
      :id="`city-${city.key}`"
      class="scroll-mt-4 border-[1.5px] border-[var(--yp-ink)] bg-[var(--yp-paper)]"
    >
      <!-- 分区头（整行可点击展开/收起） -->
      <button
        class="flex w-full flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-left transition-colors"
        :class="
          selectedCity === city.key
            ? 'border-b-[1.5px] border-[var(--yp-ink)] bg-[var(--yp-yellow)]/50'
            : 'hover:bg-[var(--yp-yellow)]/30'
        "
        @click="emit('select', selectedCity === city.key ? null : city.key)"
      >
        <div class="flex items-center gap-3">
          <span class="font-en text-xs font-bold text-neutral-500">{{ String(i + 1).padStart(2, '0') }}</span>
          <WalkingFingers :size="26" />
          <h3 class="font-en text-2xl font-bold tracking-tight">
            {{ city.en }} <span class="ml-1 text-lg">{{ city.name }}</span>
          </h3>
        </div>
        <span class="font-type text-[10px] tracking-[0.2em] text-neutral-500">
          {{ cardsOfCity(city.key).length }} ENTRIES
          <template v-if="hitsOf(cardsOfCity(city.key)) > 0"> · 抽中 {{ hitsOf(cardsOfCity(city.key)) }} 张</template>
          · {{ selectedCity === city.key ? '收起 ▲' : '点击展开条目 ▼' }}
        </span>
      </button>

      <!-- 条目（仅选中城市展示，单行精简） -->
      <template v-if="selectedCity === city.key">
        <p
          v-if="cardsOfCity(city.key).length === 0"
          class="font-type px-4 py-6 text-center text-[10px] tracking-[0.25em] text-neutral-400"
        >
          该城市档案采集中 …
        </p>
        <ul v-else>
          <li
            v-for="(c, idx) in (showAll ? cardsOfCity(city.key) : cardsOfCity(city.key).slice(0, PAGE))"
            :key="c.id"
            :class="drawnIds().has(c.id) ? 'bg-[var(--yp-yellow)]' : idx % 2 ? 'bg-white/50' : ''"
          >
            <button
              class="flex w-full items-baseline gap-3 border-b border-[var(--yp-ink)]/15 px-4 py-1.5 text-left"
              @click="openId = openId === c.id ? null : c.id"
            >
              <span class="font-en w-20 shrink-0 text-[11px] font-bold">{{ c.id }}</span>
              <span
                class="min-w-0 flex-1 truncate text-[13px] font-bold"
                :class="openId === c.id ? 'underline' : 'hover:underline'"
              >
                <span v-if="drawnIds().has(c.id)" class="font-en mr-1 text-[10px]">●</span>
                {{ c.title }}
              </span>
              <span class="font-en shrink-0 text-[11px] text-neutral-500">{{ c.year || '—' }}</span>
              <span class="font-type shrink-0 text-[9px] tracking-wider text-neutral-400">
                {{ openId === c.id ? '▲' : '▼' }}
              </span>
            </button>
            <div v-if="openId === c.id" class="flex gap-3 border-b border-[var(--yp-ink)]/25 bg-white px-4 py-2.5">
              <img
                v-if="c.media.back"
                :src="imgUrl(c.media.back)"
                alt=""
                class="h-20 w-28 shrink-0 rounded-sm object-cover"
                loading="lazy"
              />
              <div class="min-w-0">
                <p class="line-clamp-3 text-[12px] leading-relaxed text-neutral-800">{{ c.summary }}</p>
                <p class="font-type mt-1.5 text-[9px] tracking-wider text-neutral-500">
                  {{ c.tags.region }} · {{ c.sourceRef.publisher }}
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
            </div>
          </li>
        </ul>

        <!-- 展开全部 -->
        <button
          v-if="cardsOfCity(city.key).length > PAGE"
          class="font-type w-full bg-white px-4 py-2 text-[10px] tracking-[0.2em] hover:bg-[var(--yp-yellow)]"
          @click="showAll = !showAll"
        >
          {{ showAll ? '收起 COLLAPSE ▲' : `全部 ${cardsOfCity(city.key).length} 条 SHOW ALL ▼` }}
        </button>
      </template>
    </section>
  </div>
</template>
