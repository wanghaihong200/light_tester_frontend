<template>
  <header class="top-header">
    <button class="collapse-btn" :title="collapsed ? '展开侧栏' : '收起侧栏'" @click="emit('toggle-collapse')">☰</button>
    <nav class="crumb">
      <span class="crumb-link" @click="emit('navigate', '/')">首页</span>
      <template v-if="projectName">
        <span class="crumb-sep">/</span>
        <span class="crumb-current">{{ projectName }}</span>
      </template>
    </nav>
  </header>
</template>

<script setup lang="ts">
defineProps<{ projectName?: string; collapsed: boolean }>()
const emit = defineEmits<{ (e: 'navigate', path: string): void; (e: 'toggle-collapse'): void }>()
</script>

<style scoped>
.top-header {
  align-items: center;
  backdrop-filter: blur(18px);
  background: var(--pro-topbar-bg);
  border-bottom: 1px solid rgba(223, 229, 244, 0.84);
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  height: 48px;
  padding: 0 16px;
}
.collapse-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 6px;
}
.crumb {
  align-items: center;
  color: var(--pro-muted);
  display: flex;
  font-size: 13px;
  gap: 8px;
}
.crumb-link {
  cursor: pointer;
}
.crumb-link:hover {
  color: var(--el-color-primary);
}
.crumb-current {
  color: var(--el-text-color-primary);
  font-weight: 600;
}
</style>
