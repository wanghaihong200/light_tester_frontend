<script setup lang="ts">
// 占位组件:脚本编辑器在 Task 9 填充(步骤表格 / 变量表 / 保存)
import type { UiScript } from '../../types'

defineProps<{ projectId: number; scriptRow: UiScript }>()
defineEmits<{ (e: 'saved'): void; (e: 'closed'): void }>()
</script>

<template>
  <div class="script-editor-placeholder" />
</template>
