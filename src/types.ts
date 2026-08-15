// 与后端 pydantic 契约一一对应(backend/app/schemas.py、routers/modules.py get_tree)
export type Priority = 'P0' | 'P1' | 'P2'

export interface Project {
  id: number
  name: string
  description: string | null
  git_repo_url: string | null
  created_at: string
}

// 树接口的节点形状(GET /api/projects/{id}/tree 返回 ModuleNode[])
export interface CaseSummary {
  id: number
  title: string
  priority: Priority
  executed_pass: boolean | null
}
export interface FeaturePointNode {
  id: number
  name: string
  cases: CaseSummary[]
}
export interface ModuleNode {
  id: number
  name: string
  children: ModuleNode[]
  feature_points: FeaturePointNode[]
}

// 用例详情(GET /api/cases/{id},含步骤)
export interface Step {
  id: number
  step_no: number
  action: string
  expected: string
}
export interface CaseDetail {
  id: number
  feature_point_id: number
  title: string
  priority: Priority
  precondition: string | null
  remark: string | null
  executed_pass: boolean | null
  steps: Step[]
}

export interface DocumentItem {
  id: number
  filename: string
  uploaded_at: string
}

export interface CaseUpsert {
  title: string
  priority: Priority
  precondition?: string | null
  remark?: string | null
  steps: { action: string; expected: string }[]
}
