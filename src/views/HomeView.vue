<template>
  <div class="home-view">
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
        <el-form-item label="Git 仓库">
          <el-input v-model="form.git_repo_url" maxlength="500" placeholder="http(s)://…/repo.git,接口生成任务与工程同步用" />
        </el-form-item>
        <el-form-item label="Git Token">
          <el-input
            v-model="form.git_token"
            maxlength="200"
            :placeholder="editing ? '留空表示不修改' : '可选,GitLab 访问 Token'"
          />
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
const form = ref({ name: '', description: '', git_repo_url: '', git_token: '' })

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
  form.value = { name: '', description: '', git_repo_url: '', git_token: '' }
  dialogVisible.value = true
}
function openEdit(p: Project) {
  editing.value = p
  // git_token 后端不返回,无法回填 → 留空表示不修改(exclude_unset 语义)
  form.value = { name: p.name, description: p.description ?? '', git_repo_url: p.git_repo_url ?? '', git_token: '' }
  dialogVisible.value = true
}

async function save() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入项目名称')
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      // token 仅在用户输入时提交:显式传 null 会把已存 token 清掉(exclude_unset 只区分字段是否出现)
      const payload: Parameters<typeof updateProject>[1] = {
        name: form.value.name.trim(),
        description: form.value.description || null,
        git_repo_url: form.value.git_repo_url.trim() || null,
      }
      if (form.value.git_token.trim()) payload.git_token = form.value.git_token.trim()
      await updateProject(editing.value.id, payload)
    } else {
      await createProject({
        name: form.value.name.trim(),
        description: form.value.description || null,
        git_repo_url: form.value.git_repo_url.trim() || null,
        git_token: form.value.git_token.trim() || null,
      })
    }
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
.home-view {
  padding: 16px 0;
}
.new-project {
  margin-bottom: 12px;
}
</style>
