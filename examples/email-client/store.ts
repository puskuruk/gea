import { Store } from '@geajs/core'

export type Folder = 'inbox' | 'sent' | 'drafts' | 'trash'
export type Label = 'work' | 'personal' | 'finance' | 'travel'

export interface Email {
  id: string
  from: string
  fromEmail: string
  subject: string
  preview: string
  body: string
  folder: Folder
  labels: Label[]
  date: string
  read: boolean
  starred: boolean
}

function uid() {
  return `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export const LABEL_COLORS: Record<Label, string> = {
  work: '#3b82f6',
  personal: '#10b981',
  finance: '#f59e0b',
  travel: '#8b5cf6',
}

const NOW = new Date()
const dateStr = (daysAgo: number, hour = 10) => {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

const INITIAL_EMAILS: Email[] = [
  {
    id: 'e1',
    from: 'Sofia Davis',
    fromEmail: 'sofia@acme.com',
    subject: 'Q1 Review Meeting',
    preview: "Hi, let's schedule the Q1 review for next week. Do you have time on Thursday?",
    body: "Hi,\n\nLet's schedule the Q1 review for next week. Do you have time on Thursday afternoon? I was thinking around 2pm.\n\nWe need to go over the metrics and plan for Q2.\n\nBest,\nSofia",
    folder: 'inbox',
    labels: ['work'],
    date: dateStr(0, 9),
    read: false,
    starred: true,
  },
  {
    id: 'e2',
    from: 'Jackson Lee',
    fromEmail: 'jackson@design.io',
    subject: 'New design mockups ready',
    preview: "Hey! I've finished the dashboard mockups. Check them out in Figma.",
    body: "Hey!\n\nI've finished the dashboard mockups. You can check them out in Figma. Let me know what you think!\n\nLink: figma.com/file/mock\n\nCheers,\nJackson",
    folder: 'inbox',
    labels: ['work'],
    date: dateStr(0, 11),
    read: false,
    starred: false,
  },
  {
    id: 'e3',
    from: 'Bank of America',
    fromEmail: 'noreply@bofa.com',
    subject: 'Your March statement is ready',
    preview: 'Your monthly statement for March 2026 is now available online.',
    body: 'Dear Customer,\n\nYour monthly statement for March 2026 is now available. You can view it by logging into your online banking account.\n\nAccount ending in: ****4242\nStatement period: March 1 – March 31, 2026\n\nBank of America',
    folder: 'inbox',
    labels: ['finance'],
    date: dateStr(1, 8),
    read: true,
    starred: false,
  },
  {
    id: 'e4',
    from: 'Airbnb',
    fromEmail: 'noreply@airbnb.com',
    subject: 'Your trip to Barcelona is confirmed!',
    preview: 'Your booking is confirmed. Check-in: April 15. Check-out: April 22.',
    body: 'Great news! Your trip to Barcelona is confirmed.\n\nCheck-in: April 15, 2026\nCheck-out: April 22, 2026\nProperty: Sunny apartment in El Born\n\nHave a great trip!',
    folder: 'inbox',
    labels: ['travel', 'personal'],
    date: dateStr(2, 14),
    read: true,
    starred: true,
  },
  {
    id: 'e5',
    from: 'Isabella Nguyen',
    fromEmail: 'isabella@startup.co',
    subject: 'Re: Project proposal',
    preview: "I reviewed the proposal and I think it's ready to present.",
    body: "Hi,\n\nI reviewed the proposal and I think it's ready to present to the client.\n\nI only have a few minor suggestions:\n1. Clarify the timeline on page 4\n2. Add more detail to the budget section\n\nOtherwise, looks great!\n\nIsabella",
    folder: 'inbox',
    labels: ['work'],
    date: dateStr(3, 16),
    read: true,
    starred: false,
  },
  {
    id: 'e6',
    from: 'Me',
    fromEmail: 'me@example.com',
    subject: 'Project timeline update',
    preview: 'Updated the timeline based on our discussion. Please review.',
    body: 'Hi team,\n\nAttached is the updated project timeline based on our discussion.\n\nKey changes:\n- Phase 1 extended by 1 week\n- Phase 2 starts March 28\n- Final delivery: April 30\n\nLet me know if you have any questions.',
    folder: 'sent',
    labels: ['work'],
    date: dateStr(1, 15),
    read: true,
    starred: false,
  },
  {
    id: 'e7',
    from: 'Me',
    fromEmail: 'me@example.com',
    subject: 'Barcelona trip packing list',
    preview: 'Things I need to pack for the Barcelona trip.',
    body: 'Packing list for Barcelona:\n\n- Passport\n- Adapter\n- Sunscreen\n- Light jacket\n- Camera\n\nNote to self: book airport transfer!',
    folder: 'drafts',
    labels: ['travel', 'personal'],
    date: dateStr(1, 12),
    read: true,
    starred: false,
  },
]

export class EmailStore extends Store {
  emails: Email[] = INITIAL_EMAILS
  activeFolder: Folder = 'inbox'
  activeEmailId: string | null = null
  composeOpen = false
  searchQuery = ''

  // Compose form
  composeTo = ''
  composeSubject = ''
  composeBody = ''

  get folderEmails(): Email[] {
    const q = this.searchQuery.toLowerCase()
    return this.emails
      .filter((e) => e.folder === this.activeFolder)
      .filter((e) => {
        if (!q) return true
        return (
          e.subject.toLowerCase().includes(q) || e.from.toLowerCase().includes(q) || e.preview.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  get activeEmail(): Email | null {
    return this.activeEmailId ? (this.emails.find((e) => e.id === this.activeEmailId) ?? null) : null
  }

  get inboxUnread(): number {
    return this.emails.filter((e) => e.folder === 'inbox' && !e.read).length
  }

  get composeValid(): boolean {
    return this.composeTo.includes('@') && this.composeSubject.trim().length > 0
  }

  folderCount(folder: Folder): number {
    return this.emails.filter((e) => e.folder === folder).length
  }

  selectFolder(folder: Folder): void {
    this.activeFolder = folder
    this.activeEmailId = null
    this.searchQuery = ''
  }

  selectEmail(id: string): void {
    this.activeEmailId = id
    const email = this.emails.find((e) => e.id === id)
    if (email) email.read = true
  }

  toggleStar(id: string): void {
    const email = this.emails.find((e) => e.id === id)
    if (email) email.starred = !email.starred
  }

  deleteEmail(id: string): void {
    const email = this.emails.find((e) => e.id === id)
    if (!email) return
    if (email.folder === 'trash') {
      const idx = this.emails.findIndex((e) => e.id === id)
      if (idx !== -1) this.emails.splice(idx, 1)
    } else {
      email.folder = 'trash'
    }
    if (this.activeEmailId === id) this.activeEmailId = null
  }

  openCompose(): void {
    this.composeOpen = true
    this.composeTo = ''
    this.composeSubject = ''
    this.composeBody = ''
  }

  closeCompose(): void {
    this.composeOpen = false
  }

  setComposeTo(e: { target: { value: string } }): void {
    this.composeTo = e.target.value
  }

  setComposeSubject(e: { target: { value: string } }): void {
    this.composeSubject = e.target.value
  }

  setComposeBody(e: { target: { value: string } }): void {
    this.composeBody = e.target.value
  }

  setSearch(e: { target: { value: string } }): void {
    this.searchQuery = e.target.value
    this.activeEmailId = null
  }

  sendEmail(): void {
    if (!this.composeValid) return
    this.emails.push({
      id: uid(),
      from: 'Me',
      fromEmail: 'me@example.com',
      subject: this.composeSubject.trim(),
      preview: this.composeBody.slice(0, 80),
      body: this.composeBody,
      folder: 'sent',
      labels: [],
      date: new Date().toISOString(),
      read: true,
      starred: false,
    })
    this.composeOpen = false
  }
}

export default new EmailStore()
