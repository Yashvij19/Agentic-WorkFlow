// frontend/utils/permissions.ts

/**
 * 🔒 Scoped workflow-level granular permission rule.
 * Sent in the `allowedWorkflowIds` array to grant fine-grained permissions per workflow.
 */
export interface WorkflowPermissionRule {
  workflowId: string;
  canView: boolean;
  canEdit: boolean;
  canRename: boolean;
  canDelete: boolean;
  canExecute: boolean;
  canViewExecutionLogs: boolean;
  workflowName?: string;
}

/**
 * 🛡️ Complete User Permissions Schema
 * Synchronized with PostgreSQL JSON storage in prisma.user.permissions
 * and the Admin Settings User Permissions editor.
 */
export interface UserPermissions {
  // Workflow Global Flags
  canCreateWorkflow?: boolean;
  canViewTeamWorkflows?: boolean;
  canEditTeamWorkflows?: boolean;
  canRenameTeamWorkflows?: boolean;
  canDeleteTeamWorkflows?: boolean;
  canExecuteTeamWorkflows?: boolean;

  // Execution & DLQ Flags
  canViewTeamExecutions?: boolean;
  canViewTeamFailedExecutions?: boolean;
  canViewDLQ?: boolean;

  // Knowledge Base & RAG RBAC Flags
  canCreatePersonalKnowledgeBase?: boolean;
  canChangeOrgKnowledgeBase?: boolean;

  // Granular Scoped Workflows Matrix
  allowedWorkflowIds?: (string | WorkflowPermissionRule)[];
  scopedWorkflows?: (WorkflowPermissionRule & { workflowName?: string })[];

  [key: string]: any;
}

/**
 * 👤 Current User Context with Role and Permissions
 */
export interface UserPermissionContext {
  id?: string;
  email?: string;
  role?: 'SINGLE' | 'ADMIN' | 'MEMBER' | string;
  organizationId?: string;
  organizationName?: string;
  permissions?: UserPermissions | null;
  [key: string]: any;
}

/**
 * 🛡️ Checks if a user has access to the Dead Letter Queue (DLQ).
 * - SINGLE: Allowed (personal single-tenant workspace)
 * - ADMIN: Allowed (full org authority)
 * - MEMBER: Restricted unless 'canViewTeamFailedExecutions' or 'canViewDLQ' is granted
 */
export function canAccessDLQ(user: UserPermissionContext | null | undefined): boolean {
  if (!user || !user.role) return false;

  if (user.role === 'SINGLE' || user.role === 'ADMIN') {
    return true;
  }

  if (user.role === 'MEMBER') {
    const p = user.permissions;
    return p?.canViewTeamFailedExecutions === true || p?.canViewDLQ === true;
  }

  return false;
}

/**
 * 🛡️ Checks if a user can create new workflows.
 */
export function canCreateWorkflow(user: UserPermissionContext | null | undefined): boolean {
  if (!user || !user.role) return false;
  if (user.role === 'SINGLE' || user.role === 'ADMIN') return true;
  return user.permissions?.canCreateWorkflow !== false;
}

/**
 * 🛡️ Checks if a user can create personal isolated knowledge bases.
 */
export function canCreatePersonalKB(user: UserPermissionContext | null | undefined): boolean {
  if (!user || !user.role) return false;
  if (user.role === 'SINGLE' || user.role === 'ADMIN') return true;
  return user.permissions?.canCreatePersonalKnowledgeBase === true;
}

/**
 * 🛡️ Checks if a user can upload or delete documents in Organization-scoped knowledge bases.
 */
export function canChangeOrgKB(user: UserPermissionContext | null | undefined): boolean {
  if (!user || !user.role) return false;
  if (user.role === 'SINGLE' || user.role === 'ADMIN') return true;
  return user.permissions?.canChangeOrgKnowledgeBase === true;
}

/**
 * 🛡️ Checks granular access for a specific workflow (View, Edit, Rename, Delete, Execute, Logs).
 * Respects creator ownership, global team permissions, and the scoped `allowedWorkflowIds` matrix.
 */
export function hasWorkflowPermission(
  user: UserPermissionContext | null | undefined,
  workflowId: string,
  action: 'view' | 'edit' | 'rename' | 'delete' | 'execute' | 'logs',
  creatorId?: string
): boolean {
  if (!user || !user.role) return false;

  // Single users and Admins have unrestricted access
  if (user.role === 'SINGLE' || user.role === 'ADMIN') return true;

  // Creators always have full access to their own workflows
  if (creatorId && user.id && creatorId === user.id) return true;

  const p = user.permissions;
  if (!p) return false;

  // Check global permission flags
  if (action === 'view' && p.canViewTeamWorkflows === true) return true;
  if (action === 'edit' && p.canEditTeamWorkflows === true) return true;
  if (action === 'rename' && p.canRenameTeamWorkflows === true) return true;
  if (action === 'delete' && p.canDeleteTeamWorkflows === true) return true;
  if (action === 'execute' && p.canExecuteTeamWorkflows === true) return true;
  if (action === 'logs' && p.canViewTeamExecutions === true) return true;

  // Check scoped allowedWorkflowIds whitelist matrix
  const allowedList = Array.isArray(p.allowedWorkflowIds) ? p.allowedWorkflowIds : [];
  for (const item of allowedList) {
    if (typeof item === 'string') {
      if (item === workflowId && action === 'view') return true;
    } else if (item && item.workflowId === workflowId) {
      if (action === 'view' && item.canView !== false) return true;
      if (action === 'edit' && item.canEdit === true) return true;
      if (action === 'rename' && item.canRename === true) return true;
      if (action === 'delete' && item.canDelete === true) return true;
      if (action === 'execute' && item.canExecute === true) return true;
      if (action === 'logs' && item.canViewExecutionLogs === true) return true;
    }
  }

  return false;
}
