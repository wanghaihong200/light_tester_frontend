import type { GenerationJob, SSEEvent, StagingResponse } from '../types'
import { http } from './client'

// 创建生成任务
export function createJob(projectId: number, payload: { documentId: number; targetModuleId: number }) {
  return http.post<GenerationJob>(`/projects/${projectId}/jobs`, { document_id: payload.documentId, target_module_id: payload.targetModuleId })
}

// 列出项目下所有任务
export function listJobs(projectId: number) {
  return http.get<GenerationJob[]>(`/projects/${projectId}/jobs`)
}

// 获取单个任务详情
export function getJob(id: number) {
  return http.get<GenerationJob>(`/jobs/${id}`)
}

// 获取暂存区内容
export function listStaging(jobId: number) {
  return http.get<StagingResponse>(`/jobs/${jobId}/staging`)
}

// 接受暂存用例
export function acceptStaging(jobId: number, ids: number[]) {
  return http.post<{ accepted: number; feature_point_ids: Record<string, number> }>(`/jobs/${jobId}/staging/accept`, { ids })
}

// 拒绝单条暂存用例
export function rejectStaged(id: number) {
  return http.del(`/staged/${id}`)
}

// 订阅任务 SSE 事件流
export function subscribeJobEvents(jobId: number, onEvent: (e: SSEEvent) => void): () => void {
  const es = new EventSource(`/api/jobs/${jobId}/events`)
  let closed = false

  es.onmessage = (event) => {
    if (closed) return
    try {
      const data = JSON.parse(event.data)
      onEvent(data)
    } catch {
      // JSON 解析失败,忽略
    }
  }

  es.onerror = () => {
    if (!closed) {
      closed = true
      es.close()
      onEvent({ type: 'error', message: '连接中断' })
    }
  }

  return () => {
    if (!closed) {
      closed = true
      es.close()
    }
  }
}
