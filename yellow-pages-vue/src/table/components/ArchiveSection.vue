<script setup>
import { onMounted, onBeforeUnmount, nextTick, ref, watch } from 'vue'
import ArchiveCard from './ArchiveCard.vue'

const props = defineProps({
  title: { type: String, required: true },
  code: { type: String, required: true },
  subtitle: { type: String, required: true },
  entries: { type: Array, required: true },
})
const emit = defineEmits(['open'])

const gridRef = ref(null)
let io = null

function observeCards() {
  io?.disconnect()
  io = new IntersectionObserver(
    (es) =>
      es.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('shown')
          io.unobserve(en.target)
        }
      }),
    { threshold: 0.08 }
  )
  gridRef.value?.querySelectorAll('.card').forEach((c, i) => {
    setTimeout(() => io.observe(c), Math.min(i % 12, 8) * 30)
  })
}

onMounted(observeCards)
watch(() => props.entries, () => nextTick(observeCards))
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <section class="archive-section" :id="`sec-${title}`">
    <div class="section-head">
      <h2>{{ title }}<span class="code">{{ code }}</span></h2>
      <p>{{ subtitle }}</p>
    </div>
    <div class="grid" ref="gridRef">
      <ArchiveCard v-for="e in entries" :key="e.id" :entry="e" @open="emit('open', $event)" />
    </div>
  </section>
</template>
