<template>
  <div class="page">
    <h2>测试平台 · 项目</h2>
    <el-button class="new-project" type="primary" @click="openCreate">新建项目</el-button>
    <el-table :data="projects" v-loading="loading" border>
      <el-table-column prop="name" label="名称" min-width="160" />
      <el-table-column prop="description" label="描述" min-width="240" show-overflow-tooltip />
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button size="small" @click="$router.push(`/projects/${row.id}`)">进入</el-button>
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑项目' : '新建项目'" width="480px">
      <el-form label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" maxlength="100" placeholder="项目名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, ref } from 'vue'
import { createProject, deleteProject, listProjects, updateProject } from '../api/projects'
import type { Project } from '../types'

const projects = ref<Project[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const editing = ref<Project | null>(null)
const form = ref({ name: '', description: '' })

async function load() {
  loading.value = true
  try {
    projects.value = await listProjects()
  } catch (e) {
    ElMessage.error(`加载项目失败:${(e as Error).message}`)
  } finally {
    loading.value = false
  }
}
onMounted(load)

function openCreate() {
  editing.value = null
  form.value = { name: '', description: '' }
  dialogVisible.value = true
}
function openEdit(p: Project) {
  editing.value = p
  form.value = { name: p.name, description: p.description ?? '' }
  dialogVisible.value = true
}

async function save() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入项目名称')
    return
  }
  saving.value = true
  try {
    if (editing.value) await updateProject(editing.value.id, { name: form.value.name.trim(), description: form.value.description || null })
    else await createProject({ name: form.value.name.trim(), description: form.value.description || null })
    dialogVisible.value = false
    await load()
  } catch (e) {
    ElMessage.error(`保存失败:${(e as Error).message}`)
  } finally {
    saving.value = false
  }
}

async function onDelete(p: Project) {
  try {
    await ElMessageBox.confirm(`确定删除项目「${p.name}」?其下用例树、文档将全部删除。`, '删除项目', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteProject(p.id)
    await load()
  } catch (e) {
    ElMessage.error(`删除失败:${(e as Error).message}`)
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}
</script>

<style scoped>
.page {
  padding: 24px;
}
.new-project {
  margin-bottom: 12px;
}
</style>
