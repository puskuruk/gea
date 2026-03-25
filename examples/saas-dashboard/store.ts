import { Store } from '@geajs/core'

export type View = 'overview' | 'users' | 'settings'
export type UserRole = 'admin' | 'editor' | 'viewer'
export type UserStatus = 'active' | 'inactive'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  joined: string
}

function uid() {
  return `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Sofia Davis', email: 'sofia@acme.com', role: 'admin', status: 'active', joined: '2024-01-10' },
  { id: 'u2', name: 'Jackson Lee', email: 'jackson@acme.com', role: 'editor', status: 'active', joined: '2024-02-14' },
  {
    id: 'u3',
    name: 'Isabella Nguyen',
    email: 'isabella@acme.com',
    role: 'viewer',
    status: 'active',
    joined: '2024-03-05',
  },
  {
    id: 'u4',
    name: 'William Kim',
    email: 'william@acme.com',
    role: 'editor',
    status: 'inactive',
    joined: '2024-01-22',
  },
  { id: 'u5', name: 'Olivia Martin', email: 'olivia@acme.com', role: 'viewer', status: 'active', joined: '2024-04-01' },
]

export class DashboardStore extends Store {
  currentView: View = 'overview'

  // Users
  users: User[] = INITIAL_USERS
  searchQuery = ''
  addUserOpen = false
  deleteUserId: string | null = null
  draftName = ''
  draftEmail = ''
  draftRole: UserRole = 'viewer'

  // Settings
  emailNotifications = true
  marketingEmails = false
  weeklyDigest = true
  twoFactor = false

  get filteredUsers(): User[] {
    const q = this.searchQuery.toLowerCase()
    if (!q) return this.users
    return this.users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }

  get activeCount(): number {
    return this.users.filter((u) => u.status === 'active').length
  }

  get adminCount(): number {
    return this.users.filter((u) => u.role === 'admin').length
  }

  navigate(view: View): void {
    this.currentView = view
  }

  setSearch(e: { target: { value: string } }): void {
    this.searchQuery = e.target.value
  }

  setDraftName(e: { target: { value: string } }): void {
    this.draftName = e.target.value
  }

  setDraftEmail(e: { target: { value: string } }): void {
    this.draftEmail = e.target.value
  }

  setDraftRole(value: string): void {
    this.draftRole = value as UserRole
  }

  openAddUser(): void {
    this.addUserOpen = true
    this.draftName = ''
    this.draftEmail = ''
    this.draftRole = 'viewer'
  }

  closeAddUser(): void {
    this.addUserOpen = false
  }

  addUser(): void {
    if (!this.draftName.trim() || !this.draftEmail.trim()) return
    this.users.push({
      id: uid(),
      name: this.draftName.trim(),
      email: this.draftEmail.trim(),
      role: this.draftRole,
      status: 'active',
      joined: new Date().toISOString().slice(0, 10),
    })
    this.addUserOpen = false
  }

  confirmDelete(id: string): void {
    this.deleteUserId = id
  }

  cancelDelete(): void {
    this.deleteUserId = null
  }

  deleteUser(): void {
    if (!this.deleteUserId) return
    const idx = this.users.findIndex((u) => u.id === this.deleteUserId)
    if (idx !== -1) this.users.splice(idx, 1)
    this.deleteUserId = null
  }

  toggleStatus(id: string): void {
    const u = this.users.find((u) => u.id === id)
    if (u) u.status = u.status === 'active' ? 'inactive' : 'active'
  }
}

export default new DashboardStore()
