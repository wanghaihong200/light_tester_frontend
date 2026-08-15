<template>
  <div class="project-view">
    <div class="header">
      <el-button @click="$router.push('/')">← 项目列表</el-button>
      <h3 style="margin: 0 12px">{{ project?.name ?? '加载中…' }}</h3>
      <span v-if="project?.description" style="color: #909399">{{ project.description }}</span>
    </div>
    <el-tabs v-model="tab" class="tabs">
      <el-tab-pane label="用例导图" name="mindmap">
        <MindmapPane v-if="project" :project-id="project.id" :project-name="project.name" />
      </el-tab-pane>
      <el-tab-pane label="文档库" name="documents">
        <DocumentsPane v-if="project" :project-id="project.id" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import DocumentsPane from '../components/DocumentsPane.vue'
import MindmapPane from '../components/MindmapPane.vue'
import { listProjects } from '../api/projects'
import type { Project } from '../types'

const route = useRoute()
const project = ref<Project | null>(null)
const tab = ref('mindmap')

onMounted(async () => {
  try {
    const id = Number(route.params.id)
    const all = await listProjects()
    project.value = all.find((p) => p.id === id) ?? null
    if (!project.value) ElMessage.error('项目不存在')
  } catch (e) {
    ElMessage.error(`加载项目失败:${(e as Error).message}`)
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
