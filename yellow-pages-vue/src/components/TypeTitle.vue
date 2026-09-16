<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

/** 打字机登场标题（全站主标题统一，DESIGN §4.2 / §6.3） */
const props = withDefaults(
  defineProps<{
    text: string
    /** ms/字符，DESIGN：40–70 */
    speed?: number
    /** 开始前延迟 ms */
    delay?: number
    className?: string
    /** 完成后是否保留光标（默认打完即收，避免残留闪烁） */
    keepCaret?: boolean
  }>(),
  { speed: 60, delay: 0, className: '', keepCaret: false },
)
const emit = defineEmits<{ done: [] }>()

const n = ref(0)
const caretOff = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let doneFired = false

watch(
  () => [props.text, props.speed, props.delay],
  () => {
    clearTimeout(timer)
    n.value = 0
    caretOff.value = false
    doneFired = false
    let i = 0
    const tick = () => {
      i += 1
      n.value = i
      if (i < props.text.length) {
        timer = setTimeout(tick, props.speed)
      } else if (!doneFired) {
        doneFired = true
        emit('done')
        /* 打完即收光标，避免残留闪烁（闪动 bug 修复） */
        if (!props.keepCaret) caretOff.value = true
      }
    }
    timer = setTimeout(tick, props.delay + props.speed)
  },
  { immediate: true },
)

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <span :class="className" :aria-label="text">
    <span aria-hidden="true">{{ text.slice(0, n) }}</span>
    <span v-if="!caretOff" class="yp-caret" aria-hidden="true" />
  </span>
</template>
