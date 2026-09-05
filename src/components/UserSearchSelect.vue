<script setup lang="ts">
import { ref } from 'vue'
import { usersApi, type UserSearchItem } from '../api/users'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const options = ref<UserSearchItem[]>([])
const loading = ref(false)

async function remoteMethod(q: string) {
  loading.value = true
  try {
    options.value = await usersApi.search(q)
  } finally {
    loading.value = false
  }
}

function onChange(v: string) {
  emit('update:modelValue', v)
}
</script>

<template>
  <el-select
    :model-value="props.modelValue"
    filterable
    remote
    :remote-method="remoteMethod"
    :loading="loading"
    placeholder="输入用户名搜索"
    data-test="user-search"
    @update:model-value="onChange"
  >
    <el-option
      v-for="o in options"
      :key="o.id"
      :label="`${o.display_name} (${o.username})`"
      :value="o.username"
    />
    <template #empty>
      <span class="search-empty">无匹配用户</span>
    </template>
  </el-select>
</template>

<style scoped>
/* 主题无 --pro-text-3,按 theme.css 静音文字 token 对齐(--pro-muted) */
.search-empty {
  color: var(--pro-muted, #909399);
  font-size: 13px;
}
</style>
