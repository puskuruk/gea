import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { EmailStore } from '../../../../examples/email-client/store'

describe('examples/email-client EmailStore', () => {
  let s: EmailStore

  beforeEach(() => {
    s = new EmailStore()
  })

  it('folderEmails filters by activeFolder', () => {
    assert.equal(s.activeFolder, 'inbox')
    assert.ok(s.folderEmails.every((e) => e.folder === 'inbox'))
    s.selectFolder('sent')
    assert.ok(s.folderEmails.every((e) => e.folder === 'sent'))
  })

  it('selectEmail marks read', () => {
    const unread = s.emails.find((e) => e.folder === 'inbox' && !e.read)
    assert.ok(unread)
    s.selectEmail(unread!.id)
    assert.equal(s.emails.find((e) => e.id === unread!.id)!.read, true)
  })

  it('setSearch filters list', () => {
    s.setSearch({ target: { value: 'Barcelona' } } as any)
    assert.ok(
      s.folderEmails.every(
        (e) => e.subject.toLowerCase().includes('barcelona') || e.preview.toLowerCase().includes('barcelona'),
      ),
    )
  })

  it('deleteEmail moves to trash then removes', () => {
    const id = s.emails[0].id
    s.deleteEmail(id)
    const e = s.emails.find((x) => x.id === id)
    assert.ok(e)
    assert.equal(e!.folder, 'trash')
    s.deleteEmail(id)
    assert.ok(!s.emails.some((x) => x.id === id))
  })

  it('sendEmail pushes sent when compose valid', () => {
    s.openCompose()
    s.composeTo = 'you@test.com'
    s.composeSubject = 'Hi'
    s.composeBody = 'Body text here'
    const before = s.folderCount('sent')
    s.sendEmail()
    assert.equal(s.composeOpen, false)
    assert.equal(s.folderCount('sent'), before + 1)
  })

  it('inboxUnread counts unread inbox', () => {
    const manual = s.emails.filter((e) => e.folder === 'inbox' && !e.read).length
    assert.equal(s.inboxUnread, manual)
  })
})
