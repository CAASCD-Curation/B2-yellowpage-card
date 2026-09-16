<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { mapDots } from '@/lib/cards'
import WalkingFingers from '@/components/WalkingFingers.vue'

/**
 * P1 黑白线稿地球（XYZ 三轴互动版）：
 * 正交投影 + 真三维旋转（Rx 俯仰 / Ry 自转 / Rz 翻滚）；
 * 闲置时缓慢自动旋转 + 极轻呼吸俯仰，拖拽/滚轮即刻接管，松手后惯性衰减并平滑回归自转；
 * 陆地纯黑剪影 + 细经纬网格（P1 风格）；行走手指贴球面前侧迈步，波纹自指尖脚下泛起。
 */
const props = withDefaults(defineProps<{ size?: number }>(), { size: 340 })
const size = props.size

const canvasRef = ref<HTMLCanvasElement | null>(null)
const rippleBoxRef = ref<HTMLDivElement | null>(null)

let rx = -0.28 // 俯仰
let ry = 0.6 // 自转
let rz = 0 // 翻滚
let vx = 0
let vy = 0
let dragging = false
let lastX = 0
let lastY = 0
let autoBlend = 1 // 自动旋转恢复系数（拖拽时 0，松手后平滑回到 1）
let breath = 0 // 呼吸俯仰相位
let squashN = 0

let cleanupDraw: (() => void) | null = null
let cleanupInput: (() => void) | null = null

onMounted(() => {
  const cv = canvasRef.value!
  const ctx = cv.getContext('2d')!
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  cv.width = size * dpr
  cv.height = size * dpr
  const R = size * 0.42
  const C = size / 2
  const INK = '#141414'

  let raf = 0
  let last = performance.now()
  let stepT = 0

  /** 单位球面点 → 旋转 → 屏幕坐标；返回 [x, y, z]（z>0 为正面）
   *  俯仰角叠加呼吸微摆，让自动旋转更有质感 */
  const project = (lonDeg: number, latDeg: number): [number, number, number] => {
    const th = (lonDeg * Math.PI) / 180
    const ph = (latDeg * Math.PI) / 180
    let x = Math.cos(ph) * Math.sin(th)
    let y = Math.sin(ph)
    let z = Math.cos(ph) * Math.cos(th)
    // Ry（自转轴）
    const cy = Math.cos(ry)
    const sy = Math.sin(ry)
    ;[x, z] = [x * cy + z * sy, -x * sy + z * cy]
    // Rx（俯仰 + 呼吸微摆）
    const rxEff = rx + Math.sin(breath) * 0.02
    const cx = Math.cos(rxEff)
    const sx = Math.sin(rxEff)
    ;[y, z] = [y * cx - z * sx, y * sx + z * cx]
    // Rz（翻滚）
    const cz = Math.cos(rz)
    const sz = Math.sin(rz)
    ;[x, y] = [x * cz - y * sz, x * sz + y * cz]
    return [R * x, -R * y, z]
  }

  /** 画一条球面折线：正面实、背面淡 */
  const strokeGraticule = (pts: [number, number, number][]) => {
    for (const pass of [0, 1] as const) {
      ctx.beginPath()
      let pen = false
      for (const [x, y, z] of pts) {
        const front = z > 0
        if ((pass === 1) === front) {
          if (pen) ctx.lineTo(x, y)
          else ctx.moveTo(x, y)
          pen = true
        } else {
          pen = false
        }
      }
      ctx.globalAlpha = pass === 1 ? 0.85 : 0.14
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  const draw = (now: number) => {
    const dt = Math.min(50, now - last)
    last = now

    /* 惯性阻尼 + 基础自动旋转（松手后 smoothstep 平滑接管） */
    if (!dragging) {
      ry += vx * dt
      rx += vy * dt
      vx *= Math.pow(0.95, dt / 16.7)
      vy *= Math.pow(0.95, dt / 16.7)
      autoBlend = Math.min(1, autoBlend + dt / 1600)
      const t = autoBlend
      const b = t * t * (3 - 2 * t) // smoothstep 缓入
      ry += 0.00021 * dt * b // 恒定缓慢自转
      rx += (-0.28 - rx) * 0.0008 * dt * b // 缓慢回正俯仰
      breath += dt * 0.00045 // 呼吸微摆相位
    }

    /* 落指节拍：0.8s 两步，球面轻微下压回弹 + 波纹自指尖脚下泛起 */
    stepT += dt
    if (stepT > 800) {
      stepT = 0
      squashN = 1
      const box = rippleBoxRef.value
      if (box) {
        for (const d of [0, 180]) {
          const ring = document.createElement('span')
          ring.className = 'yp-ripple absolute rounded-full border-2 border-[var(--yp-ink)]'
          ring.style.cssText = `left:50%;top:82%;width:${size * 0.44}px;height:${size * 0.14}px;animation-delay:${d}ms;opacity:0;transform:translate(-50%,-50%) scale(0.15)`
          box.appendChild(ring)
          setTimeout(() => ring.remove(), 1400)
        }
      }
    }
    squashN *= Math.pow(0.9, dt / 16.7)
    const squash = squashN * 3

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)
    ctx.save()
    ctx.translate(C, C + squash / 2)
    ctx.scale(1, 1 - squash / R / 2)

    /* 球体轮廓 */
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(0, 0, R, 0, Math.PI * 2)
    ctx.stroke()

    /* 纬线（P1 细密网格，真三维投影折线） */
    ctx.lineWidth = 0.6
    for (let lat = -75; lat <= 75; lat += 15) {
      const pts: [number, number, number][] = []
      for (let lon = 0; lon <= 360; lon += 6) pts.push(project(lon, lat))
      strokeGraticule(pts)
    }
    /* 经线 */
    for (let lon = 0; lon < 360; lon += 15) {
      const pts: [number, number, number][] = []
      for (let lat = -90; lat <= 90; lat += 6) pts.push(project(lon, lat))
      strokeGraticule(pts)
    }

    /* 陆地纯黑剪影（P1：实心填充，非网点） */
    ctx.fillStyle = INK
    for (let i = 0; i < mapDots.length; i++) {
      const [lon, lat] = mapDots[i]
      const [x, y, z] = project(lon, lat)
      if (z <= 0.02) continue
      ctx.fillRect(x - 1.6, y - 1.6, 3.2, 3.2)
    }
    ctx.restore()
    raf = requestAnimationFrame(draw)
  }
  raf = requestAnimationFrame(draw)
  cleanupDraw = () => cancelAnimationFrame(raf)

  /* 拖拽旋转 X/Y 轴 + 滚轮 Z 轴翻滚 */
  const down = (ev: PointerEvent) => {
    dragging = true
    autoBlend = 0 /* 拖拽即刻接管，自转平滑归零 */
    lastX = ev.clientX
    lastY = ev.clientY
    cv.setPointerCapture(ev.pointerId)
  }
  const move = (ev: PointerEvent) => {
    if (!dragging) return
    const dx = ev.clientX - lastX
    const dy = ev.clientY - lastY
    lastX = ev.clientX
    lastY = ev.clientY
    ry -= dx * 0.006 // 水平拖 → 绕 Y 自转
    rx += dy * 0.006 // 垂直拖 → 绕 X 俯仰
    rx = Math.max(-1.4, Math.min(1.4, rx))
    vx = -dx * 0.006 * 8
    vy = dy * 0.006 * 8
  }
  const up = () => {
    dragging = false
  }
  const wheel = (ev: WheelEvent) => {
    ev.preventDefault()
    rz += (ev.deltaY > 0 ? 1 : -1) * 0.09 // 滚轮 → 绕 Z 翻滚
  }
  cv.addEventListener('pointerdown', down)
  cv.addEventListener('pointermove', move)
  cv.addEventListener('pointerup', up)
  cv.addEventListener('pointercancel', up)
  cv.addEventListener('wheel', wheel, { passive: false })
  cleanupInput = () => {
    cv.removeEventListener('pointerdown', down)
    cv.removeEventListener('pointermove', move)
    cv.removeEventListener('pointerup', up)
    cv.removeEventListener('pointercancel', up)
    cv.removeEventListener('wheel', wheel)
  }
})

onBeforeUnmount(() => {
  cleanupDraw?.()
  cleanupInput?.()
})
</script>

<template>
  <div class="relative" :style="{ width: size + 'px', height: size * 1.08 + 'px' }">
    <canvas
      ref="canvasRef"
      :style="{ width: size + 'px', height: size + 'px' }"
      class="cursor-grab touch-none active:cursor-grabbing"
      aria-label="线稿地球：拖拽绕 X/Y 轴旋转，滚轮绕 Z 轴翻滚"
    />
    <!-- 贴球面行走的手指（前侧） -->
    <div class="pointer-events-none absolute left-1/2 top-[62%] -translate-x-1/2">
      <div class="yp-step">
        <WalkingFingers :size="size * 0.22" clean />
      </div>
    </div>
    <!-- 波纹层 -->
    <div ref="rippleBoxRef" class="pointer-events-none absolute inset-0 overflow-visible" />
  </div>
</template>
