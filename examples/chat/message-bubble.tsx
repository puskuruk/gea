import { Component } from '@geajs/core'
import Avatar from '@geajs/ui/avatar'
import store from './store'
import type { Message } from './store'

export default class MessageBubble extends Component {
  declare props: { message: Message }

  template({ message }: { message: Message }) {
    const isMe = message.senderId === 'me'
    return (
      <div class={`message-wrap ${isMe ? 'mine' : 'theirs'}`}>
        {!isMe && <Avatar name={store.activeConversation?.name ?? '?'} />}
        <div class="bubble-col">
          <div class={`bubble ${isMe ? 'bubble-mine' : 'bubble-theirs'}`} data-message-id={message.id}>
            {message.text}
          </div>
          <span class="msg-time">{store.formatTime(message.timestamp)}</span>
        </div>
      </div>
    )
  }
}
