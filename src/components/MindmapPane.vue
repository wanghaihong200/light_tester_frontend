<template>
  <div class="mindmap-pane">
    <div class="toolbar">
      <el-button @click="load" :loading="loading">刷新</el-button>
    </div>
    <div class="canvas-area">
      <MindmapEditor :data="mindmapData" @node-active="onNodeActive" />
    </div>
    <el-drawer v-model="drawerVisible" :title="drawerTitle" size="360px" :close-on-click-modal="true" @closed="selected = null">
      <ModuleForm
        v-if="selected?.nodeType === 'module'"
        :key="selected.refId"
        :project-id="projectId"
        :module-id="selected.refId!"
        :initial-name="selectedMeta.name"
        :initial-parent-id="selectedMeta.parentId"
        @saved="onSaved"
        @deleted="onDeleted"
      />
      <FeaturePointForm
        v-else-if="selected?.nodeType === 'feature'"
        :key="selected.refId"
        :feature-point-id="selected.refId!"
        :initial-name="selectedMeta.name"
        @saved="onSaved"
        @deleted="onDeleted"
      />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { toMindmapData, type MindmapNode, type NodeType } from '../adapters/tree'
import { fetchTree } from '../api/tree'
import MindmapEditor from './MindmapEditor.vue'
import ModuleForm from './ModuleForm.vue'
import FeaturePointForm from './FeaturePointForm.vue'

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

const selected = ref<{ nodeType: NodeType; refId?: number } | null>(null)
const selectedMeta = ref<{ name: string; parentId: number | null }>({ name: '', parentId: null })
const drawerVisible = ref(false)

const drawerTitle = computed(() =>
  selected.value?.nodeType === 'module' ? '编辑模块' : selected.value?.nodeType === 'feature' ? '编辑功能点' : '编辑',
)

function onNodeActive(payload: { nodeType: NodeType; refId?: number }) {
  if (payload.nodeType === 'root' || payload.nodeType === 'case') return // case 在 Task 7 接入
  selected.value = payload
  // 从当前树数据里找到该节点名称与父模块(只用于表单初值)
  const found = findModuleMeta(mindmapData.value, payload.refId!)
  selectedMeta.value = found
  drawerVisible.value = true
}

function findModuleMeta(root: MindmapNode | null, refId: number): { name: string; parentId: number | null } {
  // 从导图树回查:遍历 module/feature 节点,记录父 refId
  let result: { name: string; parentId: number | null } = { name: '', parentId: null }
  function walk(node: MindmapNode, parentRefId: number | null) {
    if ((node.data.nodeType === 'module' || node.data.nodeType === 'feature') && node.data.refId === refId) {
      result = { name: node.data.text, parentId: parentRefId }
      return
    }
    node.children.forEach((c) => walk(c, node.data.nodeType === 'module' ? (node.data.refId ?? null) : parentRefId))
  }
  if (root) walk(root, null)
  return result
}

function onSaved() {
  void load() // 保存后整树刷新,选中高亮丢失属 MVP 已接受行为
}
function onDeleted() {
  drawerVisible.value = false
  void load()
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
