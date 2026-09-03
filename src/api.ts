const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = window.sessionStorage.getItem('platform_access_token')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  } catch {
    throw new Error('网络连接失败，请检查后端服务是否启动')
  }
  if (!response.ok) {
    const detail = await response.text()
    let message = detail || `Request failed: ${response.status}`
    try {
      const payload = JSON.parse(detail) as { detail?: string; message?: string }
      message = payload.detail || payload.message || message
    } catch {
      // Keep plain-text provider errors readable.
    }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export type AuthUser = {
  id: string
  name: string
  email: string
  department: string
  role: 'employee' | 'manager' | 'admin'
  status: string
}

export async function login(email: string, password: string) {
  const result = await apiFetch<{ access_token: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  window.sessionStorage.setItem('platform_access_token', result.access_token)
  return result
}

export async function logout() {
  try { await apiFetch('/auth/logout', { method: 'POST' }) } finally {
    window.sessionStorage.removeItem('platform_access_token')
  }
}

export async function downloadBlob(path: string): Promise<Blob> {
  const headers = new Headers()
  const token = window.sessionStorage.getItem('platform_access_token')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { headers })
  } catch {
    throw new Error('网络连接失败，请检查后端服务是否启动')
  }
  if (!response.ok) {
    const detail = await response.text()
    let message = detail || `Request failed: ${response.status}`
    try {
      const payload = JSON.parse(detail) as { detail?: string; message?: string }
      message = payload.detail || payload.message || message
    } catch {
      // Keep plain-text provider errors readable.
    }
    throw new Error(message)
  }
  return response.blob()
}