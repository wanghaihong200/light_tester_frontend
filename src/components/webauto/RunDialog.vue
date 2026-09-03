<script setup lang="ts">
// 占位组件:执行/历史对话框在 Task 10 填充(执行队列逐步回放 + 历史模式回看每步截图)
import type { UiRun, UiScript } from '../../types'

defineProps<{
  projectId: number
  queue?: { script: UiScript; mode: 'headless' | 'headed' }[]
  history?: { script: UiScript; runs: UiRun[] } | null
}>()
defineEmits<{ (e: 'closed'): void }>()
</script>

<template>
  <div class="run-dialog-placeholder" />
</template>
