import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Building2, CheckCircle2, ChevronRight, Filter, Plus, RefreshCw, Search, ShieldAlert, ShieldCheck, UserCog, UsersRound, X } from 'lucide-react'
import { apiFetch } from './api'

type Role = 'employee' | 'manager' | 'admin'
type AdminTab = 'users' | 'departments' | 'roles' | 'audit'
type AdminUser = { id: string; name: string; email: string; department: string; role: Role; status: string }
type AuditItem = { id: string; user_id: string; action: string; resource_type: string; resource_id?: string; detail: Record<string, unknown>; created_at: string }

const roleLabels: Record<Role, string> = { employee: '普通员工', manager: '管理层', admin: '管理员' }
const rolePermissions: Record<Role, { allowed: string[]; restricted: string[]; scope: string }> = {
  admin: {
    allowed: ['管理用户和部门', '配置角色权限', '管理知识库和模型', '查看完整审计记录'],
    restricted: [],
    scope: '全平台、全部部门和资源',
  },
  manager: {
    allowed: ['审批部门申请', '查看管理范围数据', '接收审批通知'],
    restricted: ['修改平台模型配置', '删除全局资源', '管理管理员账号'],
    scope: '所属部门及下属组织',
  },
  employee: {
    allowed: ['使用授权知识库', '发起请假申请', '使用企业服务工具'],
    restricted: ['审批申请', '上传或发布全局文档', '配置模型和权限'],
    scope: '本人和被授权资源',
  },
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="panel">{children}</section>
}

function Status({ tone, children }: { tone: 'success' | 'pending'; children: React.ReactNode }) {
  return <span className={`status-badge status-${tone}`}>{tone === 'success' ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />}{children}</span>
}

export function AdminPage({ role, notify }: { role: Role; notify: (message: string) => void }) {
  const [tab, setTab] = useState<AdminTab>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [auditItems, setAuditItems] = useState<AuditItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', department: '', role: 'employee' as Role, password: '' })

  useEffect(() => {
    void Promise.all([
      apiFetch<AdminUser[]>('/admin/users'),
      apiFetch<AuditItem[]>('/admin/audit'),
    ]).then(([userItems, audit]) => { setUsers(userItems); setAuditItems(audit) }).catch(() => notify('组织数据加载失败，请检查后端服务'))
  }, [notify])

  const filteredUsers = useMemo(() => users.filter((user) => `${user.name} ${user.email} ${user.department}`.toLowerCase().includes(search.toLowerCase())), [users, search])
  const departments = useMemo(() => Array.from(new Set(users.map((user) => user.department))).map((name) => ({ name, count: users.filter((user) => user.department === name).length, manager: users.find((user) => user.department === name && user.role === 'manager')?.name ?? '未设置' })), [users])
  const roleRows: Array<{ role: Role; description: string }> = [
    { role: 'admin', description: '管理用户、组织、模型、知识库和审计' },
    { role: 'manager', description: '审批管理范围内申请，查看部门数据' },
    { role: 'employee', description: '使用授权知识库和企业服务工具' },
  ]
  const tabs: Array<[AdminTab, string]> = [['users', '用户'], ['departments', '部门'], ['roles', '角色'], ['audit', '权限变更记录']]
  const createUser = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const created = await apiFetch<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify(newUser) })
      setUsers((items) => [...items, created].sort((a, b) => (a.department + a.name).localeCompare(b.department + b.name)))
      setCreateOpen(false)
      setNewUser({ name: '', email: '', department: departments[0]?.name ?? '', role: 'employee', password: '' })
      notify('账号 ' + created.email + ' 已创建')
    } catch (error) { notify(error instanceof Error ? error.message : '账号创建失败') }
  }


  return <div className="page-stack">
    <div className="page-header"><div><div className="eyebrow">平台管理</div><h1>组织与权限</h1><p>统一维护用户、部门、角色和资源授权。</p></div>{tab === 'users' && <button className="button primary" onClick={() => { setNewUser((value) => ({ ...value, department: value.department || departments[0]?.name || '' })); setCreateOpen(true) }}><Plus size={16} />添加用户</button>}</div>
    <div className="tab-bar admin-tabs">{tabs.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</div>
    {tab === 'users' && <Panel><div className="toolbar"><div><h2>用户目录</h2><p className="toolbar-sub">共 {users.length} 位用户 · 角色由后端会话决定</p></div><div className="toolbar-actions"><div className="field search-field"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索姓名、邮箱或部门" /></div><button className="button secondary small" onClick={() => setSearch('')}><X size={14} />清空</button></div></div><div className="table-wrap"><table><thead><tr><th>用户</th><th>部门</th><th>角色</th><th>状态</th><th>操作</th></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.id}><td><span className="person-cell"><span className="avatar">{user.name.slice(0, 1)}</span><strong>{user.name}<small>{user.email}</small></strong></span></td><td>{user.department}</td><td><span className="role-tag"><UserCog size={14} />{roleLabels[user.role]}</span></td><td><Status tone={user.status === 'active' ? 'success' : 'pending'}>{user.status === 'active' ? '正常' : '待激活'}</Status></td><td><button className="text-button" onClick={() => notify(`已打开 ${user.name} 的权限编辑`)}>编辑权限</button></td></tr>)}</tbody></table></div></Panel>}
    {tab === 'departments' && <Panel><div className="section-heading"><div><h2>部门目录</h2><p>组织关系由管理员维护，审批人从部门关系中匹配。</p></div><button className="button primary small" onClick={() => notify('新增部门流程将在组织配置接口接入后开放')}><Plus size={15} />新增部门</button></div><div className="table-wrap"><table><thead><tr><th>部门</th><th>人数</th><th>负责人</th><th>知识库范围</th><th>状态</th></tr></thead><tbody>{departments.map((department) => <tr key={department.name}><td><span className="person-cell"><span className="file-icon doc"><Building2 size={16} /></span><strong>{department.name}<small>组织节点 · 可继续添加子部门</small></strong></span></td><td>{department.count} 人</td><td>{department.manager}</td><td><span className="role-tag"><BookOpen size={14} />按部门授权</span></td><td><Status tone="success">启用</Status></td></tr>)}</tbody></table></div></Panel>}
    {tab === 'roles' && <Panel><div className="section-heading"><div><h2>角色与权限</h2><p>角色只由管理员分配，员工不能在前端自行提升权限。</p></div><button className="button primary small" onClick={() => notify('自定义角色流程将在权限策略接口接入后开放')}><Plus size={15} />新增角色</button></div><div className="role-grid">{roleRows.map((item) => <div className="role-card" key={item.role}><div className="role-card-head"><span className="role-tag"><ShieldCheck size={14} />{roleLabels[item.role]}</span><strong>{users.filter((user) => user.role === item.role).length}</strong></div><p>{item.description}</p><button className="text-button" onClick={() => setSelectedRole(item.role)}>查看权限<ChevronRight size={14} /></button></div>)}</div></Panel>}
    {tab === 'audit' && <Panel><div className="toolbar"><div><h2>权限变更记录</h2><p className="toolbar-sub">记录用户、角色、资源和敏感配置的变更</p></div><button className="button secondary small" onClick={() => { void apiFetch<AuditItem[]>('/admin/audit').then(setAuditItems); notify('审计记录已刷新') }}><RefreshCw size={15} />刷新</button></div><div className="table-wrap"><table><thead><tr><th>时间</th><th>操作人</th><th>动作</th><th>资源</th><th>资源 ID</th><th>详情</th></tr></thead><tbody>{auditItems.map((item) => <tr key={item.id}><td>{item.created_at}</td><td><code>{item.user_id}</code></td><td><span className="role-tag"><ShieldAlert size={14} />{item.action}</span></td><td>{item.resource_type}</td><td><code>{item.resource_id || '-'}</code></td><td><span className="audit-detail">{JSON.stringify(item.detail)}</span></td></tr>)}</tbody></table></div></Panel>}
    {selectedRole && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedRole(null)}><section className="modal permission-modal" role="dialog" aria-modal="true" aria-labelledby="permission-detail-title" onClick={(event) => event.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">角色权限</div><h2 id="permission-detail-title">{roleLabels[selectedRole]}权限详情</h2></div><button className="icon-button" type="button" aria-label="关闭权限详情" title="关闭" onClick={() => setSelectedRole(null)}><X size={18} /></button></div><div className="permission-summary"><div><span className="role-tag"><ShieldCheck size={14} />{roleLabels[selectedRole]}</span><p>{roleRows.find((item) => item.role === selectedRole)?.description}</p></div><div className="permission-count"><strong>{users.filter((user) => user.role === selectedRole).length}</strong><span>名关联用户</span></div></div><div className="permission-grid"><div className="permission-section"><h3>允许的操作</h3>{rolePermissions[selectedRole].allowed.length > 0 ? <ul>{rolePermissions[selectedRole].allowed.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">暂无额外限制</p>}</div><div className="permission-section"><h3>限制的操作</h3>{rolePermissions[selectedRole].restricted.length > 0 ? <ul>{rolePermissions[selectedRole].restricted.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">无</p>}</div></div><div className="permission-scope"><span>资源范围</span><strong>{rolePermissions[selectedRole].scope}</strong></div></section></div>}
    {createOpen && <div className="modal-backdrop" role="presentation" onClick={() => setCreateOpen(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-user-title" onClick={(event) => event.stopPropagation()}><div className="modal-head"><h2 id="create-user-title">创建企业账号</h2><button className="icon-button" type="button" aria-label="关闭创建账号" onClick={() => setCreateOpen(false)}><X size={18} /></button></div><form className="form-stack" onSubmit={createUser}><label>姓名<input value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} placeholder="输入员工姓名" required /></label><label>企业邮箱<input type="email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} placeholder="name@company.internal" required /></label><label>部门<select value={newUser.department} onChange={(event) => setNewUser({ ...newUser, department: event.target.value })} required><option value="">请选择部门</option>{departments.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label><label>角色<select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value as Role })}><option value="employee">普通员工</option><option value="manager">管理层</option><option value="admin">管理员</option></select></label><label>初始密码<input type="password" minLength={8} value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} placeholder="至少 8 位" autoComplete="new-password" required /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setCreateOpen(false)}>取消</button><button className="button primary" type="submit"><Plus size={16} />创建账号</button></div></form></section></div>}
  </div>
}