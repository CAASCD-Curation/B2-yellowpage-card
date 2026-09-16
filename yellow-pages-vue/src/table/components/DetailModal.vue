<script setup>
import { computed } from 'vue'
import { statusClass } from '../constants'

const props = defineProps({
  entry: { type: Object, default: null },
  all: { type: Array, required: true },
  galIdx: { type: Number, default: 0 },
})
const emit = defineEmits(['close', 'step', 'goto', 'gal'])

const prefix = computed(() => props.entry?.id.split('-')[0] || '')
const curImg = computed(() =>
  props.entry && props.entry.images.length
    ? `images/${props.entry.images[props.galIdx]}`
    : ''
)
const curIdx = computed(() => (props.entry ? props.all.indexOf(props.entry) : -1))
const prevEntry = computed(() =>
  curIdx.value >= 0
    ? props.all[(curIdx.value - 1 + props.all.length) % props.all.length]
    : null
)
const nextEntry = computed(() =>
  curIdx.value >= 0 ? props.all[(curIdx.value + 1) % props.all.length] : null
)

function stepGal(d) {
  if (!props.entry || !props.entry.images.length) return
  const n = props.entry.images.length
  emit('gal', ((props.galIdx + d) % n + n) % n)
}
function setGal(i) {
  emit('gal', i)
}
</script>

<template>
  <div
    class="modal-mask"
    :class="{ open: entry }"
    role="dialog"
    aria-modal="true"
    @click.self="emit('close')"
  >
    <div v-if="entry" class="modal">
      <div class="modal-gallery">
        <img v-if="curImg" :src="curImg" :alt="entry.name" />
        <div v-else class="noimg">
          <div class="big">{{ prefix }}</div>
          <div class="t">TEXT RECORD · 纯文本档案</div>
        </div>
        <template v-if="entry.images.length > 1">
          <button class="gal-btn gal-prev" aria-label="上一张" @click.stop="stepGal(-1)">‹</button>
          <button class="gal-btn gal-next" aria-label="下一张" @click.stop="stepGal(1)">›</button>
          <div class="gal-dots">
            <i
              v-for="(_, i) in entry.images"
              :key="i"
              :class="{ on: i === galIdx }"
              @click.stop="setGal(i)"
            ></i>
          </div>
          <span class="gal-count">{{ galIdx + 1 }} / {{ entry.images.length }}</span>
        </template>
      </div>

      <div class="modal-body">
        <button class="modal-close" aria-label="关闭" @click="emit('close')">✕</button>
        <span class="eid">{{ entry.id }} · {{ entry.collection }}</span>
        <h2>{{ entry.name }}</h2>
        <div class="typeline">
          <span class="chip">{{ entry.type }}</span>
          <span class="chip">年代 · {{ entry.year }}</span>
          <span class="status-dot" :class="statusClass(entry.status)">
            <i></i>{{ entry.status }}
          </span>
        </div>

        <div class="field">
          <div class="fk">内容摘要</div>
          <div class="fv">{{ entry.summary }}</div>
        </div>
        <div v-if="entry.note" class="field">
          <div class="fk">备注说明</div>
          <div class="fv">{{ entry.note }}</div>
        </div>
        <div class="field">
          <div class="fk">标签</div>
          <div class="tagrow">
            <span v-for="t in entry.tagList" :key="t" class="chip">{{ t }}</span>
            <span v-if="!entry.tagList.length">—</span>
          </div>
        </div>
        <div class="field">
          <div class="fk">出处</div>
          <div class="fv">{{ entry.source || '—' }}</div>
        </div>
        <div class="field">
          <div class="fk">来源链接</div>
          <div class="fv">
            <a
              v-if="entry.link && entry.link.startsWith('http')"
              :href="entry.link"
              target="_blank"
              rel="noopener"
            >{{ entry.link }}</a>
            <template v-else>{{ entry.link || '—' }}</template>
          </div>
        </div>
        <div class="field">
          <div class="fk">采集渠道</div>
          <div class="fv">{{ entry.channel || '—' }}</div>
        </div>

        <button v-if="prevEntry" class="modal-nav mn-prev" @click="emit('goto', prevEntry)">
          ← {{ prevEntry.id }}
        </button>
        <button v-if="nextEntry" class="modal-nav mn-next" @click="emit('goto', nextEntry)">
          {{ nextEntry.id }} →
        </button>
      </div>
    </div>
  </div>
</template>
