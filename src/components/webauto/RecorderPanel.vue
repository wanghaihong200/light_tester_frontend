<script setup lang="ts">
// 占位组件:录制面板在 Task 8 填充(SSE 接收录制步骤 / 断言模式 / 保存草稿)
defineProps<{ projectId: number }>()
defineEmits<{ (e: 'saved'): void; (e: 'closed'): void }>()
</script>

<template>
  <div class="recorder-panel-placeholder" />
</template>
