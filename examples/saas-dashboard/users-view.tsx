import { Component } from '@geajs/core'
import Badge from '@geajs/ui/badge'
import Button from '@geajs/ui/button'
import { Card, CardContent } from '@geajs/ui/card'
import Input from '@geajs/ui/input'
import Label from '@geajs/ui/label'
import Select from '@geajs/ui/select'
import { ToastStore } from '@geajs/ui/toast'
import store from './store'
import UserRow from './user-row'

export default class UsersView extends Component {
  template() {
    const userToDelete = store.deleteUserId ? store.users.find((u) => u.id === store.deleteUserId) : null

    return (
      <div class="view-content">
        <div class="view-header">
          <div>
            <h2 class="view-title">Users</h2>
            <p class="view-desc">Manage your team members and their roles.</p>
          </div>
          <Button click={store.openAddUser}>Add User</Button>
        </div>

        <Card>
          <CardContent class="table-card">
            <div class="table-toolbar">
              <Input
                placeholder="Search users…"
                value={store.searchQuery}
                onInput={store.setSearch}
                class="search-input"
              />
              <Badge variant="secondary">{store.filteredUsers.length} users</Badge>
            </div>
            <div class="table-wrap">
              <table class="user-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {store.filteredUsers.map((user) => (
                    <UserRow key={user.id} user={user} />
                  ))}
                </tbody>
              </table>
              {store.filteredUsers.length === 0 && <p class="empty-state">No users match your search.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Add User Dialog */}
        {store.addUserOpen && (
          <div class="modal-backdrop" click={store.closeAddUser}>
            <div class="modal-box" click={(e: Event) => e.stopPropagation()}>
              <h3 class="modal-title">Add Team Member</h3>
              <p class="modal-desc">Invite a new member to your workspace.</p>
              <div class="form-field">
                <Label htmlFor="new-name">Full Name</Label>
                <Input
                  inputId="new-name"
                  placeholder="Jane Smith"
                  value={store.draftName}
                  onInput={store.setDraftName}
                />
              </div>
              <div class="form-field">
                <Label htmlFor="new-email">Email</Label>
                <Input
                  inputId="new-email"
                  type="email"
                  placeholder="jane@acme.com"
                  value={store.draftEmail}
                  onInput={store.setDraftEmail}
                />
              </div>
              <div class="form-field">
                <Select
                  label="Role"
                  placeholder="Select role…"
                  defaultValue={store.draftRole}
                  items={[
                    { value: 'admin', label: 'Admin' },
                    { value: 'editor', label: 'Editor' },
                    { value: 'viewer', label: 'Viewer' },
                  ]}
                  onValueChange={(d: any) => store.setDraftRole(d.value[0])}
                />
              </div>
              <div class="modal-actions">
                <Button variant="outline" click={store.closeAddUser}>
                  Cancel
                </Button>
                <Button
                  disabled={!store.draftName.trim() || !store.draftEmail.trim()}
                  click={() => {
                    store.addUser()
                    ToastStore.success({
                      title: 'User added',
                      description: `${store.draftName || 'New user'} has been added.`,
                    })
                  }}
                >
                  Add Member
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirm Dialog */}
        {store.deleteUserId && (
          <div class="modal-backdrop" click={store.cancelDelete}>
            <div class="modal-box" click={(e: Event) => e.stopPropagation()}>
              <h3 class="modal-title">Remove Member</h3>
              <p class="modal-desc">
                Are you sure you want to remove <strong>{userToDelete?.name}</strong> from the workspace? This action
                cannot be undone.
              </p>
              <div class="modal-actions">
                <Button variant="outline" click={store.cancelDelete}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  click={() => {
                    const name = userToDelete?.name
                    store.deleteUser()
                    ToastStore.error({ title: 'User removed', description: `${name} has been removed.` })
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
}
