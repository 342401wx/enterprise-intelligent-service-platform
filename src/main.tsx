import { ChangeEvent, FormEvent, KeyboardEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  Archive,
  ArrowUpRight,
  Bell,
  BookOpen,
  Bot,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  CircleDot,
  Copy,
  Database,
  Download,
  Eye,
  FileArchive,
  FileOutput,
  FileSpreadsheet,
  FileText,
  Filter,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  ListFilter,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  MoreHorizontal,
  PanelRight,
  Paperclip,
  Plus,
  RefreshCw,
  Reply,
  RotateCcw,
  Save,
  Search,
  SearchCheck,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  UploadCloud,
  UserCog,
  UserRound,
  UsersRound,
  Wifi,
  Workflow,
  X,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './styles.css'
import { renderAsync } from 'docx-preview'
import { apiFetch, downloadBlob, login, logout } from './api'
import type { AuthUser } from './api'
import { AdminPage as InteractiveAdminPage } from './admin-page'

type Role = 'employee' | 'manager' | 'admin'
type Page =
  | 'home'
  | 'assistant'
  | 'applications'
  | 'knowledge'
  | 'knowledge-detail'
  | 'email'
  | 'files'
  | 'notifications'
  | 'calendar'
  | 'monitoring'
  | 'trace'
  | 'model'
  | 'admin'
  | 'approval'
  | 'team'

type Status = 'success' | 'pending' | 'processing' | 'failed' | 'denied' | 'draft'

interface Conversation {
  id: string
  title: string
  preview: string
  updated: string
}

interface LeaveRequest {
  id: string
  applicant: string
  department: string
  type: string
  dates: string
  days: number
  status: 'pending' | 'approved' | 'rejected' | 'draft'
  reason: string
  approverId?: string
  createdAt?: string
  updatedAt?: string
}

interface TodoItem {
  id: string
  title: string
  dueDate?: string
  priority: 'high' | 'normal' | 'low'
  status: 'open' | 'done'
}
interface CalendarEvent {
  id: string
  kind: 'todo' | 'leave'
  title: string
  date?: string
  start?: string
  end?: string
  priority?: 'high' | 'normal' | 'low'
  status: string
}
interface ManagedUser {
  id: string
  name: string
  email: string
  department: string
  role: Role
  status: string
  supervisorId?: string
}
interface DocumentItem {
  id: string
  name: string
  owner: string
  size: string
  status: Status
  stage: string
  updated: string
  knowledgeBase: string
}

interface IngestionTask {
  id: string
  document: string
  stage: string
  status: Status
  progress: number
  updated: string
}

interface GeneratedFile {
  id: string
  name: string
  type: string
  status: Status
  conversationId: string
  createdAt: string
  template: string
}

interface EmailAccount {
  id: string
  workspace: string
  email: string
  name: string
  status: string
  active: boolean
}
interface EmailAddress {
  email: string
  name: string
}

interface EmailMessage {
  id: string
  providerId: string
  folder: 'inbox' | 'sent' | 'trash'
  direction: 'received' | 'sent'
  from: string
  fromName: string
  to: EmailAddress[]
  cc: EmailAddress[]
  subject: string
  preview: string
  body: string
  unread: boolean
  has_attachments: boolean
  attachments: Array<Record<string, unknown>>
  source: string
  status: string
  createdAt: string
  updatedAt: string
}
interface NotificationItem {
  id: string
  title: string
  detail: string
  type: 'approval' | 'system' | 'knowledge' | 'agent'
  time: string
  unread: boolean
}

interface TraceEvent {
  task_id?: string
  id: string
  seq: number
  label: string
  type: string
  status: Status
  duration: string
  summary: string
  data: string
}

const roleLabels: Record<Role, string> = {
  employee: '普通员工',
  manager: '管理层',
  admin: '管理员',
}

function parseLocation(): { page: Page; id?: string } {
  const raw = window.location.hash.replace(/^#\/?/, '') || 'home'
  const [page, id] = raw.split('/')
  if (page === 'knowledge' && id) return { page: 'knowledge-detail', id }
  const valid: Page[] = ['home', 'assistant', 'applications', 'knowledge', 'email', 'files', 'notifications', 'calendar', 'monitoring', 'trace', 'model', 'admin', 'approval', 'team']
  return { page: valid.includes(page as Page) ? (page as Page) : 'home' }
}

function useLocation() {
  const [location, setLocation] = useState(parseLocation())
  useEffect(() => {
    const onHashChange = () => setLocation(parseLocation())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  const go = (page: Page, id?: string) => {
    window.location.hash = id ? `knowledge/${id}` : page
  }
  return { ...location, go }
}

function IconButton({ label, children, onClick, disabled = false }: { label: string; children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return <button className="icon-button" aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>
}

function StatusBadge({ status, children }: { status: Status; children?: ReactNode }) {
  const labels: Record<Status, string> = { success: '成功', pending: '待处理', processing: '处理中', failed: '失败', denied: '无权限', draft: '草稿' }
  const Icon = status === 'success' ? CheckCircle2 : status === 'failed' ? XCircle : status === 'processing' ? Loader2 : status === 'denied' ? LockKeyhole : Clock3
  return <span className={`status-badge status-${status}`}><Icon size={14} className={status === 'processing' ? 'spin' : ''} />{children ?? labels[status]}</span>
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>
}

function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="header-actions">{actions}</div>}</div>
}

function StatCard({ label, value, detail, icon: Icon, tone = 'blue' }: { label: string; value: string; detail: string; icon: LucideIcon; tone?: 'blue' | 'teal' | 'amber' | 'red' }) {
  return <div className="stat-card"><div className="stat-card-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon size={18} /></span></div><strong>{value}</strong><small>{detail}</small></div>
}

function LoginPage({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const result = await login(email, password)
      onAuthenticated(result.user)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登录失败，请检查账号和密码')
    } finally {
      setSubmitting(false)
    }
  }
  return <main className="auth-page"><section className="auth-panel"><div className="brand-mark"><Building2 size={21} /></div><div className="eyebrow">企业智能服务</div><h1>登录平台</h1><p>使用企业账号访问知识库、申请和审批服务。</p><form className="form-stack" onSubmit={submit}><label>账号 / 企业邮箱<input type="text" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.internal" autoComplete="username" required /></label><label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="输入密码" autoComplete="current-password" required /></label>{error && <p className="auth-error">{error}</p>}<button className="button primary" type="submit" disabled={submitting}>{submitting ? '验证中...' : '登录'}</button></form></section></main>
}
function AppShell({ page, user, go, unreadCount, onLogout, children }: { page: Page; user: AuthUser; go: (page: Page, id?: string) => void; unreadCount: number; onLogout: () => void; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!profileOpen) return
    const closeOnOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutside)
    return () => document.removeEventListener('mousedown', closeOnOutside)
  }, [profileOpen])
  const items: { page: Page; label: string; icon: LucideIcon; roles?: Role[] }[] = [
    { page: 'home', label: '工作台', icon: LayoutDashboard },
    { page: 'assistant', label: 'AI 助手', icon: Bot },
    { page: 'applications', label: '我的申请', icon: ClipboardList },
    { page: 'knowledge', label: '知识库', icon: BookOpen },
    { page: 'email', label: '企业邮箱', icon: Mail },
    { page: 'files', label: '文件中心', icon: FileOutput },
    { page: 'notifications', label: '通知中心', icon: Bell },
    { page: 'calendar', label: '日历与待办', icon: CalendarDays },
    { page: 'approval', label: '审批中心', icon: ClipboardCheck, roles: ['manager', 'admin'] },
    { page: 'team', label: '团队管理', icon: UserCog, roles: ['manager', 'admin'] },
    { page: 'admin', label: '组织与权限', icon: UsersRound, roles: ['admin'] },
    { page: 'model', label: '模型配置', icon: Settings2, roles: ['admin'] },
    { page: 'monitoring', label: '运行监控', icon: Activity, roles: ['admin', 'manager'] },
    { page: 'trace', label: '审计与追踪', icon: ShieldCheck, roles: ['admin', 'manager'] },
  ]
  const visible = items.filter((item) => !item.roles || item.roles.includes(user.role))
  return <div className="app-shell">
    <div className={`mobile-scrim ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)} />
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Building2 size={19} /></div><div><strong>企业智能服务</strong><span>AI Service Platform</span></div></div>
      <div className="workspace-switcher"><span className="muted-label">当前账号</span><div className="account-summary"><strong>{user.name}</strong><small>{user.email}</small><span>{user.department} · {roleLabels[user.role]}</span></div></div>
      <nav className="side-nav">{visible.map(({ page: itemPage, label, icon: Icon }) => <button key={itemPage} className={`nav-item ${(page === itemPage || (page === 'knowledge-detail' && itemPage === 'knowledge')) ? 'active' : ''}`} onClick={() => { go(itemPage); setMenuOpen(false) }}><Icon size={18} />{label}{itemPage === 'notifications' && unreadCount > 0 && <span className="nav-count">{unreadCount}</span>}</button>)}</nav>
      <div className="sidebar-footer"><button className="nav-item"><CircleHelp size={18} />帮助中心</button><button className="nav-item danger" onClick={onLogout}><LogOut size={18} />退出登录</button></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="topbar-left"><IconButton label="打开导航" onClick={() => setMenuOpen(true)}><Menu size={20} /></IconButton><div className="breadcrumbs"><span>企业智能服务</span><ChevronRight size={14} /><strong>{page === 'home' ? '工作台' : page === 'assistant' ? 'AI 助手' : page === 'knowledge-detail' ? '知识库详情' : page === 'approval' ? '审批中心' : page === 'team' ? '团队管理' : page === 'model' ? '模型配置' : page === 'trace' ? '审计与追踪' : page === 'monitoring' ? '运行监控' : page === 'admin' ? '组织与权限' : page === 'files' ? '文件中心' : page === 'notifications' ? '通知中心' : page === 'calendar' ? '日历与待办' : page === 'email' ? '企业邮箱' : '我的申请'}</strong></div></div><div className="topbar-actions"><div className="top-search"><Search size={16} /><input placeholder="搜索功能、文档或会话 ID" aria-label="全局搜索" /></div><IconButton label="切换主题"><Sun size={18} /></IconButton><button className="notification-button" aria-label="通知中心" onClick={() => go('notifications')}><Bell size={18} />{unreadCount > 0 && <span />}</button><div className="user-menu" ref={profileRef}><button className="user-chip user-chip-button" type="button" aria-label="打开个人信息菜单" aria-expanded={profileOpen} onClick={() => setProfileOpen((value) => !value)}><span className="avatar">{user.name.slice(0, 1) || '用'}</span><span className="user-copy"><strong>{user.name || '当前用户'}</strong><small>{roleLabels[user.role]}</small></span><ChevronDown size={14} className={profileOpen ? 'rotate-180' : ''} /></button>{profileOpen && <div className="profile-menu" role="menu"><div className="profile-menu-head"><strong>个人信息</strong><span className="status-badge status-success">已登录</span></div><div className="profile-info"><div><span>姓名</span><strong>{user.name}</strong></div><div><span>企业邮箱</span><strong>{user.email}</strong></div><div><span>部门</span><strong>{user.department}</strong></div><div><span>角色</span><strong>{roleLabels[user.role]}</strong></div><div><span>用户 ID</span><code>{user.id}</code></div></div><button className="profile-logout" type="button" role="menuitem" onClick={() => { setProfileOpen(false); onLogout() }}><LogOut size={15} />退出登录</button></div>}</div></div></header>
      <main className="content">{children}</main>
    </div>
  </div>
}

function HomePage({ role, go, leaves, notifications, tasks }: { role: Role; go: (page: Page, id?: string) => void; leaves: LeaveRequest[]; notifications: NotificationItem[]; tasks: IngestionTask[] }) {
  const pendingApproval = leaves.filter((item) => item.status === 'pending').length
  const [team, setTeam] = useState<ManagedUser[]>([])
  const taskTarget = (type: NotificationItem['type']): Page => type === 'approval' ? 'approval' : type === 'knowledge' ? 'knowledge' : type === 'agent' ? 'monitoring' : 'notifications'
  useEffect(() => {
    if (role === 'employee') return
    void apiFetch<{ members: ManagedUser[] }>('/team').then((data) => setTeam(data.members)).catch(() => setTeam([]))
  }, [role])
  return <div className="page-stack"><PageHeader eyebrow="企业工作台" title="工作台" description="从一个工作台完成知识查询、业务办理和团队协作。" actions={<button className="button primary" onClick={() => go('assistant')}><Sparkles size={17} />开始对话</button>} /><div className="stats-grid"><StatCard label="待办事项" value={String(pendingApproval)} detail="来自当前业务数据" icon={ClipboardCheck} tone="blue" /><StatCard label="年假余额" value="--" detail="由人力资源系统提供" icon={CalendarDays} tone="teal" /><StatCard label="知识库文档" value="--" detail="进入知识库查看实时数量" icon={BookOpen} tone="amber" /><StatCard label="Agent 成功率" value="--" detail="等待监控数据" icon={Activity} tone="teal" /></div><div className="home-grid"><Panel className="tasks-panel"><div className="section-heading"><div><h2>近期任务</h2><p>需要你处理或关注的工作</p></div><button className="text-button" onClick={() => go(role === 'manager' || role === 'admin' ? 'approval' : 'applications')}>查看全部<ArrowUpRight size={15} /></button></div><div className="task-list">{notifications.length === 0 ? <EmptyState icon={ClipboardCheck} title="暂无任务" description="当前没有需要处理的工作。" /> : notifications.slice(0, 4).map((item) => <button key={item.id} className="task-row" onClick={() => go(taskTarget(item.type))}><span className="task-icon"><Bell size={17} /></span><span className="task-main"><strong>{item.title}</strong><small>{item.detail}</small></span><StatusBadge status={item.unread ? 'pending' : 'success'}>{item.unread ? '待处理' : '已记录'}</StatusBadge><ChevronRight size={16} className="muted" /></button>)}</div></Panel><Panel className="notice-panel"><div className="section-heading"><div><h2>通知中心</h2><p>{notifications.filter((n) => n.unread).length} 条未读通知</p></div><button className="icon-button" aria-label="打开通知中心" onClick={() => go('notifications')}><ArrowUpRight size={17} /></button></div>{notifications.slice(0, 3).map((item) => <button key={item.id} className={'notice-row ' + (item.unread ? 'unread' : '')} onClick={() => go('notifications')}><span className={'notice-dot ' + item.type}><Bell size={15} /></span><span><strong>{item.title}</strong><small>{item.detail}</small></span></button>)}</Panel></div>{(role === 'manager' || role === 'admin') && <div className="manager-grid"><Panel className="team-panel"><div className="section-heading"><div><h2>所管下属</h2><p>根据组织关系显示当前账号负责的成员</p></div><span className="history-count">{team.length} 人</span></div>{team.length === 0 ? <EmptyState icon={UsersRound} title="暂无所管下属" description="当前组织关系中没有可管理的成员。" /> : <div className="team-list">{team.map((member) => <div className="team-row" key={member.id}><span className="avatar">{member.name.slice(0, 1)}</span><div className="team-member"><strong>{member.name}</strong><small>{member.department} · {member.email}</small></div><button className="text-button" type="button" onClick={() => go('approval')}>查看申请<ChevronRight size={14} /></button></div>)}</div>}</Panel><Panel className="manager-actions"><div className="section-heading"><div><h2>管理操作</h2><p>快速处理所管范围内的工作</p></div><Settings2 size={20} className="accent-icon blue" /></div><div className="manager-action-list"><button className="manager-action" onClick={() => go('approval')}><span className="manager-action-icon amber"><ClipboardCheck size={17} /></span><span><strong>审批请假申请</strong><small>{pendingApproval} 条待处理</small></span><ChevronRight size={16} className="muted" /></button><button className="manager-action" onClick={() => go('monitoring')}><span className="manager-action-icon teal"><Activity size={17} /></span><span><strong>查看运行监控</strong><small>查看部门任务和系统状态</small></span><ChevronRight size={16} className="muted" /></button><button className="manager-action" onClick={() => go('trace')}><span className="manager-action-icon blue"><ShieldCheck size={17} /></span><span><strong>查看审计记录</strong><small>追踪申请和 Agent 操作</small></span><ChevronRight size={16} className="muted" /></button><button className="manager-action" onClick={() => go('email')}><span className="manager-action-icon red"><Mail size={17} /></span><span><strong>联系下属</strong><small>进入企业邮箱处理沟通</small></span><ChevronRight size={16} className="muted" /></button></div></Panel></div>}<Panel><div className="section-heading"><div><h2>常用工具</h2><p>快速进入企业服务</p></div></div><div className="quick-tools"><button onClick={() => go('assistant')}><Bot size={21} /><strong>问问 AI</strong><small>查询制度、办理服务</small></button><button onClick={() => go('applications')}><CalendarDays size={21} /><strong>申请请假</strong><small>发起审批申请</small></button><button onClick={() => go('knowledge')}><SearchCheck size={21} /><strong>查知识库</strong><small>检索内部资料</small></button><button onClick={() => go('email')}><Mail size={21} /><strong>处理邮件</strong><small>收发企业邮件</small></button><button onClick={() => go('files')}><FileOutput size={21} /><strong>生成文件</strong><small>使用 Office 模板</small></button></div></Panel><div className="subtle-footnote"><Activity size={14} /> 当前系统运行正常 · {tasks.filter((t) => t.status === 'processing').length} 个任务正在处理</div></div>
}function TeamPage({ role, go, notify }: { role: Role; go: (page: Page, id?: string) => void; notify: (message: string) => void }) {
  const [team, setTeam] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const loadTeam = async () => {
    setLoading(true)
    try { const data = await apiFetch<{ members: ManagedUser[] }>('/team'); setTeam(data.members) } catch (error) { notify(error instanceof Error ? error.message : '所管下属加载失败') } finally { setLoading(false) }
  }
  useEffect(() => { if (role !== 'employee') void loadTeam() }, [role])
  if (role === 'employee') return <AccessDenied title="暂无团队管理权限" description="团队管理仅对管理层和管理员开放。" />
  return <div className="page-stack team-page"><PageHeader eyebrow="管理层工作台" title="团队管理" description="查看所管下属，并处理管理范围内的企业工作。" actions={<button className="button secondary" onClick={() => void loadTeam()} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} />刷新成员</button>} /><div className="manager-grid team-page-grid"><Panel className="team-panel"><div className="section-heading"><div><h2>所管下属</h2><p>成员来自当前组织架构和直属汇报关系</p></div><span className="history-count">{team.length} 人</span></div>{loading ? <EmptyState icon={UsersRound} title="正在加载成员" description="正在读取组织关系数据。" /> : team.length === 0 ? <EmptyState icon={UsersRound} title="暂无所管下属" description="当前组织关系中没有可管理的成员。" /> : <div className="team-list">{team.map((member) => <div className="team-row" key={member.id}><span className="avatar">{member.name.slice(0, 1)}</span><div className="team-member"><strong>{member.name}</strong><small>{member.department} · {member.email}</small></div><button className="text-button" type="button" onClick={() => go('approval')}>查看申请<ChevronRight size={14} /></button></div>)}</div>}</Panel><Panel className="manager-actions"><div className="section-heading"><div><h2>管理操作</h2><p>快速处理所管范围内的工作</p></div><Settings2 size={20} className="accent-icon blue" /></div><div className="manager-action-list"><button className="manager-action" onClick={() => go('approval')}><span className="manager-action-icon amber"><ClipboardCheck size={17} /></span><span><strong>审批请假申请</strong><small>查看分配给你的待审批事项</small></span><ChevronRight size={16} className="muted" /></button><button className="manager-action" onClick={() => go('monitoring')}><span className="manager-action-icon teal"><Activity size={17} /></span><span><strong>查看运行监控</strong><small>查看部门任务和系统状态</small></span><ChevronRight size={16} className="muted" /></button><button className="manager-action" onClick={() => go('trace')}><span className="manager-action-icon blue"><ShieldCheck size={17} /></span><span><strong>查看审计记录</strong><small>追踪申请和 Agent 操作</small></span><ChevronRight size={16} className="muted" /></button><button className="manager-action" onClick={() => go('email')}><span className="manager-action-icon red"><Mail size={17} /></span><span><strong>联系下属</strong><small>进入企业邮箱处理沟通</small></span><ChevronRight size={16} className="muted" /></button></div></Panel></div></div>
}
function AssistantPage({ go, notify }: { go: (page: Page, id?: string) => void; notify: (message: string) => void }) {
  type EmailAttachment = { id: string; name: string; size?: number | string; contentType?: string; messageId?: string; downloadUrl?: string }
  type AssistantMessage = { role: 'user' | 'assistant'; text: string; attachments?: EmailAttachment[] }
  type ExecutionStep = { id: string; label: string; type?: string; status?: string; duration?: string; summary?: string; data?: string }
  const [selected, setSelected] = useState('')
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [conversationItems, setConversationItems] = useState<Conversation[]>([])
  const [showExecution, setShowExecution] = useState(true)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [steps, setSteps] = useState<ExecutionStep[]>([])
  const [generatedFileId, setGeneratedFileId] = useState('')
  const [expandedStep, setExpandedStep] = useState('')
  const timer = useRef<number | null>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const [downloadingAttachment, setDownloadingAttachment] = useState('')

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages, running])

  useEffect(() => {
    void apiFetch<Conversation[]>('/conversations').then((items) => {
      setConversationItems(items)
      setSelected((current) => items.some((item) => item.id === current) ? current : (items[0]?.id || ''))
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!selected) { setMessages([]); setSteps([]); return }
    void apiFetch<{ messages: Array<{ role: 'user' | 'assistant'; content: string; attachments?: EmailAttachment[] }>; events: ExecutionStep[] }>('/conversations/' + encodeURIComponent(selected))
      .then((detail) => {
        setMessages(detail.messages.map((message) => ({ role: message.role, text: message.role === 'assistant' ? normalizeAssistantMessage(message.content) : message.content, attachments: message.attachments || [] })))
        setSteps(detail.events)
        setExpandedStep('')
      })
      .catch(() => undefined)
  }, [selected])

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current) }, [])

  const send = async (event?: FormEvent | { preventDefault: () => void }) => {
    event?.preventDefault()
    const text = input.trim()
    if (!text || running) return
    const conversationId = selected || 'CV-' + Date.now()
    if (!selected) {
      setSelected(conversationId)
      setConversationItems((items) => [{ id: conversationId, title: '新对话', preview: text, updated: '刚刚' }, ...items])
    }
    setMessages((items) => [...items, { role: 'user', text }])
    setInput('')
    setRunning(true)
    setExpandedStep('')
    setSteps([{ id: 'pending-request', label: '接收并记录用户消息', type: 'message.created', status: 'processing', duration: '--', summary: '正在保存消息并建立本次任务上下文' }])
    try {
      const result = await apiFetch<{ response: string; attachments?: EmailAttachment[]; events: ExecutionStep[]; generated_file_id?: string }>('/conversations/' + encodeURIComponent(conversationId) + '/messages', { method: 'POST', body: JSON.stringify({ content: text }) })
      setMessages((items) => [...items, { role: 'assistant', text: normalizeAssistantMessage(result.response), attachments: result.attachments || [] }])
      setGeneratedFileId(result.generated_file_id || '')
      setSteps(result.events)
      notify('Agent 任务已完成，执行记录已保存')
      void apiFetch<Conversation[]>('/conversations').then(setConversationItems).catch(() => undefined)
    } catch (error) {
      setSteps([{ id: 'failed-request', label: '任务执行失败', type: 'agent.failed', status: 'failed', duration: '--', summary: error instanceof Error ? error.message : '模型或工具调用失败' }])
      notify(error instanceof Error ? error.message : 'Agent 请求失败，请检查模型配置')
    } finally {
      setRunning(false)
    }
  }

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void send(event)
    }
  }

  const stepDetails = (step: ExecutionStep) => {
    if (!step.data) return ''
    try { return JSON.stringify(JSON.parse(step.data), null, 2) } catch { return step.data }
  }

  const attachmentSize = (value?: number | string) => {
    const size = Number(value || 0)
    if (!size) return '附件'
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(2)} MB`
  }

  const downloadAttachment = async (attachment: EmailAttachment) => {
    const key = attachment.id || attachment.name
    if (attachment.downloadUrl) {
      window.open(attachment.downloadUrl, '_blank', 'noopener,noreferrer')
      return
    }
    if (!attachment.id || !attachment.messageId) { notify('附件下载信息不完整'); return }
    setDownloadingAttachment(key)
    try {
      const path = `/email/attachments/${encodeURIComponent(attachment.messageId)}/${encodeURIComponent(attachment.id)}?conversation_id=${encodeURIComponent(currentId)}`
      const blob = await downloadBlob(path)
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = attachment.name || '邮件附件'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectUrl)
      notify('附件下载完成')
    } catch (error) {
      notify(error instanceof Error ? error.message : '附件下载失败')
    } finally {
      setDownloadingAttachment('')
    }
  }
  const currentId = selected || '尚未创建'
  return <div className="assistant-layout">
    <aside className="conversation-list panel"><div className="conversation-head"><div><h2>对话</h2><p>共 {conversationItems.length} 个会话</p></div><IconButton label="新建对话" onClick={() => { const id = 'CV-' + Date.now(); setSelected(id); setConversationItems([{ id, title: '新对话', preview: '等待输入', updated: '刚刚' }, ...conversationItems]); setMessages([]); setSteps([]) }}><Plus size={18} /></IconButton></div><div className="field search-field"><Search size={16} /><input placeholder="搜索历史会话" /></div><div className="conversation-items">{conversationItems.map((item) => <button key={item.id} className={'conversation-item ' + (selected === item.id ? 'active' : '')} onClick={() => setSelected(item.id)}><div><strong>{item.title}</strong><small>{item.updated}</small></div><code>{item.id}</code><p><EmailPreview value={item.preview} /></p></button>)}</div></aside>
    <section className="chat-area panel"><div className="chat-head"><div><div className="id-line"><span>conversation_id</span><code className="conversation-id-value">{currentId}</code><button className="inline-icon" title="复制会话 ID" onClick={() => { if (selected) { navigator.clipboard?.writeText(selected); notify('会话 ID 已复制') } }}><Copy size={14} /></button></div><span className="mode-badge"><Bot size={13} />HR 助手模式</span></div><div className="header-actions"><IconButton label="查看追踪" onClick={() => go('trace')}><Activity size={17} /></IconButton><IconButton label="更多操作"><MoreHorizontal size={18} /></IconButton></div></div><div ref={messagesRef} className="messages">{messages.length === 0 && <EmptyState icon={MessageSquare} title="开始一个新对话" description="可以查询制度、办理请假或处理企业资料。" />}{messages.map((message, index) => <div className={'message ' + message.role} key={message.text + '-' + index}>{message.role === 'assistant' && <span className="assistant-avatar"><Bot size={17} /></span>}<div><div className="message-bubble">{message.text}</div>{message.role === 'assistant' && message.attachments && message.attachments.length > 0 && <div className="chat-attachment-list">{message.attachments.map((attachment) => { const key = attachment.id || attachment.name; return <button className="chat-attachment-card" type="button" key={key} onClick={() => void downloadAttachment(attachment)} disabled={downloadingAttachment === key}><span className="chat-attachment-icon"><Paperclip size={16} /></span><span className="chat-attachment-copy"><strong title={attachment.name}>{attachment.name}</strong><small>{attachmentSize(attachment.size)} · 点击下载</small></span>{downloadingAttachment === key ? <Loader2 size={15} className="spin" /> : <Download size={15} />}</button> })}</div>}{message.role === 'assistant' && generatedFileId && index === messages.length - 1 && <button className='citation' onClick={() => go('files')}><FileOutput size={13} />查看并下载生成文件</button>}<small>{message.role === 'user' ? '你' : '企业 AI · 已记录'}</small></div></div>)}{running && <div className="message assistant"><span className="assistant-avatar"><Bot size={17} /></span><div className="message-bubble running-message"><Loader2 className="spin" size={17} />正在执行任务并记录每一步...</div></div>}</div><form className="chat-composer" onSubmit={send}><div className="suggestions"><button type="button" onClick={() => setInput('查询我的年假余额')}>查询年假余额</button><button type="button" onClick={() => setInput('总结制度')}>总结制度</button><button type="button" onClick={() => setInput('查看我的待审批事项')}>查看待办</button></div><div className="composer-box"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onComposerKeyDown} placeholder="回车发送，Shift+回车换行" rows={2} /><div className="composer-footer"><div><IconButton label="添加文件"><Paperclip size={18} /></IconButton><IconButton label="清空输入" onClick={() => setInput('')}><X size={17} /></IconButton></div><button className="button primary small" type="submit" disabled={!input.trim() || running}>{running ? <Loader2 className="spin" size={15} /> : <Send size={15} />}发送</button></div></div><small className="privacy-note"><ShieldCheck size={13} /> 执行过程会关联到当前会话 ID，并按权限记录到审计系统</small></form></section>
    {showExecution && <aside className="execution-panel panel"><div className="execution-head"><div><h2>执行过程</h2><p>点击步骤查看详细输入、输出和状态</p></div><IconButton label="收起执行过程" onClick={() => setShowExecution(false)}><PanelRight size={17} /></IconButton></div><div className="execution-id"><span>conversation_id</span><code>{currentId}</code><button className="inline-icon" title="复制 conversation_id" onClick={() => { if (selected) { navigator.clipboard?.writeText(selected); notify('会话 ID 已复制') } }}><Copy size={13} /></button></div><div className="step-list">{steps.length === 0 ? <EmptyState icon={Activity} title="暂无执行记录" description="发送消息后，这里会展示每一步处理过程。" /> : steps.map((step, index) => <div className={'step ' + (step.status === 'failed' ? 'failed' : expandedStep === step.id ? 'expanded' : '')} key={step.id || step.label + index}><button className="step-button" type="button" onClick={() => setExpandedStep((current) => current === step.id ? '' : step.id)}><span className="step-marker">{step.status === 'processing' ? <Loader2 className="spin" size={13} /> : step.status === 'failed' ? <XCircle size={13} /> : <Check size={13} />}</span><span><strong>{step.label}</strong><small>{step.summary || '已记录该步骤。'}</small><small className='step-meta'>{step.type || 'agent.event'} · {step.duration || '--'} · {step.status || 'recorded'}</small></span><ChevronDown size={14} className={expandedStep === step.id ? 'rotate-180' : ''} /></button>{expandedStep === step.id && <div className="step-detail"><p>{step.summary || '已记录该步骤。'}</p>{stepDetails(step) && <pre>{stepDetails(step)}</pre>}</div>}</div>)}</div><button className="trace-link" onClick={() => go('trace')}>查看完整链路 <ArrowUpRight size={14} /></button></aside>}
    {!showExecution && <button className="execution-restore" onClick={() => setShowExecution(true)}><PanelRight size={17} />执行过程</button>}
  </div>
}
function normalizeAssistantMessage(text: string) {
  if (!text) return text
  const decoded = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\\n/g, '\n')
  const withoutCss = decoded.replace(/\.qmbox\b[\s\S]*?(?=Agent Mail 接入成功|邮箱地址)/gi, ' ')
  return withoutCss.replace(/---\s*原始邮件\s*---[\s\S]*$/i, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}
function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><span><Icon size={24} /></span><strong>{title}</strong><p>{description}</p>{action}</div>
}

function LeaveDetailModal({ request, onClose, onDecision }: { request?: LeaveRequest; onClose: () => void; onDecision?: (status: 'approved' | 'rejected') => void }) {
  if (!request) return null
  const statusLabel = request.status === 'approved' ? '已通过' : request.status === 'rejected' ? '已拒绝' : '待审批'
  const statusTone: Status = request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'failed' : 'pending'
  const formatTime = (value?: string) => value ? new Date(value).toLocaleString('zh-CN') : '已记录'
  return <Modal title="申请详情" className="leave-detail-modal" onClose={onClose}>
    <div className="leave-detail-summary"><div><span className="eyebrow">申请单号</span><code>{request.id}</code></div><StatusBadge status={statusTone}>{statusLabel}</StatusBadge></div>
    <div className="leave-detail-grid"><div><span>申请人</span><strong>{request.applicant}</strong></div><div><span>部门</span><strong>{request.department}</strong></div><div><span>假别</span><strong>{request.type}</strong></div><div><span>申请时长</span><strong>{request.days} 天</strong></div><div><span>申请时间</span><strong>{request.dates}</strong></div><div><span>提交时间</span><strong>{formatTime(request.createdAt)}</strong></div>{request.status !== 'pending' && <div><span>处理时间</span><strong>{formatTime(request.updatedAt)}</strong></div>}</div>
    <div className="leave-detail-reason"><span>申请事由</span><p>{request.reason}</p></div>
    <div className="leave-detail-timeline"><div className="timeline-item done"><span><Check size={13} /></span><div><strong>员工提交申请</strong><small>{formatTime(request.createdAt)}</small></div></div><div className={'timeline-item ' + (request.status === 'pending' ? 'current' : 'done')}><span>{request.status === 'pending' ? <Clock3 size={13} /> : request.status === 'approved' ? <Check size={13} /> : <X size={13} />}</span><div><strong>{request.status === 'pending' ? '等待审批' : request.status === 'approved' ? '审批已通过' : '审批已拒绝'}</strong><small>{request.status === 'pending' ? '由组织关系匹配直属上级审批' : `处理结果已写入审批记录 · ${formatTime(request.updatedAt)}`}</small></div></div></div>
    {request.status === 'pending' && onDecision && <div className="approval-actions"><button className="button primary" onClick={() => onDecision('approved')}><CheckCircle2 size={16} />同意申请</button><button className="button danger" onClick={() => onDecision('rejected')}><XCircle size={16} />拒绝</button></div>}
  </Modal>
}
function calculateLeaveDays(start: string, end: string) {
  if (!start || !end) return 0
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  const days = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1
  return Number.isFinite(days) ? days : 0
}
function ApplicationsPage({ role, go, leaves, setLeaves, notify }: { role: Role; go: (page: Page, id?: string) => void; leaves: LeaveRequest[]; setLeaves: (items: LeaveRequest[]) => void; notify: (message: string) => void }) {
  const [form, setForm] = useState({ type: '年假', start: '', end: '', reason: '' })
  const [selectedId, setSelectedId] = useState('')
  useEffect(() => { void apiFetch<LeaveRequest[]>('/leaves').then(setLeaves).catch(() => undefined) }, [setLeaves])
  const days = calculateLeaveDays(form.start, form.end)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.start || !form.end || !form.reason.trim()) { notify('请完整填写日期和申请事由'); return }
    if (days <= 0) { notify('结束日期不能早于开始日期'); return }
    try {
      const created = await apiFetch<LeaveRequest>('/leaves', { method: 'POST', body: JSON.stringify({ type: form.type, start: form.start, end: form.end, reason: form.reason, days }) })
      setLeaves([created, ...leaves])
      notify('请假申请已提交，等待审批')
    } catch (error) { notify(error instanceof Error ? error.message : '请假申请提交失败') }
  }
  const selectedRequest = leaves.find((item) => item.id === selectedId)
  return <div className="page-stack"><PageHeader eyebrow="员工服务" title="我的申请" description="发起请假申请，查看审批进度。" actions={<button className="button secondary" onClick={() => go('assistant')}><Bot size={16} />让 AI 帮我填写</button>} /><div className="application-grid"><Panel><div className="section-heading"><div><h2>发起请假</h2><p>提交后由组织关系自动匹配审批人</p></div><span className="step-count">1 / 3</span></div><form className="form-stack" onSubmit={submit}><div className="form-row"><label>假别<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>年假</option><option>调休</option><option>病假</option><option>事假</option></select></label><label>预计时长<input value={days > 0 ? `${days} 天` : '根据日期计算'} readOnly /></label></div><div className="form-row"><label>开始日期<input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></label><label>结束日期<input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></label></div>{form.start && form.end && days <= 0 && <p className="form-error">结束日期不能早于开始日期</p>}<label>申请事由<textarea rows={4} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="说明申请原因和工作交接情况" /></label><div className="handover-box"><ClipboardCheck size={18} /><div><strong>审批人</strong><p>由后端按部门组织关系匹配</p></div><StatusBadge status="pending">提交后匹配</StatusBadge></div><button className="button primary" type="submit"><Send size={16} />提交申请</button></form></Panel><div className="side-stack"><Panel><div className="section-heading"><div><h2>假期余额</h2><p>以人力资源系统为准</p></div><CalendarDays size={20} className="accent-icon teal" /></div><div className="balance-grid"><div><strong>--</strong><span>年假 / 天</span></div><div><strong>--</strong><span>病假 / 天</span></div></div><button className="text-button" onClick={() => go('knowledge')}>查看制度<ArrowUpRight size={15} /></button></Panel><Panel><div className="section-heading"><div><h2>制度入口</h2><p>使用知识库中的最新版本</p></div><BookOpen size={20} className="accent-icon amber" /></div><p className="muted">请在知识库或 AI 助手中查询适用于当前员工和部门的规则。</p><button className="text-button" onClick={() => go('knowledge')}>打开知识库<ArrowUpRight size={15} /></button></Panel></div></div><Panel className="application-history"><div className="section-heading"><div><h2>申请记录</h2><p>点击申请记录查看完整详情和审批进度。</p></div><span className="history-count">{leaves.length} 条</span></div>{leaves.length === 0 ? <EmptyState icon={ClipboardList} title="暂无申请记录" description="提交请假申请后，记录会显示在这里。" /> : <div className="table-wrap"><table><thead><tr><th>申请单号</th><th>假别</th><th>时间</th><th>状态</th><th>操作</th></tr></thead><tbody>{leaves.map((item) => <tr key={item.id} className={selectedId === item.id ? 'selected-row' : ''} onClick={() => setSelectedId(item.id)}><td><code>{item.id}</code></td><td>{item.type}</td><td>{item.dates}</td><td><StatusBadge status={item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'failed' : 'pending'}>{item.status === 'approved' ? '已通过' : item.status === 'rejected' ? '已拒绝' : '待审批'}</StatusBadge></td><td><button className="text-button" type="button" onClick={(event) => { event.stopPropagation(); setSelectedId(item.id) }}><Eye size={14} />查看</button></td></tr>)}</tbody></table></div>}</Panel><LeaveDetailModal request={selectedRequest} onClose={() => setSelectedId('')} /></div>
}function ApprovalPage({ role, leaves, setLeaves, notify }: { role: Role; leaves: LeaveRequest[]; setLeaves: (items: LeaveRequest[]) => void; notify: (message: string) => void }) {
  const [department, setDepartment] = useState('all')
  const [detailId, setDetailId] = useState('')
  useEffect(() => { void apiFetch<LeaveRequest[]>('/leaves').then(setLeaves).catch(() => undefined) }, [setLeaves])
  const departments = useMemo(() => Array.from(new Set(leaves.map((item) => item.department))).sort(), [leaves])
  const filteredLeaves = useMemo(() => department === 'all' ? leaves : leaves.filter((item) => item.department === department), [leaves, department])
  const pendingLeaves = filteredLeaves.filter((item) => item.status === 'pending')
  const historyLeaves = filteredLeaves.filter((item) => item.status !== 'pending')
  if (role === 'employee') return <AccessDenied title="暂无审批权限" description="审批中心仅对管理层和管理员开放。" />
  const request = filteredLeaves.find((item) => item.id === detailId)
  const formatTime = (value?: string) => value ? new Date(value).toLocaleString('zh-CN') : '已记录'
  const decide = async (status: 'approved' | 'rejected') => {
    if (!request) return
    try {
      const updated = await apiFetch<LeaveRequest>('/leaves/' + request.id + '/decision', { method: 'POST', body: JSON.stringify({ action: status }) })
      setLeaves(leaves.map((item) => item.id === request.id ? updated : item))
      setDetailId(updated.id)
      notify(status === 'approved' ? '申请已通过，申请人将收到通知' : '申请已拒绝，已记录审批意见')
    } catch (error) { notify(error instanceof Error ? error.message : '审批操作失败') }
  }
  const refreshApprovals = async () => {
    try {
      const items = await apiFetch<LeaveRequest[]>('/leaves')
      setLeaves(items)
      notify('审批列表已刷新')
    } catch (error) { notify(error instanceof Error ? error.message : '审批列表刷新失败') }
  }
  const pendingPanel = <Panel className="approval-list"><div className="section-heading"><div><h2>待审批申请</h2><p>共 {pendingLeaves.length} 条待办</p></div><IconButton label="刷新" onClick={() => void refreshApprovals()}><RefreshCw size={16} /></IconButton></div>{pendingLeaves.length === 0 ? <div className="approval-empty-state"><span className="approval-empty-icon"><CheckCircle2 size={22} /></span><div><strong>暂无待审批事项</strong><p>{department === 'all' ? '当前没有分配给你的待审批申请。' : department + ' 暂无分配给你的申请。'}</p></div></div> : pendingLeaves.map((item) => <button key={item.id} className={'approval-row ' + (detailId === item.id ? 'active' : '')} onClick={() => setDetailId(item.id)}><span className="avatar">{item.applicant.slice(0, 1)}</span><span><strong>{item.applicant}<small>{item.department}</small></strong><p>{item.type} · {item.days} 天</p></span><ChevronRight size={16} className="muted" /></button>)}</Panel>
  return <div className="page-stack approval-page"><PageHeader eyebrow="管理层工作台" title="审批中心" description="仅处理分配给当前账号的申请。" actions={<div className="field compact-select"><Filter size={15} /><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="all">全部部门</option>{departments.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>} /><div className="stats-grid three"><StatCard label="待审批" value={String(pendingLeaves.length)} detail={department === 'all' ? '当前审批范围' : department + ' 范围'} icon={Clock3} tone="amber" /><StatCard label="本月已通过" value={String(filteredLeaves.filter((item) => item.status === 'approved').length)} detail="当前筛选范围" icon={CheckCircle2} tone="teal" /><StatCard label="审批范围" value={department === 'all' ? String(departments.length) : '1'} detail={department === 'all' ? '个部门' : department} icon={Activity} tone="blue" /></div>{pendingPanel}<Panel className="approval-history"><div className="section-heading"><div><h2>审批记录</h2><p>已处理申请会保留在这里，可继续查看完整详情。</p></div><span className="history-count">{historyLeaves.length} 条</span></div>{historyLeaves.length === 0 ? <EmptyState icon={ClipboardList} title="暂无已处理记录" description="审批完成后，申请会从待办移入审批记录。" /> : <div className="table-wrap"><table><thead><tr><th>申请单号</th><th>申请人</th><th>部门</th><th>申请内容</th><th>处理时间</th><th>结果</th><th>操作</th></tr></thead><tbody>{historyLeaves.map((item) => <tr key={item.id} className={detailId === item.id ? 'selected-row' : ''} onClick={() => setDetailId(item.id)}><td><code>{item.id}</code></td><td>{item.applicant}</td><td>{item.department}</td><td>{item.type} · {item.days} 天<br /><small>{item.dates}</small></td><td>{formatTime(item.updatedAt)}</td><td><StatusBadge status={item.status === 'approved' ? 'success' : 'failed'}>{item.status === 'approved' ? '已通过' : '已拒绝'}</StatusBadge></td><td><button className="text-button" type="button" onClick={(event) => { event.stopPropagation(); setDetailId(item.id) }}><Eye size={14} />查看</button></td></tr>)}</tbody></table></div>}</Panel><LeaveDetailModal request={request} onClose={() => setDetailId('')} onDecision={decide} /></div>
}function AccessDenied({ title, description }: { title: string; description: string }) { return <div className="access-page"><div className="access-icon"><LockKeyhole size={28} /></div><h1>{title}</h1><p>{description}</p><button className="button secondary">返回工作台</button></div> }

function KnowledgePage({ go, documents, setDocuments, tasks, setTasks, notify }: { go: (page: Page, id?: string) => void; documents: DocumentItem[]; setDocuments: (items: DocumentItem[]) => void; tasks: IngestionTask[]; setTasks: (items: IngestionTask[]) => void; notify: (message: string) => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const upload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const created = await apiFetch<{ id: string; task_id: string; name: string; status: Status; stage: string }>('/knowledge/documents', { method: 'POST', body: formData })
      const size = `${(file.size / 1024 / 1024).toFixed(1)} MB`
      setDocuments([{ id: created.id, name: file.name, owner: '张建国', size, status: 'processing', stage: created.stage, updated: '刚刚', knowledgeBase: '研发知识库' }, ...documents])
      setTasks([{ id: created.task_id, document: file.name, stage: created.stage, status: 'processing', progress: 12, updated: '刚刚' }, ...tasks])
      notify(`${file.name} 已加入入库队列`)
    } catch {
      notify('文档上传失败：当前角色没有上传权限或后端未连接')
    }
  }
  const onFile = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) void upload(file) }
  return <div className="page-stack"><PageHeader eyebrow="知识资产管理" title="知识库" description="集中管理企业资料，让 Agent 基于可信来源回答问题。" actions={<><input ref={fileInput} type="file" hidden accept=".pdf,.docx,.xlsx,.md,.txt" onChange={onFile} /><button className="button primary" onClick={() => fileInput.current?.click()}><UploadCloud size={17} />上传文档</button></>} /><div className="stats-grid four"><StatCard label="知识库数量" value="12" detail="覆盖 6 个部门" icon={BookOpen} tone="blue" /><StatCard label="文档总数" value="--" detail="已发布 1,241 份" icon={FileText} tone="teal" /><StatCard label="处理中" value={String(tasks.filter((x) => x.status === 'processing').length)} detail="平均 3.2 分钟" icon={Loader2} tone="amber" /><StatCard label="待审核" value="8" detail="需要管理员处理" icon={ShieldAlert} tone="red" /></div><Panel><div className="toolbar"><div className="field search-field wide"><Search size={16} /><input placeholder="搜索知识库名称或文档" /></div><div className="toolbar-actions"><button className="button secondary small"><ListFilter size={15} />全部状态<ChevronDown size={14} /></button><button className="icon-button" aria-label="刷新"><RefreshCw size={16} /></button></div></div><div className="table-wrap"><table><thead><tr><th>文档</th><th>所属知识库</th><th>入库状态</th><th>上传人</th><th>更新时间</th><th>操作</th></tr></thead><tbody>{documents.map((doc) => <tr key={doc.id}><td><button className="doc-cell" onClick={() => go('knowledge-detail', doc.id)}><span className={`file-icon ${doc.name.endsWith('.pdf') ? 'pdf' : 'doc'}`}>{doc.name.endsWith('.xlsx') ? <FileSpreadsheet size={17} /> : doc.name.endsWith('.pdf') ? <FileArchive size={17} /> : <FileText size={17} />}</span><span><strong>{doc.name}</strong><small>{doc.size} · {doc.id}</small></span></button></td><td>{doc.knowledgeBase}</td><td><div className="status-with-progress"><StatusBadge status={doc.status}>{doc.stage}</StatusBadge>{doc.status === 'processing' && <div className="mini-progress"><span style={{ width: '72%' }} /></div>}</div></td><td>{doc.owner}</td><td>{doc.updated}</td><td><button className="text-button" onClick={() => go('knowledge-detail', doc.id)}>查看<ChevronRight size={14} /></button></td></tr>)}</tbody></table></div></Panel><Panel><div className="section-heading"><div><h2>入库任务</h2><p>解析、切块和索引的实时状态</p></div><button className="text-button" onClick={() => go('monitoring')}>进入监控<ArrowUpRight size={15} /></button></div><div className="ingestion-cards">{tasks.map((task) => <div className="ingestion-card" key={task.id}><div className="ingestion-card-head"><code>{task.id}</code><StatusBadge status={task.status} /></div><strong>{task.document}</strong><div className="progress-row"><div className="progress"><span style={{ width: `${task.progress}%` }} /></div><span>{task.progress}%</span></div><small>{task.stage} · {task.updated}</small>{task.status === 'failed' && <button className="text-button" onClick={() => notify(`${task.id} 已重新加入队列`)}><RotateCcw size={14} />重试</button>}</div>)}</div></Panel></div>
}

function KnowledgeDetailPage({ id, go, documents, notify }: { id?: string; go: (page: Page, id?: string) => void; documents: DocumentItem[]; notify: (message: string) => void }) {
  const doc = documents.find((item) => item.id === id)
  const [tab, setTab] = useState('documents')
  const [query, setQuery] = useState('')
  if (!doc) return <Panel><EmptyState icon={BookOpen} title="未找到知识库文档" description="请返回知识库列表重新选择文档。" action={<button className="button secondary" onClick={() => go('knowledge')}>返回知识库</button>} /></Panel>
  return <div className="page-stack"><PageHeader eyebrow="知识库 / 文档详情" title={doc.knowledgeBase} description="查看文档、入库状态、权限和检索结果。" actions={<button className="button secondary" onClick={() => go('knowledge')}><ChevronRight size={16} className="rotate-180" />返回列表</button>} /><div className="detail-banner"><div className="detail-banner-icon"><BookOpen size={25} /></div><div><h2>{doc.knowledgeBase}</h2><p>访问范围由权限策略决定 · 最近同步 {doc.updated}</p></div><div className="banner-metrics"><span><strong>{documents.filter((item) => item.knowledgeBase === doc.knowledgeBase).length}</strong>文档</span><span><strong>--</strong>分片</span><span><strong>--</strong>健康度</span></div></div><div className="tab-bar">{[['documents', '文档'], ['ingestion', '入库任务'], ['search', '检索测试'], ['permissions', '权限成员'], ['model', '模型配置']].map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</div>{tab === 'documents' && <Panel><div className="section-heading"><div><h2>文档列表</h2><p>当前知识库中的文档资产</p></div></div><div className="table-wrap"><table><thead><tr><th>文档名称</th><th>状态</th><th>上传人</th><th>更新时间</th></tr></thead><tbody>{documents.filter((item) => item.knowledgeBase === doc.knowledgeBase).map((item) => <tr key={item.id}><td><span className="file-cell"><FileText size={16} /><strong>{item.name}<small>{item.size}</small></strong></span></td><td><StatusBadge status={item.status}>{item.stage}</StatusBadge></td><td>{item.owner}</td><td>{item.updated}</td></tr>)}</tbody></table></div></Panel>}{tab === 'ingestion' && <Panel><div className="section-heading"><div><h2>入库任务</h2><p>任务状态由后端入库接口提供。</p></div></div><EmptyState icon={Loader2} title="暂无当前文档任务" description="当该文档发生解析、切块或索引任务时，任务详情会显示在这里。" /></Panel>}{tab === 'search' && <Panel><div className="section-heading"><div><h2>检索测试</h2><p>输入问题后由当前知识库检索接口返回证据。</p></div></div><form className="field search-field large" onSubmit={(event) => { event.preventDefault(); notify(query.trim() ? '检索接口正在接入，请通过 AI 助手执行知识库问答' : '请输入检索问题') }}><SearchCheck size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入测试问题" /><button className="button primary small" type="submit">检索</button></form><EmptyState icon={SearchCheck} title="尚无检索结果" description="检索结果会在真实向量检索完成后展示引用来源。" /></Panel>}{tab === 'permissions' && <Panel><div className="section-heading"><div><h2>权限成员</h2><p>成员由平台 RBAC 和部门授权接口返回。</p></div></div><EmptyState icon={UsersRound} title="暂无权限成员数据" description="当前页面不会使用固定成员数据。" /></Panel>}{tab === 'model' && <Panel><div className="section-heading"><div><h2>知识库模型</h2><p>未配置独立模型时继承平台通用配置。</p></div></div><div className="inherit-card"><Workflow size={20} /><div><strong>当前继承关系</strong><p>模型名称由模型配置接口提供</p></div></div></Panel>}</div>
}
function sanitizeEmailHtml(html: string) {
  const documentNode = new DOMParser().parseFromString(html, 'text/html')
  documentNode.querySelectorAll('script,style,iframe,object,embed,form,link,meta').forEach((node) => node.remove())
  documentNode.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value
      if (name.startsWith('on') || name === 'srcdoc' || name === 'action' || name === 'formaction') node.removeAttribute(attribute.name)
      if (name === 'href' || name === 'src') {
        if (!/^(https?:|mailto:|data:image\/(?:png|jpeg|gif|webp);)/i.test(value)) node.removeAttribute(attribute.name)
      }
      if (name === 'style' && /(?:javascript:|expression\(|behavior:|-moz-binding|url\s*\()/i.test(value)) node.removeAttribute(attribute.name)
    })
    if (node.tagName.toLowerCase() === 'a') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noreferrer noopener')
    }
  })
  return documentNode.body.innerHTML
}

function EmailBody({ body }: { body: string }) {
  const [originalOpen, setOriginalOpen] = useState(false)
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(body)
  if (!looksLikeHtml) return <div className="mail-body">{body.split(/\r?\n/).map((line, index) => <p key={index}>{line || ' '}</p>)}</div>

  const cleanHtml = sanitizeEmailHtml(body)
  const documentNode = new DOMParser().parseFromString(cleanHtml, 'text/html')
  const marker = documentNode.querySelector('.xm_mail_oringinal_describe')
  const originalRoot = marker?.parentElement
  const originalHtml = originalRoot?.innerHTML || ''
  if (originalRoot) originalRoot.remove()

  return <div className="mail-body-wrap">
    <div className="mail-body mail-body-html" dangerouslySetInnerHTML={{ __html: documentNode.body.innerHTML }} />
    {originalHtml && <div className={'mail-original ' + (originalOpen ? 'open' : '')}>
      <button className="mail-original-toggle" type="button" aria-expanded={originalOpen} onClick={() => setOriginalOpen((value) => !value)}>
        <span className="mail-original-label"><ChevronDown size={15} /><strong>原始邮件</strong></span>
        <small>{originalOpen ? '收起原始邮件' : '点击查看原始邮件内容'}</small>
      </button>
      {originalOpen && <div className="mail-original-content mail-body-html" dangerouslySetInnerHTML={{ __html: originalHtml }} />}
    </div>}
  </div>
}
function EmailPreview({ value }: { value: string }) {
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(value)
  if (!looksLikeHtml) return <>{value}</>
  const documentNode = new DOMParser().parseFromString(value, 'text/html')
  const originalMarker = '---原始邮件---'
  const text = (documentNode.body.textContent || '').replace(/\s+/g, ' ').trim()
  const preview = (text.split(originalMarker)[0] || text).trim()
  return <>{preview.slice(0, 180)}</>
}
function EmailPage({ notify }: { notify: (message: string) => void }) {
  const [folder, setFolder] = useState<'inbox' | 'sent' | 'trash'>('inbox')
  const [mails, setMails] = useState<EmailMessage[]>([])
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [accountId, setAccountId] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [compose, setCompose] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authLabel, setAuthLabel] = useState('我的 AgentMail 邮箱')
  const [authJob, setAuthJob] = useState('')
  const [authStatus, setAuthStatus] = useState('')
  const [authUrl, setAuthUrl] = useState('')
  const [draft, setDraft] = useState({ to: '', subject: '', body: '' })
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
  const attachmentInput = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [downloadingMailAttachment, setDownloadingMailAttachment] = useState('')

  const loadAccounts = useCallback(async () => {
    const data = await apiFetch<{ accounts: EmailAccount[] }>('/email/accounts')
    setAccounts(data.accounts)
    setAccountId((current) => data.accounts.some((item) => item.id === current) ? current : (data.accounts.find((item) => item.active)?.id || data.accounts[0]?.id || ''))
  }, [])

  useEffect(() => { void loadAccounts().catch(() => undefined) }, [loadAccounts])

  useEffect(() => {
    let active = true
    setLoading(true)
    const query = new URLSearchParams({ dir: folder })
    if (accountId) query.set('account_id', accountId)
    void apiFetch<EmailMessage[]>('/email/messages?' + query.toString()).then((items) => {
      if (!active) return
      setMails(items)
      setSelectedId('')
    }).catch((error) => {
      if (active) notify(error instanceof Error ? error.message : '邮件加载失败')
      if (active) setMails([])
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [accountId, folder, notify])

  useEffect(() => {
    if (!authJob) return
    let active = true
    const timer = window.setInterval(() => {
      void apiFetch<{ status: string; authorization_url?: string; message?: string; account?: EmailAccount }>('/email/accounts/auth/' + encodeURIComponent(authJob)).then((data) => {
        if (!active) return
        setAuthUrl(data.authorization_url || '')
        if (data.message) setAuthStatus(data.message)
        if (data.status === 'completed') {
          window.clearInterval(timer)
          setAuthOpen(false)
          setAuthJob('')
          void loadAccounts().then(() => { if (data.account) setAccountId(data.account.id) }).catch(() => undefined)
          notify(data.message || '邮箱账号授权成功')
        } else if (data.status === 'failed') {
          window.clearInterval(timer)
          setAuthJob('')
          setAuthStatus(data.message || '授权失败，请重新扫码')
        }
      }).catch(() => undefined)
    }, 1500)
    return () => { active = false; window.clearInterval(timer) }
  }, [authJob, loadAccounts, notify])

  const selectedMail = mails.find((item) => item.id === selectedId)
  const selectedAccount = accounts.find((item) => item.id === accountId)
  const mailAttachmentField = (attachment: Record<string, unknown>, ...keys: string[]) => {
    for (const key of keys) {
      const value = attachment[key]
      if (value !== undefined && value !== null && String(value)) return String(value)
    }
    return ''
  }
  const mailAttachmentSize = (attachment: Record<string, unknown>) => {
    const size = Number(mailAttachmentField(attachment, 'size', 'file_size') || 0)
    if (!size) return '附件'
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(2)} MB`
  }
  const downloadMailAttachment = async (attachment: Record<string, unknown>) => {
    const attachmentId = mailAttachmentField(attachment, 'attachment_id', 'id')
    const downloadUrl = mailAttachmentField(attachment, 'download_url', 'downloadUrl')
    if (downloadUrl) { window.open(downloadUrl, '_blank', 'noopener,noreferrer'); return }
    if (!selectedMail?.providerId || !attachmentId) { notify('附件下载信息不完整'); return }
    setDownloadingMailAttachment(attachmentId)
    try {
      const query = new URLSearchParams({ account_id: accountId, folder: selectedMail.folder })
      const blob = await downloadBlob(`/email/attachments/${encodeURIComponent(selectedMail.providerId)}/${encodeURIComponent(attachmentId)}?${query.toString()}`)
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = mailAttachmentField(attachment, 'filename', 'name') || '邮件附件'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectUrl)
      notify('附件下载完成')
    } catch (error) { notify(error instanceof Error ? error.message : '附件下载失败') } finally { setDownloadingMailAttachment('') }
  }
  const switchAccount = async (nextId: string) => {
    if (!nextId || nextId === accountId) return
    try { await apiFetch<EmailAccount>('/email/accounts/' + encodeURIComponent(nextId) + '/activate', { method: 'POST' }); setAccountId(nextId); notify('已切换邮箱账号') } catch (error) { notify(error instanceof Error ? error.message : '邮箱账号切换失败') }
  }
  const startAuth = async (event: FormEvent) => {
    event.preventDefault()
    try {
      const result = await apiFetch<{ job_id: string; message: string }>('/email/accounts/auth', { method: 'POST', body: JSON.stringify({ label: authLabel.trim() || 'AgentMail 邮箱' }) })
      setAuthJob(result.job_id)
      setAuthStatus(result.message)
      setAuthUrl('')
    } catch (error) { setAuthStatus(error instanceof Error ? error.message : '授权流程启动失败') }
  }
  const send = async (event: FormEvent) => {
    event.preventDefault()
    const recipients = draft.to.split(/[,;\s]+/).map((item) => item.trim()).filter(Boolean)
    if (recipients.length === 0) { notify('请至少填写一个收件人'); return }
    setSending(true)
    try {
      const formData = new FormData()
      formData.append('to', JSON.stringify(recipients))
      formData.append('subject', draft.subject)
      formData.append('body', draft.body)
      formData.append('confirmed', 'true')
      if (accountId) formData.append('account_id', accountId)
      attachmentFiles.forEach((file) => formData.append('attachments', file, file.name))
      await apiFetch<EmailMessage>('/email/send-with-attachments', { method: 'POST', body: formData })
      setCompose(false)
      setAttachmentFiles([])
      setDraft({ to: '', subject: '', body: '' })
      notify('邮件已发送，并已保存到已发送记录')
    } catch (error) { notify(error instanceof Error ? error.message : '邮件发送失败') } finally { setSending(false) }
  }
  const onAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || [])
    setAttachmentFiles((current) => [...current, ...selected].slice(0, 10))
    event.target.value = ''
  }
  const readMail = (item: EmailMessage) => {
    setSelectedId(item.id)
    if (!item.body && item.providerId) {
      const query = accountId ? '?account_id=' + encodeURIComponent(accountId) : ''
      void apiFetch<EmailMessage>('/email/messages/' + encodeURIComponent(item.providerId) + query).then((detail) => setMails((items) => items.map((current) => current.id === item.id ? { ...current, ...detail, preview: current.preview || detail.preview } : current))).catch((error) => notify(error instanceof Error ? error.message : '邮件正文加载失败'))
    }
  }
  return <div className="email-page"><PageHeader eyebrow="企业邮箱" title={folder === 'sent' ? '已发送' : folder === 'trash' ? '已删除' : '收件箱'} description="AgentMail 邮件会同步到平台，并保留收发记录。" actions={<div className="email-page-actions"><label className="email-account-picker"><Mail size={15} /><select aria-label="当前邮箱账号" value={accountId} onChange={(event) => void switchAccount(event.target.value)}><option value="">未配置邮箱</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.email}</option>)}</select></label><button className="button secondary" onClick={() => { setAuthOpen(true); setAuthStatus('') }}><Settings2 size={16} />配置邮箱账号</button><button className="button primary" onClick={() => { setAttachmentFiles([]); setCompose(true) }} disabled={!selectedAccount}><Plus size={17} />写邮件</button></div>} /><div className="email-layout panel"><aside className="mail-list"><div className="mail-list-head"><strong>{folder === 'sent' ? '已发送' : folder === 'trash' ? '已删除' : '收件箱'}</strong><span>{mails.length}</span></div><div className="mail-folders"><button className={folder === 'inbox' ? 'active' : ''} onClick={() => setFolder('inbox')}><Inbox size={16} />收件箱</button><button className={folder === 'sent' ? 'active' : ''} onClick={() => setFolder('sent')}><Send size={16} />已发送</button><button className={folder === 'trash' ? 'active' : ''} onClick={() => setFolder('trash')}><Trash2 size={16} />已删除</button></div><div className="mail-items">{loading ? <div className="mail-empty-state mail-list-empty"><Loader2 size={24} className="spin" /><strong>正在同步邮件</strong><p>正在读取当前邮箱记录。</p></div> : mails.length === 0 ? <div className="mail-empty-state mail-list-empty"><Inbox size={24} /><strong>暂无邮件记录</strong><p>{selectedAccount ? '当前文件夹还没有邮件。' : '请先配置 AgentMail 邮箱账号。'}</p></div> : mails.map((item) => <button key={item.id} className={'mail-item ' + (selectedId === item.id ? 'active' : '')} onClick={() => readMail(item)}><div><strong>{item.fromName || item.from || '未知发件人'}</strong><small>{item.createdAt}</small></div><b>{item.subject || '(无主题)'}</b><p><EmailPreview value={item.preview} /></p>{item.unread && <span className="unread-dot" />}</button>)}</div></aside><section className="mail-detail">{selectedMail ? <><div className="mail-toolbar"><div><span className="status-badge status-success">已记录</span><span className="mail-account-label">{selectedAccount?.email || 'AgentMail'}</span></div></div><div className="mail-content"><div className="mail-title-row"><div><h2>{selectedMail.subject || '(无主题)'}</h2><div className="sender"><span className="avatar">{(selectedMail.fromName || selectedMail.from || '邮').slice(0, 1)}</span><span><strong>{selectedMail.fromName || selectedMail.from} &lt;{selectedMail.from}&gt;</strong><small>收件人：{selectedMail.to.map((item) => item.email).join('、')}</small></span></div></div><span className="muted">{selectedMail.source === 'agent' ? 'Agent 发信' : '来自 AgentMail'}</span></div><EmailBody body={selectedMail.body || selectedMail.preview} />{selectedMail.attachments.length > 0 && <div className="attachment-list"><h3>附件</h3><div>{selectedMail.attachments.map((attachment, index) => { const id = mailAttachmentField(attachment, 'attachment_id', 'id') || String(index); const name = mailAttachmentField(attachment, 'filename', 'name') || '邮件附件'; return <button type="button" key={id} onClick={() => void downloadMailAttachment(attachment)} disabled={downloadingMailAttachment === id}><Paperclip size={16} /><span><strong title={name}>{name}</strong><small>{mailAttachmentSize(attachment)} · 点击下载</small></span>{downloadingMailAttachment === id ? <Loader2 size={15} className="spin" /> : <Download size={15} />}</button> })}</div></div>}</div></> : <div className="mail-empty-state mail-reader-empty"><Mail size={34} /><strong>{selectedAccount ? '选择一封邮件' : '尚未配置邮箱'}</strong><p>{selectedAccount ? '从左侧列表选择邮件后，在这里查看正文。' : '点击右上角配置邮箱账号，通过微信扫码登录 AgentMail。'}</p></div>}</section></div>{authOpen && <Modal title="配置邮箱账号" onClose={() => { if (!authJob) setAuthOpen(false) }}><form className="form-stack" onSubmit={startAuth}><p className="auth-flow-intro">AgentMail 使用 OAuth 授权，不需要在平台填写邮箱密码。点击开始后，系统会打开授权窗口，请使用微信扫码完成登录。</p><label>账号备注<input value={authLabel} onChange={(event) => setAuthLabel(event.target.value)} placeholder="例如：我的工作邮箱" required /></label>{authStatus && <div className={'auth-flow-status ' + (authJob ? 'pending' : 'done')}><Loader2 size={16} className={authJob ? 'spin' : ''} /><span>{authStatus}</span></div>}{authUrl && <p className="auth-flow-url">授权地址：<a href={authUrl} target="_blank" rel="noreferrer">打开授权页面</a></p>}<div className="modal-actions">{!authJob && <button className="button secondary" type="button" onClick={() => setAuthOpen(false)}>取消</button>}{!authJob && <button className="button primary" type="submit"><ShieldCheck size={16} />开始微信扫码授权</button>}</div></form></Modal>}{compose && <Modal title="写邮件" onClose={() => setCompose(false)}><form className="form-stack" onSubmit={send}>
<label>收件人<input value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} placeholder="邮箱地址，多个地址用逗号分隔" required /></label>
<label>主题<input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="邮件主题" /></label>
<label>正文<textarea rows={9} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="输入邮件正文" required /></label>
<div className="compose-attachments"><input ref={attachmentInput} type="file" multiple hidden onChange={onAttachmentChange} /><div className="compose-attachment-head"><button className="button secondary small" type="button" onClick={() => attachmentInput.current?.click()}><Paperclip size={15} />添加附件</button><small>最多 10 个，单个不超过 25 MB</small></div>{attachmentFiles.length > 0 && <div className="compose-attachment-list">{attachmentFiles.map((file, index) => <div className="compose-attachment" key={file.name + '-' + file.size + '-' + index}><Paperclip size={14} /><span title={file.name}>{file.name}<small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></span><button className="icon-button" type="button" aria-label={'移除附件 ' + file.name} onClick={() => setAttachmentFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={14} /></button></div>)}</div>}</div>
<div className="modal-actions"><button className="button secondary" type="button" onClick={() => { setCompose(false); setAttachmentFiles([]) }}>取消</button><button className="button primary" type="submit" disabled={sending}><Send size={16} />{sending ? '发送中...' : '发送'}</button></div>
</form></Modal>}</div>
}function Modal({ title, onClose, children, className = '' }: { title: string; onClose: () => void; children: ReactNode; className?: string }) { return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose() }}><div className={"modal " + className} role="dialog" aria-modal="true"><div className="modal-head"><h2>{title}</h2><IconButton label="关闭" onClick={onClose}><X size={18} /></IconButton></div>{children}</div></div> }

function DocxViewer({ blob }: { blob: Blob }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const styleRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const body = bodyRef.current
    const styles = styleRef.current
    if (!body || !styles) return
    body.replaceChildren()
    styles.replaceChildren()
    setError('')
    void renderAsync(blob, body, styles, { className: 'docx-preview', inWrapper: true, breakPages: true })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Word 文档渲染失败') })
    return () => {
      active = false
      body.replaceChildren()
      styles.replaceChildren()
    }
  }, [blob])
  if (error) return <EmptyState icon={FileText} title="Word 文档渲染失败" description={error} />
  return <div className="docx-viewer"><div ref={styleRef} /><div ref={bodyRef} /></div>
}

function FilesPage({ files, setFiles, notify }: { files: GeneratedFile[]; setFiles: (items: GeneratedFile[]) => void; notify: (message: string) => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<{ file: GeneratedFile; kind: 'text' | 'pdf' | 'docx'; content?: string; source?: string; blob?: Blob } | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    setLoading(true)
    void apiFetch<GeneratedFile[]>('/files').then(setFiles).catch((error) => notify(error instanceof Error ? error.message : '文件列表加载失败')).finally(() => setLoading(false))
  }, [notify, setFiles])

  const visibleFiles = files.filter((file) => file.name.toLowerCase().includes(search.toLowerCase()))
  const closePreview = () => setPreview(null)
  const authHeaders = (): Record<string, string> => {
    const token = window.sessionStorage.getItem('platform_access_token')
    return token ? { Authorization: 'Bearer ' + token } : {}
  }
  const openPreview = async (file: GeneratedFile) => {
    closePreview()
    try {
      const isPdf = file.type.toLowerCase() === 'pdf' || file.name.toLowerCase().endsWith('.pdf')
      const isDocx = file.type.toLowerCase() === 'docx' || file.name.toLowerCase().endsWith('.docx')
      if (isPdf || isDocx) {
        const response = await fetch('/api/files/' + file.id + '/download', { headers: authHeaders() })
        if (!response.ok) throw new Error(isPdf ? 'PDF 加载失败' : 'Word 文档加载失败')
        const blob = await response.blob()
        setPreview(isPdf ? { file, kind: 'pdf', source: URL.createObjectURL(blob) } : { file, kind: 'docx', blob })
      } else {
        const detail = await apiFetch<{ kind: 'text'; name: string; content: string }>('/files/' + file.id + '/preview')
        setPreview({ file, kind: 'text', content: detail.content })
      }
    } catch (error) { notify(error instanceof Error ? error.message : '文件预览失败') }
  }
  const download = async (file: GeneratedFile) => {
    try {
      const response = await fetch('/api/files/' + file.id + '/download', { headers: authHeaders() })
      if (!response.ok) throw new Error('文件下载失败')
      const source = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = source
      link.download = file.name
      link.click()
      URL.revokeObjectURL(source)
    } catch (error) { notify(error instanceof Error ? error.message : '文件下载失败') }
  }
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const created = await apiFetch<GeneratedFile>('/files/upload', { method: 'POST', body: form })
      setFiles([created, ...files])
      notify('文件已上传到文件中心')
    } catch (error) { notify(error instanceof Error ? error.message : '文件上传失败') }
    finally { setUploading(false) }
  }

  return <div className="page-stack"><PageHeader eyebrow="文件管理" title="文件中心" description="统一管理并在线查看企业常见文档。" actions={<><input ref={fileInput} type="file" hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.md,.txt,.csv,.json" onChange={upload} /><button className="button primary" onClick={() => fileInput.current?.click()} disabled={uploading}><UploadCloud size={17} />{uploading ? '上传中...' : '上传文件'}</button></>} /><Panel><div className="toolbar"><div><h2>全部文件</h2><p className="toolbar-sub">{files.length} 个文件 · 支持 PDF、Word、Excel、PPT、Markdown、TXT 和 CSV</p></div><div className="field search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索文件名" /><button className="icon-button" aria-label="清空搜索" onClick={() => setSearch('')}><X size={14} /></button></div></div>{loading ? <EmptyState icon={FileOutput} title="正在加载文件" description="正在读取当前账号可见的文件记录。" /> : visibleFiles.length === 0 ? <EmptyState icon={FileOutput} title="暂无文件" description="上传文件或生成 Office 文件后，记录会显示在这里。" /> : <div className="table-wrap"><table><thead><tr><th>文件名</th><th>类型</th><th>来源</th><th>时间</th><th>操作</th></tr></thead><tbody>{visibleFiles.map((file) => <tr key={file.id}><td><span className="file-cell"><FileText size={16} /><strong>{file.name}<small>{file.id}</small></strong></span></td><td><span className="role-tag">{file.type.toUpperCase()}</span></td><td>{file.template || '文件中心'}</td><td>{file.createdAt}</td><td><div className="row-actions"><button className="text-button" onClick={() => void openPreview(file)}><Eye size={14} />预览</button><button className="text-button" onClick={() => void download(file)}><Download size={14} />下载</button></div></td></tr>)}</tbody></table></div>}</Panel>{preview && <Modal title={preview.file.name} className="file-preview-modal" onClose={closePreview}><div className="file-preview">{preview.kind === 'pdf' && <iframe title={preview.file.name} src={preview.source} />}{preview.kind === 'docx' && preview.blob && <DocxViewer blob={preview.blob} />}{preview.kind === 'text' && <pre>{preview.content}</pre>}</div></Modal>}</div>
}
function CalendarPage({ notify }: { notify: (message: string) => void }) {
  const [cursor, setCursor] = useState(() => new Date())
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ title: '', dueDate: '', priority: 'normal' as TodoItem['priority'] })
  const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
  const reload = useCallback(async () => {
    try {
      const [todoData, calendarData] = await Promise.all([apiFetch<TodoItem[]>('/todos'), apiFetch<{ events: CalendarEvent[] }>('/calendar?month=' + monthKey)])
      setTodos(todoData); setEvents(calendarData.events)
    } catch (error) { notify(error instanceof Error ? error.message : '日历数据加载失败') }
  }, [monthKey, notify])
  useEffect(() => { void reload() }, [reload])
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const leading = (first.getDay() + 6) % 7
  const cells = Array.from({ length: leading + days }, (_, index) => index < leading ? '' : `${monthKey}-${String(index - leading + 1).padStart(2, '0')}`)
  const itemsForDay = (day: string) => events.filter((event) => event.kind === 'todo' ? event.date === day : Boolean(event.start && event.end && event.start <= day && event.end >= day))
  const selectedItems = selectedDate ? itemsForDay(selectedDate) : []
  const createTodo = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await apiFetch<TodoItem>('/todos', { method: 'POST', body: JSON.stringify({ title: draft.title, due_date: draft.dueDate || null, priority: draft.priority }) })
      setDraft({ title: '', dueDate: '', priority: 'normal' }); setCreating(false); await reload(); notify('待办已添加')
    } catch (error) { notify(error instanceof Error ? error.message : '新增待办失败') }
  }
  const toggleTodo = async (todo: TodoItem) => { try { await apiFetch<TodoItem>('/todos/' + encodeURIComponent(todo.id), { method: 'PATCH', body: JSON.stringify({ status: todo.status === 'done' ? 'open' : 'done' }) }); await reload() } catch (error) { notify(error instanceof Error ? error.message : '更新待办失败') } }
  const removeTodo = async (todo: TodoItem) => { try { await apiFetch('/todos/' + encodeURIComponent(todo.id), { method: 'DELETE' }); await reload(); notify('待办已删除') } catch (error) { notify(error instanceof Error ? error.message : '删除待办失败') } }
  const label = cursor.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
  return <div className="calendar-page page-stack"><PageHeader eyebrow="工作规划" title="日历与待办" description="集中查看请假安排、截止日期和个人待办。" actions={<div className="calendar-actions"><button className="icon-button" aria-label="上个月" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronRight size={17} className="rotate-180" /></button><strong>{label}</strong><button className="icon-button" aria-label="下个月" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight size={17} /></button><button className="button secondary small" onClick={() => setCursor(new Date())}>今天</button><button className="button primary" onClick={() => { setDraft({ title: '', dueDate: selectedDate, priority: 'normal' }); setCreating(true) }}><Plus size={16} />新增待办</button></div>} /><div className="calendar-layout"><Panel className="calendar-panel"><div className="calendar-weekdays">{['一','二','三','四','五','六','日'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells.map((day, index) => { const dayItems = day ? itemsForDay(day) : []; const isToday = day === new Date().toISOString().slice(0, 10); return <button className={'calendar-cell ' + (!day ? 'blank ' : '') + (selectedDate === day ? 'selected ' : '') + (isToday ? 'today' : '')} key={day || 'blank-' + index} disabled={!day} onClick={() => setSelectedDate(day)}>{day && <><span className="calendar-day-number">{Number(day.slice(-2))}</span><div className="calendar-event-list">{dayItems.slice(0, 3).map((item) => <span key={item.id + item.kind} className={'calendar-event ' + item.kind + ' ' + (item.priority || '')}>{item.title}</span>)}{dayItems.length > 3 && <small>+{dayItems.length - 3}</small>}</div></>}</button>})}</div></Panel><aside className="calendar-side"><Panel className="todo-panel"><div className="section-heading"><div><h2>{selectedDate ? selectedDate : '我的待办'}</h2><p>{selectedDate ? `${selectedItems.length} 项日程` : `${todos.filter((todo) => todo.status === 'open').length} 项待办未完成`}</p></div></div>{selectedDate && selectedItems.filter((item) => item.kind === 'leave').map((item) => <div className="calendar-detail-item leave" key={item.id}><CalendarDays size={15} /><span><strong>{item.title}</strong><small>{item.status === 'approved' ? '已批准' : item.status === 'pending' ? '待审批' : item.status}</small></span></div>)}<div className="todo-list">{todos.filter((todo) => !selectedDate || todo.dueDate === selectedDate).length === 0 ? <EmptyState icon={ClipboardCheck} title="暂无待办" description="新建待办后会显示在这里和对应日期。" /> : todos.filter((todo) => !selectedDate || todo.dueDate === selectedDate).map((todo) => <div className={'todo-row ' + todo.status} key={todo.id}><button className="todo-check" aria-label={todo.status === 'done' ? '恢复待办' : '完成待办'} onClick={() => void toggleTodo(todo)}>{todo.status === 'done' && <Check size={14} />}</button><span><strong>{todo.title}</strong><small>{todo.dueDate || '未设置日期'} · {todo.priority === 'high' ? '高优先级' : todo.priority === 'low' ? '低优先级' : '普通优先级'}</small></span><button className="icon-button" aria-label="删除待办" onClick={() => void removeTodo(todo)}><Trash2 size={15} /></button></div>)}</div></Panel></aside></div>{creating && <Modal title="新增待办" onClose={() => setCreating(false)}><form className="form-stack" onSubmit={createTodo}><label>待办内容<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="输入待办事项" required autoFocus /></label><label>截止日期<input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></label><label>优先级<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as TodoItem['priority'] })}><option value="high">高</option><option value="normal">普通</option><option value="low">低</option></select></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setCreating(false)}>取消</button><button className="button primary" type="submit"><Plus size={16} />添加</button></div></form></Modal>}</div>
}
function NotificationsPage({ notifications, setNotifications, go }: { notifications: NotificationItem[]; setNotifications: (items: NotificationItem[]) => void; go: (page: Page, id?: string) => void }) {
  return <div className="page-stack"><PageHeader eyebrow="工作提醒" title="通知中心" description="展示当前账号可见的通知和审批提醒。" actions={<button className="button secondary" onClick={() => { setNotifications(notifications.map((item) => ({ ...item, unread: false }))); void Promise.all(notifications.map((item) => apiFetch('/notifications/' + item.id + '/read', { method: 'POST' }))) }}><Check size={16} />全部标为已读</button>} /><Panel>{notifications.length === 0 ? <EmptyState icon={Bell} title="暂无通知" description="当前没有可展示的通知。" /> : notifications.map((item) => <button key={item.id} className={'notification-row ' + (item.unread ? 'unread' : '')} onClick={() => { setNotifications(notifications.map((current) => current.id === item.id ? { ...current, unread: false } : current)); void apiFetch('/notifications/' + item.id + '/read', { method: 'POST' }); if (item.type === 'approval') go('approval') }}><span className={'notice-dot ' + item.type}><Bell size={15} /></span><span className="notification-copy"><strong>{item.title}</strong><p>{item.detail}</p><small>{item.time}</small></span><ChevronRight size={16} className="muted" /></button>)}</Panel></div>
}

function MonitoringPage({ tasks, notify }: { tasks: IngestionTask[]; notify: (message: string) => void }) {
  const active = tasks.filter((task) => task.status === 'processing').length
  const failed = tasks.filter((task) => task.status === 'failed').length
  return <div className="page-stack"><PageHeader eyebrow="系统可观测性" title="运行监控" description="实时追踪后端入库任务。" actions={<button className="button secondary" onClick={() => notify('监控数据已刷新')}><RefreshCw size={16} />刷新</button>} /><div className="stats-grid four"><StatCard label="任务总数" value={String(tasks.length)} detail="来自入库接口" icon={Activity} tone="blue" /><StatCard label="处理中" value={String(active)} detail="当前队列" icon={Loader2} tone="amber" /><StatCard label="失败任务" value={String(failed)} detail="需要处理" icon={ShieldAlert} tone="red" /><StatCard label="成功率" value="--" detail="等待统计接口" icon={CheckCircle2} tone="teal" /></div><Panel><div className="section-heading"><div><h2>实时队列</h2><p>当前任务数据</p></div><Wifi size={18} className="accent-icon teal" /></div>{tasks.length === 0 ? <EmptyState icon={Wifi} title="暂无运行任务" description="当前没有可展示的任务。" /> : <div className="queue-list">{tasks.map((task) => <div className="queue-row" key={task.id}><span className={'queue-status ' + task.status}><CircleDot size={12} /></span><div><strong>{task.document}</strong><small>{task.id} · {task.stage}</small></div><span className="queue-progress">{task.progress}%</span></div>)}</div>}</Panel></div>
}

function TracePage({ notify }: { notify: (message: string) => void }) {
  const [query, setQuery] = useState('')
  const [events, setEvents] = useState<TraceEvent[]>([])
  const [loading, setLoading] = useState(false)
  const load = async () => {
    if (!query.trim()) { notify('请输入 conversation_id'); return }
    setLoading(true)
    try {
      const detail = await apiFetch<{ events: TraceEvent[] }>('/conversations/' + encodeURIComponent(query.trim()) + '/trace')
      setEvents(detail.events)
    } catch (error) { setEvents([]); notify(error instanceof Error ? error.message : '无法加载追踪记录') }
    finally { setLoading(false) }
  }
  return <div className="page-stack"><PageHeader eyebrow="审计 / Agent 追踪" title="对话全链路追踪" description="按 conversation_id 查询消息和工具事件。" /><Panel className="trace-search"><div className="field search-field large"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="输入 conversation_id" /><button className="button primary small" onClick={() => void load()} disabled={loading}>{loading ? '查询中' : '查询'}</button></div></Panel><Panel>{events.length === 0 ? <EmptyState icon={SearchCheck} title="没有找到执行记录" description="输入真实 conversation_id 查询。" /> : <div className="queue-list">{events.map((event) => <div className="queue-row" key={event.id}><span className="trace-marker"><CircleDot size={12} /></span><div><strong>{event.label}</strong><small>{event.type} · {event.summary}</small></div><code>{event.duration}</code></div>)}</div>}</Panel></div>
}

function ModelPage({ notify }: { notify: (message: string) => void }) {
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [url, setUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  useEffect(() => { void apiFetch<Array<{ scope_type: string; provider: string; model: string; api_url: string }>>('/model-configs').then((configs) => { const item = configs.find((config) => config.scope_type === 'global') as { provider?: string; model?: string; api_url?: string } | undefined; if (item) { setProvider(item.provider || ''); setModel(item.model || ''); setUrl(item.api_url || '') } }).catch(() => undefined) }, [])
  const save = async (event: FormEvent) => {
    event.preventDefault()
    try { await apiFetch('/model-configs', { method: 'PUT', body: JSON.stringify({ scope_type: 'global', scope_id: 'platform', provider, model, api_url: url, api_key: apiKey, api_format: 'openai-responses' }) }); setApiKey(''); notify('模型配置已保存') } catch (error) { notify(error instanceof Error ? error.message : '模型配置保存失败') }
  }
  return <div className="page-stack"><PageHeader eyebrow="平台设置" title="模型 API 配置" description="配置平台通用模型 API。" /><Panel><form className="form-stack" onSubmit={save}><label>Provider<input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="例如 OpenAI Compatible" /></label><label>模型名称<input value={model} onChange={(e) => setModel(e.target.value)} placeholder="填写模型名称" /></label><label>API URL<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="填写完整 URL" /></label><label>API Key<input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="输入 API Key，留空沿用已保存配置" /></label><div className="form-actions"><button className="button primary" type="submit"><Save size={16} />保存配置</button></div></form></Panel></div>
}

function App() {
  const location = useLocation()
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [booting, setBooting] = useState(true)
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [tasks, setTasks] = useState<IngestionTask[]>([])
  const [files, setFiles] = useState<GeneratedFile[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [toast, setToast] = useState('')
  const notify = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }, [])

  useEffect(() => {
    const token = window.sessionStorage.getItem('platform_access_token')
    if (!token) { window.localStorage.removeItem('platform_access_token'); setBooting(false); return }
    void apiFetch<AuthUser>('/auth/me').then(setCurrentUser).catch(() => window.sessionStorage.removeItem('platform_access_token')).finally(() => setBooting(false))
  }, [])

  const role = currentUser?.role
  useEffect(() => {
    if (!currentUser) return
    let active = true
    void apiFetch<{ leaves: LeaveRequest[]; documents: DocumentItem[]; tasks: IngestionTask[]; files: GeneratedFile[]; notifications: NotificationItem[] }>('/bootstrap')
      .then((data) => {
        if (!active) return
        setLeaves(data.leaves); setDocuments(data.documents); setTasks(data.tasks); setFiles(data.files); setNotifications(data.notifications)
      })
      .catch(() => { if (active) notify('业务数据加载失败，请检查后端服务') })
    return () => { active = false }
  }, [currentUser, notify])

  const unreadCount = useMemo(() => notifications.filter((item) => item.unread).length, [notifications])
  const handleLogout = async () => {
    await logout()
    setCurrentUser(null)
    setLeaves([]); setDocuments([]); setTasks([]); setFiles([]); setNotifications([])
    window.location.hash = 'home'
  }
  if (booting) return <main className="auth-page"><div className="auth-loading">正在验证登录状态...</div></main>
  if (!currentUser || !role) return <LoginPage onAuthenticated={setCurrentUser} />


  let content: ReactNode
  switch (location.page) {
    case 'home': content = <HomePage role={role} go={location.go} leaves={leaves} notifications={notifications} tasks={tasks} />; break
    case 'assistant': content = <AssistantPage go={location.go} notify={notify} />; break
    case 'applications': content = <ApplicationsPage role={role} go={location.go} leaves={leaves} setLeaves={setLeaves} notify={notify} />; break
    case 'approval': content = <ApprovalPage role={role} leaves={leaves} setLeaves={setLeaves} notify={notify} />; break
    case 'team': content = <TeamPage role={role} go={location.go} notify={notify} />; break
    case 'knowledge': content = <KnowledgePage go={location.go} documents={documents} setDocuments={setDocuments} tasks={tasks} setTasks={setTasks} notify={notify} />; break
    case 'knowledge-detail': content = <KnowledgeDetailPage id={location.id} go={location.go} documents={documents} notify={notify} />; break
    case 'email': content = <EmailPage notify={notify} />; break
    case 'files': content = <FilesPage files={files} setFiles={setFiles} notify={notify} />; break
    case 'notifications': content = <NotificationsPage notifications={notifications} setNotifications={setNotifications} go={location.go} />; break
    case 'calendar': content = <CalendarPage notify={notify} />; break
    case 'monitoring': content = role === 'employee' ? <AccessDenied title="暂无监控权限" description="运行监控仅对管理层和管理员开放。" /> : <MonitoringPage tasks={tasks} notify={notify} />; break
    case 'trace': content = role === 'employee' ? <AccessDenied title="暂无追踪权限" description="全链路审计仅对管理层和管理员开放。" /> : <TracePage notify={notify} />; break
    case 'model': content = role === 'admin' ? <ModelPage notify={notify} /> : <AccessDenied title="仅管理员可配置模型" description="模型 API 和密钥配置属于平台敏感设置。" />; break
    case 'admin': content = <InteractiveAdminPage role={role} notify={notify} />; break
    default: content = <HomePage role={role} go={location.go} leaves={leaves} notifications={notifications} tasks={tasks} />
  }
  return <><AppShell page={location.page} user={currentUser} go={location.go} unreadCount={unreadCount} onLogout={() => void handleLogout()}>{content}</AppShell>{toast && <div className="toast" role="status"><CheckCircle2 size={17} />{toast}</div>}</>
}
import { createRoot } from 'react-dom/client'
createRoot(document.getElementById('root')!).render(<App />)