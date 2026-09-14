<script setup lang="ts">
import { computed } from 'vue'
import { archive, SENSES } from '@/lib/archive'
import SenseColumn from './SenseColumn.vue'
import type { CardItem } from './SenseColumn.vue'
import type { Entry } from '@/lib/archive'

const props = defineProps<{
  /** 每个感官过滤后的条目 */
  bySense: Record<string, Entry[]>
}>()
const emit = defineEmits<{ open: [e: Entry] }>()

/**
 * 五感瀑布流（原「老虎机」与「五感索引」合并）：
 * 五列 = 五感，参照 40plus 黄页目录风格排布条目卡片，
 * 每列沿用老虎机的滚动效果 —— 垂直无限循环滚动，
 * 奇偶列方向相反，悬停暂停，滚轮可推一把（带惯性衰减）。
 */
const columns = computed(() =>
  SENSES.map((s, i) => {
    const items: CardItem[] = [
      ...(props.bySense[s] ?? []).map((e) => ({ kind: 'entry', e }) as CardItem),
      ...archive.extEntries
        .filter((x) => x.sense === s)
        .map((x) => ({ kind: 'ext', x }) as CardItem),
    ]
    return { sense: s, items, dir: (i % 2 === 0 ? 1 : -1) as 1 | -1, index: i }
  }),
)
</script>

<template>
  <div
    class="grid grid-cols-1 border-[1.5px] border-[var(--yp-ink)] bg-[var(--yp-paper)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
  >
    <SenseColumn
      v-for="c in columns"
      :key="c.sense"
      :sense="c.sense"
      :index="c.index"
      :items="c.items"
      :dir="c.dir"
      @open="(e) => emit('open', e)"
    />
  </div>
</template>
