<template>
  <div class="project-view">
    <div class="header">
      <el-button @click="$router.push('/')">← 项目列表</el-button>
      <h3 style="margin: 0 12px">{{ project?.name ?? (loaded ? '项目不存在' : '加载中…') }}</h3>
      <span v-if="project?.description" style="color: #909399">{{ project.description }}</span>
    </div>
    <el-tabs v-model="tab" class="tabs">
      <el-tab-pane label="用例导图" name="mindmap">
        <MindmapPane v-if="project" :key="mindmapKey" :project-id="project.id" :project-name="project.name" />
      </el-tab-pane>
      <el-tab-pane label="文档库" name="documents">
        <DocumentsPane v-if="project" :project-id="project.id" />
      </el-tab-pane>
      <el-tab-pane label="生成任务" name="jobs">
        <JobsPane v-if="project" :project-id="project.id" :project="project" @staging-accepted="onStagingAccepted" />
      </el-tab-pane>
      <el-tab-pane label="自动化工程" name="repo">
        <RepoPane v-if="project && tab === 'repo'" :project-id="project.id" :project="project" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import DocumentsPane from '../components/DocumentsPane.vue'
import JobsPane from '../components/JobsPane.vue'
import MindmapPane from '../components/MindmapPane.vue'
import RepoPane from '../components/RepoPane.vue'
import { listProjects } from '../api/projects'
import type { Project } from '../types'

const route = useRoute()
const project = ref<Project | null>(null)
const loaded = ref(false)
const tab = ref('mindmap')
const mindmapKey = ref(0)
const mindmapDirty = ref(false)

// 转正后导图需重挂刷新;但导图 tab 隐藏时容器 display:none 尺寸为 0,
// simple-mind-map 构造会抛"容器元素el的宽高不能为0"——推迟到 tab 激活时再重挂
function onStagingAccepted() {
  if (tab.value === 'mindmap') {
    mindmapKey.value++
  } else {
    mindmapDirty.value = true
  }
}

watch(tab, (t) => {
  if (t === 'mindmap' && mindmapDirty.value) {
    mindmapDirty.value = false
    mindmapKey.value++
  }
})

onMounted(async () => {
  try {
    const id = Number(route.params.id)
    const all = await listProjects()
    project.value = all.find((p) => p.id === id) ?? null
    if (!project.value) ElMessage.error('项目不存在')
  } catch (e) {
    ElMessage.error(`加载项目失败:${(e as Error).message}`)
  } finally {
    loaded.value = true
  }
})
</script>

<style scoped>
.project-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.header {
  display: flex;
  align-items: center;
  padding: 12px 16px 0;
}
.tabs {
  flex: 1;
  padding: 0 16px 12px;
  display: flex;
  flex-direction: column;
}
.tabs :deep(.el-tabs__content) {
  flex: 1;
}
.tabs :deep(.el-tab-pane) {
  height: 100%;
}
</style>
