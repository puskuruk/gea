import { Component } from '@geajs/core'
import { router } from '../router'
import IssueTypeIcon from './IssueTypeIcon'
import IssuePriorityIcon from './IssuePriorityIcon'
import { Avatar } from '@geajs/ui'

export default class IssueCard extends Component {
  handleClick() {
    router.push(`/project/board/issues/${this.props.issueId}`)
  }

  template({ issueId, title, type, priority, assignees = [] }: any) {
    return (
      <div class="issue-card" data-draggable-id={issueId} click={() => this.handleClick()}>
        <p class="issue-card-title">{title}</p>
        <div class="issue-card-footer">
          <div class="issue-card-footer-left">
            <IssueTypeIcon type={type} size={18} />
            <IssuePriorityIcon priority={priority} top={-1} left={4} />
          </div>
          <div class="issue-card-footer-right">
            {assignees.map((user: any) => (
              <Avatar key={user.id} src={user.avatarUrl} name={user.name} class="!h-6 !w-6" />
            ))}
          </div>
        </div>
      </div>
    )
  }
}
