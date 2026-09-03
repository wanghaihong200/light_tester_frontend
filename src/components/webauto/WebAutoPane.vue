<template>
  <div class="web-auto">
    <div class="toolbar">
      <el-button type="primary" @click="onRecord">新建录制</el-button>
      <el-button @click="onNewBlank">新建空脚本</el-button>
      <el-button @click="showAuth = true">登录态管理</el-button>
      <el-button :disabled="selected.length === 0" type="success" @click="onBatchRun">
        批量执行({{ selected.length }})
      </el-button>
    </div>

    <el-table v-loading="loading" :data="scripts" border @selection-change="onSelectionChange">
      <el-table-column type="selection" width="44" />
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="脚本名" min-width="160" />
      <el-table-column label="步骤数" width="90">
        <template #default="{ row }">{{ row.script?.steps?.length ?? 0 }}</template>
      </el-table-column>
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ formatTime(row.updated_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="300">
        <template #default="{ row }">
          <el-button size="small" @click="onEdit(row)">编辑</el-button>
          <el-button size="small" type="primary" @click="onRun(row)">执行</el-button>
          <el-button size="small" @click="onHistory(row)">历史</el-button>
          <el-popconfirm title="确认删除该脚本?" @confirm="onDelete(row)">
            <template #reference><el-button size="small" type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <RecorderPanel v-if="recording" :project-id="projectId" @saved="onSaved" @closed="recording = false" />
    <ScriptEditor v-if="editing" :project-id="projectId" :script-row="editing" @saved="onSaved" @closed="editing = null" />
    <RunDialog
      v-if="runQueue.length || history"
      :project-id="projectId"
      :queue="runQueue"
      :history="history"
      @closed="closeRunDialog"
    />
    <AuthStatesPane v-if="showAuth" :project-id="projectId" @closed="showAuth = false" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, ref } from 'vue'
import { createUiScript, deleteUiScript, listUiRuns, listUiScripts } from '../../api/uiAutomation'
import type { UiRun, UiScript } from '../../types'
import AuthStatesPane from './AuthStatesPane.vue'
import RecorderPanel from './RecorderPanel.vue'
import RunDialog from './RunDialog.vue'
import ScriptEditor from './ScriptEditor.vue'

const props = defineProps<{ projectId: number }>()

const scripts = ref<UiScript[]>([])
const selected = ref<UiScript[]>([])
const loading = ref(false)
const recording = ref(false)
const editing = ref<UiScript | null>(null)
const runQueue = ref<{ script: UiScript; mode: 'headless' | 'headed' }[]>([])
const showAuth = ref(false)
// 历史模式:点「历史」拉到该脚本的执行记录后,交给 RunDialog 回看(一期复用,Task 10 填充)
const history = ref<{ script: UiScript; runs: UiRun[] } | null>(null)

async function reload() {
  loading.value = true
  try {
    scripts.value = await listUiScripts(props.projectId)
  } catch (e) {
    ElMessage.error(`加载脚本失败:${(e as Error).message}`)
  } finally {
    loading.value = false
  }
}
onMounted(reload)

function onSelectionChange(rows: UiScript[]) { selected.value = rows }
function onRecord() { recording.value = true }
function onEdit(row: UiScript) { editing.value = row }
// 执行队列与历史模式互斥:RunDialog 只吃其中一路,开一路时清掉另一路
function onRun(row: UiScript) { runQueue.value = [{ script: row, mode: 'headless' }]; history.value = null }
function onBatchRun() {
  runQueue.value = selected.value.map((s) => ({ script: s, mode: 'headless' as const }))
  history.value = null
}
async function onHistory(row: UiScript) {
  runQueue.value = []
  try {
    const runs = await listUiRuns(props.projectId, row.id)
    history.value = { script: row, runs }
  } catch (e) {
    ElMessage.error(`加载执行历史失败:${(e as Error).message}`)
  }
}
function closeRunDialog() { runQueue.value = []; history.value = null }

// 新建空脚本:只给名字,其余走 DSL 默认骨架,进入列表后可继续编辑或录制
async function onNewBlank() {
  let name: string
  try {
    const r = await ElMessageBox.prompt('请输入脚本名称', '新建空脚本', {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '脚本名称不能为空',
    })
    name = r.value.trim()
  } catch {
    return // 用户取消
  }
  try {
    await createUiScript(props.projectId, {
      name,
      script: { version: 1, meta: { start_url: '' }, variables: [], steps: [] },
    })
    ElMessage.success('已创建')
    await reload()
  } catch (e) {
    ElMessage.error(`创建失败:${(e as Error).message}`)
  }
}

async function onDelete(row: UiScript) {
  try {
    await deleteUiScript(row.id)
    ElMessage.success('已删除')
    await reload()
  } catch (e) {
    ElMessage.error(`删除失败:${(e as Error).message}`)
  }
}
function onSaved() { recording.value = false; editing.value = null; reload() }

function formatTime(iso: string): string {
  return iso ? new Date(iso).toLocaleString('zh-CN', { hour12: false }) : '-'
}
</script>

<style scoped>
.web-auto {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 4px 0;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
