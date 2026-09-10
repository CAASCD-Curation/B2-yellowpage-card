<script setup>
import { computed } from 'vue'
import { SHEET_ORDER, TYPE_PILLS } from '../constants'

defineProps({
  state: { type: Object, required: true },
  counts: { type: Object, required: true },
  totalShown: { type: Number, required: true },
})
const emit = defineEmits(['set-col', 'set-type', 'search'])

const colTabs = computed(() => ['全部', ...SHEET_ORDER])
</script>

<template>
  <div class="filterbar">
    <div class="filter-inner">
      <div class="collections">
        <button
          v-for="c in colTabs"
          :key="c"
          :class="{ on: state.col === c }"
          @click="emit('set-col', c)"
        >{{ c }}<small>{{ counts[c] }}</small></button>
      </div>
      <div class="filter-row">
        <div class="typepills">
          <button
            v-for="t in TYPE_PILLS"
            :key="t"
            :class="{ on: state.type === t }"
            @click="emit('set-type', t)"
          >{{ t }}</button>
        </div>
        <span class="count-note">{{ totalShown }} / 200 条</span>
        <input
          class="search"
          type="search"
          placeholder="搜索名称 / 摘要 / 标签…"
          @input="emit('search', $event)"
        />
      </div>
    </div>
  </div>
</template>
