<template>
  <div class="jobs-pane">
    <div class="toolbar">
      <el-button type="primary" @click="dialogVisible = true">+ 发起生成</el-button>
    </div>

    <el-table :data="jobs" v-loading="loading" border>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="document_name" label="文档" min-width="160" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="model" label="模型" width="120" />
      <el-table-column label="tokens" width="140">
        <template #default="{ row }">{{ row.input_tokens }}/{{ row.output_tokens }}</template>
      </el-table-column>
      <el-table-column label="费用" width="100">
        <template #default="{ row }">${{ row.cost_usd.toFixed(4) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button size="small" @click="openDrawer(row)">进度</el-button>
          <el-button v-if="row.status === 'completed'" size="small" @click="openStaging(row)">暂存区</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 发起对话框 -->
    <el-dialog v-model="dialogVisible" title="发起生成任务" width="480">
      <el-form label-width="80px">
        <el-form-item label="任务类型">
          <el-radio-group v-model="jobType">
            <el-radio value="case_generation">用例生成</el-radio>
            <el-radio value="api_generation">接口生成</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="文档">
          <el-select v-model="selectedDocId" placeholder="选择文档" style="width: 100%">
            <el-option v-for="d in documents" :key="d.id" :label="d.filename" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="模块">
          <el-select v-model="selectedModId" placeholder="选择目标模块" style="width: 100%">
            <el-option v-for="m in flatModules" :key="m.id" :label="indentModule(m)" :value="m.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!selectedDocId || !selectedModId" :loading="submitting" @click="submitCreate">发起</el-button>
      </template>
    </el-dialog>

    <!-- 进度抽屉 -->
    <el-drawer v-model="drawerVisible" :title="'任务 #' + (drawerJob?.id ?? '') + ' 进度'" size="50%" @close="onDrawerClose">
      <div v-if="drawerJob">
        <p>状态: <el-tag :type="statusTagType(drawerStatus)">{{ statusText(drawerStatus) }}</el-tag></p>
        <p v-if="stageText" class="stage-text">{{ stageText }}</p>
        <p v-if="drawerJob.error">{{ drawerJob.error }}</p>
        <pre v-if="drawerStream" class="stream-output">{{ drawerStream }}</pre>
      </div>
    </el-drawer>

    <!-- 暂存区抽屉 -->
    <el-drawer v-model="stagingDrawer" title="暂存区" size="70%">
      <StagingPane
        v-if="stagingDrawer"
        :job-id="stagingJobId"
        @close="stagingDrawer = false"
        @accepted="onStagingAccepted"
      />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { createJob, listJobs, subscribeJobEvents } from '../api/jobs'
import { listDocuments } from '../api/documents'
import { fetchTree } from '../api/tree'
import { flattenModules } from '../adapters/tree'
import StagingPane from './StagingPane.vue'
import type { DocumentItem, GenerationJob, JobStatus, ModuleNode, Project, SSEEvent } from '../types'

const props = defineProps<{ projectId: number; project?: Project | null }>()

const emit = defineEmits<{ (e: 'staging-accepted'): void }>()

const jobs = ref<GenerationJob[]>([])
const documents = ref<DocumentItem[]>([])
const modules = ref<ModuleNode[]>([])
const flatModules = computed(() => flattenModules(modules.value))
const loading = ref(false)

const dialogVisible = ref(false)
const selectedDocId = ref<number | null>(null)
const selectedModId = ref<number | null>(null)
const submitting = ref(false)
const jobType = ref<'case_generation' | 'api_generation'>('case_generation')

const drawerVisible = ref(false)
const drawerJob = ref<GenerationJob | null>(null)
const drawerStatus = ref<JobStatus>('pending')
const drawerStream = ref('')
const stageText = ref('')
const closeSSE = ref<(() => void) | null>(null)

const stagingDrawer = ref(false)
const stagingJobId = ref(0)

const statusMap: Record<JobStatus, string> = { pending: '待执行', running: '执行中', completed: '已完成', failed: '失败' }
const tagMap: Record<JobStatus, string> = { pending: 'info', running: 'warning', completed: 'success', failed: 'danger' }

function statusText(s: JobStatus) { return statusMap[s] ?? s }
function statusTagType(s: JobStatus) { return tagMap[s] ?? 'info' }
function indentModule(m: { name: string; depth: number }) { return '　'.repeat(m.depth) + m.name }

async function loadJobs() {
  loading.value = true
  try {
    jobs.value = await listJobs(props.projectId)
  } catch (e) {
    ElMessage.error(`加载任务列表失败:${(e as Error).message}`)
  } finally {
    loading.value = false
  }
}

async function loadDocuments() {
  try {
    documents.value = await listDocuments(props.projectId)
  } catch (e) {
    ElMessage.error(`加载文档失败:${(e as Error).message}`)
  }
}

async function loadTree() {
  try {
    modules.value = await fetchTree(props.projectId)
  } catch (e) {
    ElMessage.error(`加载模块树失败:${(e as Error).message}`)
  }
}

onMounted(() => {
  Promise.all([loadJobs(), loadDocuments(), loadTree()])
})

function disconnectSSE() {
  if (closeSSE.value) {
    closeSSE.value()
    closeSSE.value = null
  }
}

function openDrawer(job: GenerationJob) {
  disconnectSSE()
  drawerJob.value = job
  drawerStatus.value = job.status
  drawerStream.value = ''
  stageText.value = ''
  drawerVisible.value = true
  if (job.status !== 'completed' && job.status !== 'failed') {
    const close = subscribeJobEvents(job.id, onEvent)
    closeSSE.value = close
  }
}

function onDrawerClose() {
  disconnectSSE()
}

function onEvent(e: SSEEvent) {
  if (!drawerJob.value) return
  if (e.type === 'status') {
    drawerStatus.value = e.status
    const job = jobs.value.find(j => j.id === drawerJob.value!.id)
    if (job) job.status = e.status
  } else if (e.type === 'delta') {
    drawerStream.value += e.text
  } else if (e.type === 'stage') {
    if (e.stage === 'compiling') stageText.value = '编译中…'
    else if (e.stage === 'fixing') stageText.value = `修复第 ${e.round ?? 1} 轮…`
  } else if (e.type === 'done') {
    drawerStatus.value = 'completed'
    const doneJob = jobs.value.find(j => j.id === drawerJob.value!.id)
    if (doneJob) { doneJob.status = 'completed' }
    if (e.files_count !== undefined) {
      stageText.value = `生成 ${e.files_count} 个文件`
      drawerStream.value += `完成,共 ${e.files_count} 个文件\n`
      ElMessage.success(`任务完成,共 ${e.files_count} 个文件`)
    } else {
      const cnt = e.staged_count ?? 0
      stageText.value = `生成 ${cnt} 条暂存用例`
      drawerStream.value += `完成,共 ${cnt} 条暂存用例\n`
      ElMessage.success(`任务完成,共 ${cnt} 条暂存用例`)
    }
    loadJobs() // 刷新 tokens/费用等终值(本地只同步过状态)
    disconnectSSE()
  } else if (e.type === 'error') {
    drawerStatus.value = 'failed'
    const errJob = jobs.value.find(j => j.id === drawerJob.value!.id)
    if (errJob) { errJob.status = 'failed'; errJob.error = e.message }
    ElMessage.error(e.message)
    disconnectSSE()
  }
}

async function submitCreate() {
  if (!selectedDocId.value || !selectedModId.value) return
  if (jobType.value === 'api_generation' && !props.project?.git_repo_url) {
    ElMessage.error('请先配置 git_repo_url')
    return
  }
  submitting.value = true
  try {
    const newJob = await createJob(props.projectId, {
      documentId: selectedDocId.value,
      targetModuleId: selectedModId.value,
      jobType: jobType.value,
    })
    ElMessage.success('已发起生成任务')
    dialogVisible.value = false
    selectedDocId.value = null
    selectedModId.value = null
    jobType.value = 'case_generation'
    await loadJobs()
    openDrawer(newJob)
  } catch (e) {
    ElMessage.error(`发起失败:${(e as Error).message}`)
  } finally {
    submitting.value = false
  }
}

// Task 9: 打开暂存区面板
function openStaging(job: GenerationJob) {
  stagingJobId.value = job.id
  stagingDrawer.value = true
}

function onStagingAccepted() {
  emit('staging-accepted')
}

onBeforeUnmount(() => {
  disconnectSSE()
})
</script>

<style scoped>
.jobs-pane {
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.toolbar {
  display: flex;
  align-items: center;
}
.stream-output {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  white-space: pre-wrap;
  font-size: 13px;
  max-height: 400px;
  overflow-y: auto;
}
.stage-text {
  color: #e6a23c;
  font-weight: 500;
}
</style>
