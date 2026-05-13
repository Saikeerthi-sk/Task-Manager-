export const ProjectRole = {
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const;

export type ProjectRole = (typeof ProjectRole)[keyof typeof ProjectRole];

export const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

