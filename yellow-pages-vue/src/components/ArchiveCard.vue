<script setup>
import { computed } from 'vue'
import { statusClass } from '../constants'

const props = defineProps({
  entry: { type: Object, required: true },
})
const emit = defineEmits(['open'])

const prefix = computed(() => props.entry.id.split('-')[0])
const chips = computed(() => props.entry.tagList.slice(0, 2))
</script>

<template>
  <article class="card" @click="emit('open', entry.id)">
    <div class="frame">
      <img
        v-if="entry.images.length"
        :src="`images/${entry.images[0]}`"
        :alt="entry.name"
        loading="lazy"
      />
      <template v-else>
        <span class="placeholder">{{ prefix }}</span>
        <span class="ph-mono">{{ entry.type }} · NO IMAGE</span>
      </template>
      <span v-if="entry.images.length > 1" class="multi">×{{ entry.images.length }}</span>
      <div class="overlay">{{ entry.summary }}</div>
    </div>
    <div class="caption">
      <div class="row1">
        <span class="eid">{{ entry.id }}</span>
        <span class="year">{{ entry.year }}</span>
      </div>
      <h3>{{ entry.name }}</h3>
      <div class="meta">
        <span class="chip">{{ entry.type }}</span>
        <span v-for="t in chips" :key="t" class="chip">{{ t }}</span>
        <span class="status-dot" :class="statusClass(entry.status)">
          <i></i>{{ entry.status }}
        </span>
      </div>
    </div>
  </article>
</template>
