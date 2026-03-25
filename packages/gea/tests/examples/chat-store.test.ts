import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { ChatStore } from '../../../../examples/chat/store'

describe('examples/chat ChatStore', () => {
  let s: ChatStore

  beforeEach(() => {
    s = new ChatStore()
  })

  it('starts with four conversations and c1 active', () => {
    assert.equal(s.conversations.length, 4)
    assert.equal(s.activeConversationId, 'c1')
    assert.ok(s.activeConversation)
    assert.equal(s.activeConversation!.name, 'Sofia Davis')
  })

  it('selectConversation switches active and clears unread for that conv', () => {
    assert.ok(s.conversations.find((c) => c.id === 'c3')!.unread > 0)
    s.selectConversation('c3')
    assert.equal(s.activeConversationId, 'c3')
    assert.equal(s.conversations.find((c) => c.id === 'c3')!.unread, 0)
    assert.ok(s.activeMessages.length > 0)
  })

  it('sendMessage appends mine and clears draft', () => {
    const before = s.activeMessages.length
    s.draft = 'Hello unit test'
    s.sendMessage()
    assert.equal(s.draft, '')
    assert.equal(s.activeMessages.length, before + 1)
    const last = s.activeMessages[s.activeMessages.length - 1]
    assert.equal(last.senderId, 'me')
    assert.equal(last.text, 'Hello unit test')
  })

  it('totalUnread sums conversation unreads', () => {
    const sum = s.conversations.reduce((acc, c) => acc + c.unread, 0)
    assert.equal(s.totalUnread, sum)
  })

  it('messages stay isolated per conversation after send', () => {
    s.draft = 'only in c1'
    s.sendMessage()
    s.selectConversation('c2')
    assert.ok(!s.activeMessages.some((m) => m.text === 'only in c1'))
  })
})
