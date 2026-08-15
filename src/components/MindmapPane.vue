<template>
  <div class="mindmap-pane">
    <div class="toolbar">
      <el-button @click="load" :loading="loading">刷新</el-button>
    </div>
    <div class="canvas-area">
      <MindmapEditor :data="mindmapData" @node-active="onNodeActive" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onMounted, ref } from 'vue'
import { toMindmapData, type MindmapNode, type NodeType } from '../adapters/tree'
import { fetchTree } from '../api/tree'
import MindmapEditor from './MindmapEditor.vue'

const props = defineProps<{ projectId: number; projectName: string }>()

const mindmapData = ref<MindmapNode | null>(null)
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const modules = await fetchTree(props.projectId)
    mindmapData.value = toMindmapData(props.projectName, modules)
  } catch (e) {
    ElMessage.error(`加载用例树失败:${(e as Error).message}`)
  } finally {
    loading.value = false
  }
}
onMounted(load)

function onNodeActive(_payload: { nodeType: NodeType; refId?: number }) {
  // Task 6 在此挂侧边抽屉
}
</script>

<style scoped>
.mindmap-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.toolbar {
  padding-bottom: 8px;
}
.canvas-area {
  flex: 1;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}
</style>
