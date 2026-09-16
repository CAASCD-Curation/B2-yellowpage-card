<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { imgUrl } from '@/five-senses/lib/cards'
import type { Card } from '@/five-senses/lib/cards'

/**
 * 放大阅读覆盖层：用户翻动卡片后，卡片放大到屏幕中央展示完整展签；
 * 点击遮罩或卡片任意处关闭，卡片回归瀑布流（由调用方翻转回去）。
 */
const props = defineProps<{ card: Card }>()
const emit = defineEmits<{ close: [] }>()

const img = computed(() => props.card.media.back || props.card.media.front)
const extras = computed(() => props.card.media.extra ?? [])
const tags = computed(() =>
  [
    props.card.tags.region && `地区 ${props.card.tags.region}`,
    props.card.tags.theme && `主题 ${props.card.tags.theme}`,
    props.card.tags.form && `形式 ${props.card.tags.form}`,
    props.card.tags.media && `媒介 ${props.card.tags.media}`,
    props.card.tags.era && `年代 ${props.card.tags.era}`,
  ].filter(Boolean) as string[],
)

/* Esc 关闭 */
const onKey = (e: KeyboardEvent) => e.key === 'Escape' && emit('close')
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <!-- 用 Teleport 挂到 body：滚筒轨道带 transform，fixed 会被降级为相对轨道定位 -->
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[90] flex items-center justify-center bg-[var(--yp-ink)]/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      :aria-label="card.title"
      @click="emit('close')"
    >
      <article
        class="yp-overlay-in max-h-[86vh] w-[min(430px,92vw)] cursor-pointer overflow-hidden rounded-sm bg-[var(--yp-yellow)] shadow-[0_18px_60px_rgba(18,18,18,0.35)]"
        @click.stop="emit('close')"
      >
        <img v-if="img" :src="imgUrl(img)" :alt="card.title" class="h-52 w-full object-cover" draggable="false" />
        <div class="yp-scroll max-h-[46vh] overflow-y-auto p-5">
          <p class="font-type text-[10px] tracking-[0.25em] text-neutral-600">
            {{ card.id }} · {{ card.year || '—' }}
            <span v-if="card.verify === 'partial'" class="text-[var(--yp-stamp)]"> · 部分核实</span>
          </p>
          <h3 class="mt-1 text-xl font-bold leading-snug">{{ card.title }}</h3>
          <p class="mt-3 text-[13px] leading-relaxed text-neutral-800">{{ card.detail || card.summary }}</p>
          <!-- 多图画廊（Excel 档案图片，点击放大阅读时才出现） -->
          <div v-if="extras.length > 0" class="mt-4 space-y-3">
            <img
              v-for="x in extras"
              :key="x"
              :src="imgUrl(x)"
              :alt="`${card.title} 档案图`"
              loading="lazy"
              class="w-full border border-[var(--yp-ink)]/15 object-cover"
              draggable="false"
            />
          </div>
          <!-- 标签行 -->
          <div v-if="tags.length > 0" class="mt-4 flex flex-wrap gap-1.5">
            <span
              v-for="t in tags"
              :key="t"
              class="font-type border border-dashed border-[var(--yp-ink)]/40 bg-white/70 px-1.5 py-0.5 text-[9px] tracking-wider text-neutral-700"
            >
              {{ t }}
            </span>
          </div>
          <p class="font-type mt-4 border-t border-dashed border-[var(--yp-ink)]/30 pt-2.5 text-[10px] tracking-wider text-neutral-600">
            {{ card.sourceRef.publisher }}
            <a
              v-if="card.sourceRef.url"
              :href="card.sourceRef.url"
              target="_blank"
              rel="noreferrer"
              class="ml-2 font-bold text-[var(--yp-stamp)] underline"
              @click.stop
            >
              SOURCE ↗
            </a>
          </p>
          <p class="font-type mt-3 text-center text-[9px] tracking-[0.3em] text-neutral-500">
            点击任意处回归瀑布流
          </p>
        </div>
      </article>
    </div>
  </Teleport>
</template>
