export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done'
export type Priority = 'low' | 'normal' | 'high'

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  due_date: string | null
  position: number
  created_at: string
  updated_at: string
  assignee_ids: string[]
  label_ids: string[]
  comment_count: number
}

export interface TeamMember {
  id: string
  name: string
  color: string
  avatar_url: string | null
  created_at: string
}

export interface Label {
  id: string
  name: string
  color: string
  created_at: string
}

export interface Comment {
  id: string
  task_id: string
  body: string
  created_at: string
}

export type ActivityType =
  | 'created'
  | 'status_changed'
  | 'title_changed'
  | 'description_changed'
  | 'priority_changed'
  | 'due_date_changed'
  | 'assignee_added'
  | 'assignee_removed'
  | 'label_added'
  | 'label_removed'
  | 'commented'

export interface Activity {
  id: string
  task_id: string
  type: ActivityType
  payload: Record<string, string | null | undefined>
  created_at: string
}

export interface TaskDraft {
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  due_date: string | null
  assignee_ids: string[]
  label_ids: string[]
}
