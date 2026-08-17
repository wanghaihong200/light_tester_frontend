<template>
  <div class="repo-pane">
    <div v-if="!project.git_repo_url" class="hint">请先在项目列表编辑 git_repo_url</div>
    <template v-else>
      <div class="topbar">
        <el-button :loading="syncing" @click="onSync">同步工程</el-button>
        <span v-if="syncResult" class="sync-info">{{ syncResult.cloned ? '已克隆' : '已更新' }} · {{ syncResult.branch }}@{{ syncResult.commit_short }}</span>
      </div>
      <div class="body">
        <div class="tree">
          <el-tree v-if="treeData.length" :data="treeData" :props="{ label: 'name', children: 'children' }" node-key="path" @node-click="onNodeClick" />
          <div v-else class="placeholder">点击「同步工程」拉取仓库</div>
        </div>
        <div class="editor">
          <div class="file-path">{{ currentPath || '(选择文件)' }}</div>
          <div ref="editorRef" class="monaco-host" />
        </div>
      </div>
      <div class="footer">
        <el-button @click="pushVisible = true">变更文件 {{ changeCount }}</el-button>
      </div>
      <PushDialog v-model:visible="pushVisible" :project-id="projectId" :changes="changes" @pushed="onPushed" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { listChanges, listFiles, readFile, syncRepo } from '../api/repo'
import type { ChangeFile, FileNode, Project } from '../types'
import PushDialog from './PushDialog.vue'

const props = defineProps<{ projectId: number; project: Project }>()
const syncing = ref(false)
const syncResult = ref<{ cloned: boolean; updated: boolean; branch: string; commit_short: string } | null>(null)
const tree = ref<FileNode | { needs_sync: true } | null>(null)
const currentPath = ref('')
const editorRef = ref<HTMLElement | null>(null)
const pushVisible = ref(false)
const changeCount = ref(0)
const changes = ref<ChangeFile[]>([])
let editor: any = null
let monacoMod: any = null

const treeData = computed(() => (tree.value && 'children' in tree.value ? [tree.value] : []))

async function loadFiles() {
  tree.value = await listFiles(props.projectId)
}
async function loadChanges() {
  const r = await listChanges(props.projectId)
  changes.value = r.files
  changeCount.value = r.files.filter((f) => f.status !== 'deleted').length
}
async function onSync() {
  syncing.value = true
  try {
    syncResult.value = await syncRepo(props.projectId)
    ElMessage.success(syncResult.value.cloned ? '已克隆' : '已更新')
    await loadFiles()
    await loadChanges()
  } catch (e) {
    ElMessage.error(`同步失败:${(e as Error).message}`)
  } finally {
    syncing.value = false
  }
}
async function onNodeClick(node: FileNode) {
  if (node.is_dir) return
  currentPath.value = node.path
  const r = await readFile(props.projectId, node.path)
  if (!monacoMod) monacoMod = await import('monaco-editor')
  if (!editor) {
    editor = monacoMod.editor.create(editorRef.value!, { readOnly: true, automaticLayout: true })
  }
  const lang = r.language === 'plaintext' ? 'plaintext' : r.language
  monacoMod.editor.setModelLanguage(editor.getModel()!, lang)
  editor.setValue(r.content)
}
function onPushed() {
  pushVisible.value = false
  loadChanges()
  loadFiles()
}
onMounted(() => { loadFiles(); loadChanges() })
onBeforeUnmount(() => { editor?.dispose() })
watch(() => props.projectId, () => { loadFiles(); loadChanges() })
</script>

<style scoped>
.repo-pane { display: flex; flex-direction: column; height: 100%; }
.hint { padding: 16px; color: #909399; }
.topbar { padding: 8px 0; display: flex; align-items: center; gap: 12px; }
.sync-info { color: #67c23a; }
.body { flex: 1; display: flex; gap: 8px; min-height: 0; }
.tree { width: 260px; overflow: auto; border-right: 1px solid #ebeef5; padding: 4px; }
.editor { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.file-path { padding: 4px 8px; background: #f5f7fa; font-size: 12px; color: #606266; }
.monaco-host { flex: 1; }
.placeholder { color: #c0c4cc; padding: 12px; }
.footer { padding: 8px 0; border-top: 1px solid #ebeef5; }
</style>
