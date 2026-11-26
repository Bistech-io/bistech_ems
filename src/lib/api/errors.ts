import type { ErrorCode, FieldError } from '@ems/contracts';

export const ERROR_CODE_MESSAGES: Record<ErrorCode, string> = {
  BAD_REQUEST: 'The request could not be processed. Please check your input and try again.',
  UNAUTHENTICATED: 'Your session has expired. Please sign in again.',
  TOKEN_EXPIRED: 'Your session token expired. Refreshing your session...',
  INVALID_CREDENTIALS: 'Invalid username or password. Please check your credentials and try again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  ACCOUNT_LOCKED:
    'Your account is temporarily locked due to multiple failed sign-in attempts. Please try again later.',
  ACCOUNT_DISABLED: 'Your account has been disabled. Contact your organization administrator.',
  CSRF_FAILED: 'Security verification failed. Please refresh the page and try again.',
  SELF_MODIFICATION_NOT_ALLOWED: 'You cannot perform this action on your own account.',
  EMPLOYEE_INACTIVE: 'Inactive employees cannot check in.',
  OUTSIDE_OFFICE_NETWORK:
    'Check-in and check-out are only allowed from the office network. Connect to office Wi-Fi or LAN and try again.',
  NOT_FOUND: 'The requested resource was not found.',
  EMPLOYEE_NOT_FOUND: 'No employee profile is linked to this account yet.',
  CONFLICT: 'A conflict occurred with the current state of the resource.',
  DUPLICATE_RESOURCE: 'This record already exists.',
  ALREADY_CHECKED_IN: 'You have already checked in for today.',
  NOT_CHECKED_IN: 'You must check in before checking out.',
  ALREADY_CHECKED_OUT: 'You have already checked out for today.',
  INVALID_TASK_TRANSITION: 'This task status transition is not allowed.',
  ALREADY_REVIEWED: 'This submission has already been reviewed.',
  DEPARTMENT_HEAD_REQUIRED: 'A replacement department head is required before proceeding.',
  LAST_SUPER_ADMIN: 'The last active Super Admin cannot be disabled.',
  VALIDATION_ERROR: 'Please correct the highlighted fields and try again.',
  OTP_INVALID: 'The verification code is invalid or has expired.',
  SELF_REVIEW_NOT_ALLOWED: 'You cannot review your own task submission.',
  TEAM_EMPTY: 'A team must have at least one active member.',
  ASSIGNEE_INACTIVE: 'Cannot assign to an inactive employee.',
  IDEMPOTENCY_KEY_REUSED: 'This request was already submitted with different parameters.',
  RATE_LIMITED: 'Too many requests. Please wait a moment before trying again.',
  INTERNAL_ERROR: 'Something went wrong on our end. Please try again later.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again shortly.',
};

export function getErrorMessageForCode(code: ErrorCode): string {
  return ERROR_CODE_MESSAGES[code] ?? ERROR_CODE_MESSAGES.INTERNAL_ERROR;
}

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: FieldError[];
  readonly requestId: string;

  constructor(
    code: ErrorCode,
    status: number,
    details: FieldError[] = [],
    requestId = 'unknown',
    message?: string,
  ) {
    super(message ?? getErrorMessageForCode(code));
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}
