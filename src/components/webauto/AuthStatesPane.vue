<script setup lang="ts">
// 占位组件:登录态管理在 Task 11 填充(采集 / 列表 / 删除)
defineProps<{ projectId: number }>()
defineEmits<{ (e: 'closed'): void }>()
</script>

<template>
  <div class="auth-states-placeholder" />
</template>
