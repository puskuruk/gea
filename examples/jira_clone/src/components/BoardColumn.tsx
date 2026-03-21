import { Component } from '@geajs/core'
import { IssueStatusCopy } from '../constants/issues'
import projectStore from '../stores/project-store'
import IssueCard from './IssueCard'

function resolveAssignees(issue: any, users: any[]): any[] {
  return (issue.userIds || []).map((uid: string) => users.find((u: any) => u.id === uid)).filter(Boolean)
}

export default class BoardColumn extends Component {
  template({ status, issues = [] }: any) {
    const project = projectStore.project
    const users = project ? project.users : []

    return (
      <div class="board-list">
        <div class="board-list-title">
          {IssueStatusCopy[status]} <span class="board-list-issues-count">{issues.length}</span>
        </div>
        <div class="board-list-issues" data-droppable-id={status}>
          {issues.map((issue: any) => (
            <IssueCard
              key={issue.id}
              issueId={issue.id}
              title={issue.title}
              type={issue.type}
              priority={issue.priority}
              assignees={resolveAssignees(issue, users)}
            />
          ))}
        </div>
      </div>
    )
  }
}
