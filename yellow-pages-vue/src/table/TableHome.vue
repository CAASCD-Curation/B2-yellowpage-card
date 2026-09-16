<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue'
import {
  SHEET_ORDER,
  SHEET_EN,
  TYPE_GROUPS,
  TYPE_PILLS,
  loadData,
} from './constants'
import SiteHeader from './components/SiteHeader.vue'
import StatsTicker from './components/StatsTicker.vue'
import FilterBar from './components/FilterBar.vue'
import ArchiveSection from './components/ArchiveSection.vue'
import DetailModal from './components/DetailModal.vue'

const DATA = ref(null)
const ALL = ref([])
const state = reactive({ col: '全部', type: '全部', q: '' })
const modalEntry = ref(null)
const galIdx = ref(0)

const colCounts = computed(() => {
  const counts = { 全部: ALL.value.length }
  if (DATA.value) {
    SHEET_ORDER.forEach((c) => (counts[c] = DATA.value[c].entries.length))
  }
  return counts
})

function matches(e) {
  if (state.col !== '全部' && e.collection !== state.col) return false
  if (state.type !== '全部' && !TYPE_GROUPS[state.type].includes(e.type)) return false
  if (state.q) {
    const hay = (e.name + ' ' + e.summary + ' ' + e.tags + ' ' + e.source + ' ' + e.id).toLowerCase()
    if (!hay.includes(state.q.toLowerCase())) return false
  }
  return true
}

const sections = computed(() => {
  if (!DATA.value) return []
  const list = []
  SHEET_ORDER.forEach((col) => {
    if (state.col !== '全部' && state.col !== col) return
    const entries = DATA.value[col].entries.filter(matches)
    if (!entries.length) return
    list.push({ col, subtitle: DATA.value[col].subtitle, entries })
  })
  return list
})

const totalShown = computed(() =>
  sections.value.reduce((n, s) => n + s.entries.length, 0)
)

function setCol(col, scrollTop = false) {
  state.col = col
  if (scrollTop) window.scrollTo({ top: 0, behavior: 'smooth' })
}

let debTimer
function onSearch(ev) {
  clearTimeout(debTimer)
  debTimer = setTimeout(() => {
    state.q = ev.target.value.trim()
  }, 180)
}

function openModal(eid) {
  modalEntry.value = ALL.value.find((e) => e.id === eid) || null
  galIdx.value = 0
  document.body.style.overflow = 'hidden'
}
function closeModal() {
  modalEntry.value = null
  document.body.style.overflow = ''
}
function stepEntry(d) {
  if (!modalEntry.value) return
  const i = ALL.value.indexOf(modalEntry.value)
  modalEntry.value = ALL.value[(i + d + ALL.value.length) % ALL.value.length]
  galIdx.value = 0
}
function onKey(ev) {
  if (!modalEntry.value) return
  if (ev.key === 'Escape') closeModal()
  if (ev.key === 'ArrowRight') stepEntry(1)
  if (ev.key === 'ArrowLeft') stepEntry(-1)
}

onMounted(async () => {
  const { data, all } = await loadData()
  DATA.value = data
  ALL.value = all
  // deep link: #ART-08 直接打开对应卡片
  const h = decodeURIComponent(location.hash.slice(1))
  if (h && all.some((e) => e.id === h)) openModal(h)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <SiteHeader :state="state" @set-col="setCol($event, true)" />

  <StatsTicker v-if="ALL.length" :all="ALL" />

  <FilterBar
    :state="state"
    :counts="colCounts"
    :total-shown="totalShown"
    @set-col="setCol($event)"
    @set-type="state.type = $event"
    @search="onSearch"
  />

  <main>
    <ArchiveSection
      v-for="s in sections"
      :key="s.col"
      :title="s.col"
      :code="SHEET_EN[s.col]"
      :subtitle="s.subtitle"
      :entries="s.entries"
      @open="openModal"
    />
    <div v-if="DATA && !sections.length" class="empty">
      NO RECORDS FOUND · 没有符合条件的档案
    </div>
  </main>

  <footer>
    <div class="fp">LET YOUR FINGERS DO THE WALKING</div>
    黄页经典艺术档案 · 采集结构与标签体系 · 200 条 / 4 个角度
  </footer>

  <DetailModal
    :entry="modalEntry"
    :all="ALL"
    :gal-idx="galIdx"
    @close="closeModal"
    @step="stepEntry"
    @goto="modalEntry = $event; galIdx = 0"
    @gal="galIdx = $event"
  />
</template>
