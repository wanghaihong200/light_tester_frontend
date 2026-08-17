<template>
  <el-dialog :model-value="visible" @update:model-value="$emit('update:visible', $event)" title="推送变更到分支" width="560px">
    <div>推送功能将在后续启用</div>
  </el-dialog>
</template>
<script setup lang="ts">
import type { ChangeFile } from '../types'

defineProps<{ visible: boolean; projectId: number; changes?: ChangeFile[] }>()
defineEmits<{ 'update:visible': [boolean]; pushed: [] }>()
</script>
