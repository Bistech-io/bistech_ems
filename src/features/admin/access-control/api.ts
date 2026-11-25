import { z } from 'zod';
import { scopeLevelSchema, successEnvelopeSchema } from '@ems/contracts';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import {
  ROLE_DEFAULT_PERMISSIONS,
  type PermissionKey,
  type RoleName,
  type ScopeLevel,
} from '@/lib/auth/permissions';
import {
  PERMISSION_CATALOG,
  PERMISSION_CATALOG_BY_KEY,
  SYSTEM_ROLE_DESCRIPTIONS,
  formatRoleDisplayName,
  type AccessControlRole,
  type CreateCustomRolePayload,
  type PermissionCatalogItem,
  type RolePermissionGrant,
} from './types';

const rolePermissionDtoSchema = z.object({
  key: z.string(),
  description: z.string().optional(),
  scope: scopeLevelSchema.default('org'),
});

const roleDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  isSystem: z.boolean().default(false),
  createdAt: z.string().optional(),
  _count: z
    .object({
      userRoles: z.number(),
    })
    .optional(),
  userCount: z.number().optional(),
  permissions: z.array(rolePermissionDtoSchema).optional(),
});

const permissionDtoSchema = z.object({
  id: z.string(),
  key: z.string(),
  description: z.string(),
});

const rolesListResponseSchema = successEnvelopeSchema(z.array(roleDtoSchema));
const singleRoleResponseSchema = successEnvelopeSchema(roleDtoSchema);
const permissionsListResponseSchema = successEnvelopeSchema(z.array(permissionDtoSchema));

function resolveDefaultPermissionsForSystemRole(roleName: string): RolePermissionGrant[] {
  const normalizedKey = (
    roleName === 'department_head' ? 'dept_head' : roleName
  ) as RoleName;
  const grantMap = ROLE_DEFAULT_PERMISSIONS[normalizedKey];
  if (!grantMap) return [];

  return (Object.entries(grantMap) as [PermissionKey, ScopeLevel][]).map(([key, scope]) => ({
    key,
    description: PERMISSION_CATALOG_BY_KEY[key]?.description,
    scope,
  }));
}

function mapRoleDto(dto: z.infer<typeof roleDtoSchema>): AccessControlRole {
  const permissions: RolePermissionGrant[] =
    dto.permissions && dto.permissions.length > 0
      ? dto.permissions.map((p) => ({
          key: p.key,
          description: p.description ?? PERMISSION_CATALOG_BY_KEY[p.key]?.description,
          scope: p.scope,
        }))
      : resolveDefaultPermissionsForSystemRole(dto.name);

  return {
    id: dto.id,
    name: dto.name,
    displayName: formatRoleDisplayName(dto.name),
    description:
      dto.description?.trim() ||
      SYSTEM_ROLE_DESCRIPTIONS[dto.name] ||
      'Custom organization role with tailored permissions.',
    isSystem: dto.isSystem,
    userCount: dto._count?.userRoles ?? dto.userCount ?? 0,
    permissions,
    createdAt: dto.createdAt,
  };
}

/**
 * Fetches all organization roles with their granted permissions and member counts.
 * Falls back to default FSD permission matrices for system roles if the backend
 * GET /roles endpoint does not yet include the `permissions` array.
 */
export async function fetchAccessControlRoles(): Promise<AccessControlRole[]> {
  const res = await apiRequest('/roles', {
    method: 'GET',
    schema: rolesListResponseSchema,
  });

  return res.data.map(mapRoleDto);
}

/**
 * Fetches the organization's permission catalog from GET /permissions,
 * merging with the canonical 32-permission FSD catalog if the endpoint is not yet live.
 */
export async function fetchPermissionCatalog(): Promise<PermissionCatalogItem[]> {
  try {
    const res = await apiRequest('/permissions', {
      method: 'GET',
      schema: permissionsListResponseSchema,
    });

    if (res.data.length === 0) {
      return PERMISSION_CATALOG;
    }

    return res.data.map((item) => {
      const known = PERMISSION_CATALOG_BY_KEY[item.key];
      if (known) {
        return {
          ...known,
          id: item.id,
          description: item.description || known.description,
        };
      }
      return {
        id: item.id,
        key: item.key as PermissionKey,
        label: formatRoleDisplayName(item.key.replace(/\./g, '_')),
        description: item.description,
        category: 'Users & Access',
        defaultScope: 'org',
      };
    });
  } catch {
    return PERMISSION_CATALOG;
  }
}

export interface CreateCustomRoleResult {
  role: AccessControlRole;
  syncedWithServer: boolean;
}

/**
 * Creates a custom role via POST /roles.
 * If the backend endpoint is not yet implemented (404/405), returns a local
 * preview role with `syncedWithServer: false` so the UI remains testable.
 */
export async function createCustomRole(
  payload: CreateCustomRolePayload,
): Promise<CreateCustomRoleResult> {
  try {
    const res = await apiRequest('/roles', {
      method: 'POST',
      body: {
        name: payload.name,
        description: payload.description?.trim() || undefined,
        permissions: payload.permissions,
      },
      schema: singleRoleResponseSchema,
    });

    const mapped = mapRoleDto(res.data);
    // Ensure permissions selected in the form are reflected if backend omits them in create response
    if (mapped.permissions.length === 0 && payload.permissions.length > 0) {
      mapped.permissions = payload.permissions.map((p) => ({
        key: p.key,
        description: PERMISSION_CATALOG_BY_KEY[p.key]?.description,
        scope: p.scope,
      }));
    }
    if (payload.displayName?.trim()) {
      mapped.displayName = payload.displayName.trim();
    }

    return { role: mapped, syncedWithServer: true };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
      const localRole: AccessControlRole = {
        id: `local-role-${Date.now()}`,
        name: payload.name,
        displayName: payload.displayName?.trim() || formatRoleDisplayName(payload.name),
        description:
          payload.description?.trim() ||
          'Custom organization role with tailored permissions.',
        isSystem: false,
        userCount: 0,
        permissions: payload.permissions.map((p) => ({
          key: p.key,
          description: PERMISSION_CATALOG_BY_KEY[p.key]?.description,
          scope: p.scope,
        })),
        createdAt: new Date().toISOString(),
      };
      return { role: localRole, syncedWithServer: false };
    }
    throw err;
  }
}
