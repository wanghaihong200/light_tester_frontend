import type { UserInfo } from './auth'
import { http } from './client'

// 与后端 schemas_auth.UserOut 对齐(不返回 created_at,建号时间后端未暴露)
export type UserCreateInput = {
  username: string
  display_name: string
  password: string
  is_admin?: boolean
}

// 后端 exclude_unset 语义:只提交要改的字段(display_name/password/is_active 任意组合)
export type UserUpdateInput = {
  display_name?: string
  password?: string
  is_active?: boolean
}

export const usersApi = {
  list: () => http.get<UserInfo[]>('/users'),
  create: (body: UserCreateInput) => http.post<UserInfo>('/users', body),
  update: (id: number, body: UserUpdateInput) => http.put<UserInfo>(`/users/${id}`, body),
}
