<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { imgUrl, parseTags } from '@/lib/archive'
import type { Entry } from '@/lib/archive'

const props = defineProps<{
  entry: Entry | null
  related: Entry[]
}>()
const emit = defineEmits<{
  close: []
  locate: [e: Entry]
  openRelated: [e: Entry]
}>()

/** 详情卡片（参照脚本二右侧 KASK/HoGent 黄色词条卡）：黄色面板 + 编号 + 大字标题 + 图集 */
const imgIdx = ref(0)
watch(
  () => props.entry?.id,
  () => (imgIdx.value = 0),
)

const tags = computed(() =>
  props.entry ? parseTags(props.entry.tags) : { pairs: [], theme: [], region: '', era: '' },
)

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const meta = computed(() => {
  const e = props.entry
  if (!e) return []
  return [
    ['类型 TYPE', e.type],
    ['年代 YEAR', e.year],
    ['感官 SENSE', e.sense],
    ['采集角度 ANGLE', e.category],
    ['出处 SOURCE', e.source],
    ['核实状态 STATUS', e.status],
  ] as [string, string][]
})
</script>

<template>
  <div v-if="entry" class="fixed inset-0 z-50 flex justify-end">
    <div class="absolute inset-0 bg-black/55" @click="emit('close')" />
    <aside
      class="yp-pop relative flex h-full w-full max-w-[520px] flex-col overflow-hidden border-l-4 border-[var(--yp-ink)] bg-[var(--yp-yellow)]"
    >
      <!-- 头部 -->
      <header class="flex items-start justify-between border-b-2 border-[var(--yp-ink)] p-5">
        <div>
          <p class="font-en text-sm font-bold tracking-widest">{{ entry.id }}</p>
          <h3 class="mt-1 text-2xl font-bold leading-tight">{{ entry.name }}</h3>
        </div>
        <button
          aria-label="关闭"
          class="yp-label border-2 border-[var(--yp-ink)] bg-white px-3 py-1 text-xs font-bold hover:bg-[var(--yp-ink)] hover:text-[var(--yp-yellow)]"
          @click="emit('close')"
        >
          ✕ CLOSE
        </button>
      </header>

      <div class="yp-scroll flex-1 overflow-y-auto p-5">
        <!-- 图片 -->
        <div v-if="entry.images.length > 0">
          <div class="yp-border-thick relative h-[280px] bg-white">
            <img
              :key="entry.images[imgIdx]"
              :src="imgUrl(entry.images[imgIdx])"
              :alt="entry.name"
              class="yp-pop h-full w-full object-contain"
            />
            <template v-if="entry.images.length > 1">
              <button
                aria-label="上一张"
                class="absolute left-2 top-1/2 -translate-y-1/2 border-2 border-[var(--yp-ink)] bg-white px-2 py-1 font-bold hover:bg-[var(--yp-yellow)]"
                @click="imgIdx = (imgIdx - 1 + entry.images.length) % entry.images.length"
              >
                ◀
              </button>
              <button
                aria-label="下一张"
                class="absolute right-2 top-1/2 -translate-y-1/2 border-2 border-[var(--yp-ink)] bg-white px-2 py-1 font-bold hover:bg-[var(--yp-yellow)]"
                @click="imgIdx = (imgIdx + 1) % entry.images.length"
              >
                ▶
              </button>
            </template>
          </div>
          <div class="mt-2 flex gap-2">
            <button
              v-for="(f, i) in entry.images"
              :key="f"
              class="h-14 w-14 overflow-hidden border-2"
              :class="i === imgIdx ? 'border-[var(--yp-ink)]' : 'border-neutral-400 opacity-70'"
              @click="imgIdx = i"
            >
              <img :src="imgUrl(f)" alt="" class="h-full w-full object-cover" loading="lazy" />
            </button>
          </div>
        </div>
        <div v-else class="yp-border-thick flex h-[160px] items-center justify-center bg-white">
          <p class="yp-label text-xs text-neutral-500">NO IMAGE / 无附图（待采集）</p>
        </div>

        <!-- 元信息 -->
        <dl class="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div v-for="m in meta" :key="m[0]" class="border-b border-[var(--yp-ink)]/40 pb-1">
            <dt class="yp-label text-[10px] text-neutral-600">{{ m[0] }}</dt>
            <dd class="mt-0.5 font-bold">{{ m[1] || '—' }}</dd>
          </div>
        </dl>

        <!-- 摘要 -->
        <section class="mt-5">
          <h4 class="yp-label text-[11px] text-neutral-600">内容摘要 ABSTRACT</h4>
          <p class="mt-1 leading-relaxed">{{ entry.summary || '—' }}</p>
        </section>

        <section v-if="entry.note" class="mt-4">
          <h4 class="yp-label text-[11px] text-neutral-600">备注 NOTE</h4>
          <p class="mt-1 leading-relaxed">{{ entry.note }}</p>
        </section>

        <!-- 标签 -->
        <section class="mt-4">
          <h4 class="yp-label text-[11px] text-neutral-600">标签 TAGS</h4>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <template v-if="tags.pairs.length > 0">
              <span
                v-for="t in tags.pairs"
                :key="t.key + t.value"
                class="yp-label border border-[var(--yp-ink)] bg-white px-2 py-0.5 text-[10px]"
              >
                ＃{{ t.key }}:{{ t.value }}
              </span>
            </template>
            <span v-else class="yp-label text-[10px] text-neutral-500">无</span>
          </div>
        </section>

        <!-- 操作 -->
        <div class="mt-6 flex flex-wrap gap-2">
          <a
            v-if="entry.link"
            :href="entry.link"
            target="_blank"
            rel="noreferrer"
            class="yp-hard-shadow-sm yp-label border-2 border-[var(--yp-ink)] bg-white px-4 py-2 text-xs font-bold hover:bg-[var(--yp-ink)] hover:text-[var(--yp-yellow)]"
          >
            来源链接 SOURCE ↗
          </a>
          <button
            class="yp-hard-shadow-sm yp-label border-2 border-[var(--yp-ink)] bg-white px-4 py-2 text-xs font-bold hover:bg-[var(--yp-ink)] hover:text-[var(--yp-yellow)]"
            @click="emit('locate', entry)"
          >
            在地图上标出 LOCATE
          </button>
        </div>

        <!-- 相关条目 -->
        <section v-if="related.length > 0" class="mt-6">
          <h4 class="yp-label text-[11px] text-neutral-600">相关条目（同感官）RELATED</h4>
          <ul class="mt-2">
            <li v-for="r in related" :key="r.id">
              <button
                class="group flex w-full items-baseline gap-2 border-b border-[var(--yp-ink)]/30 py-1.5 text-left"
                @click="emit('openRelated', r)"
              >
                <span class="font-en text-xs font-bold">{{ r.id }}</span>
                <span class="flex-1 truncate text-sm group-hover:underline">{{ r.name }}</span>
                <span class="font-en text-xs">{{ r.year }}</span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </aside>
  </div>
</template>
