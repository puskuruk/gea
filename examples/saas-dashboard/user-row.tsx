import { Component } from '@geajs/core'
import Avatar from '@geajs/ui/avatar'
import Badge from '@geajs/ui/badge'
import Button from '@geajs/ui/button'
import { ToastStore } from '@geajs/ui/toast'
import store from './store'
import type { User } from './store'

export default class UserRow extends Component {
  declare props: { user: User }

  template({ user }: { user: User }) {
    return (
      <tr class="user-row" data-user-id={user.id}>
        <td class="user-cell user-cell-name">
          <Avatar name={user.name} />
          <div class="user-info">
            <span class="user-name">{user.name}</span>
            <span class="user-email">{user.email}</span>
          </div>
        </td>
        <td class="user-cell">
          <Badge variant={user.role === 'admin' ? 'default' : user.role === 'editor' ? 'secondary' : 'outline'}>
            {user.role}
          </Badge>
        </td>
        <td class="user-cell">
          <span
            class={user.status === 'active' ? 'status-dot active' : 'status-dot inactive'}
            title={user.status}
            click={() => {
              store.toggleStatus(user.id)
              ToastStore.success({
                title: 'Status updated',
                description: `${user.name} is now ${user.status === 'active' ? 'inactive' : 'active'}.`,
              })
            }}
          />
          {user.status}
        </td>
        <td class="user-cell user-cell-date">{user.joined}</td>
        <td class="user-cell user-cell-actions">
          <Button variant="ghost" size="sm" click={() => store.confirmDelete(user.id)}>
            Remove
          </Button>
        </td>
      </tr>
    )
  }
}
