const ROLE_ALIAS_MAP = {
  superadmin: 'super-admin',
  'super admin': 'super-admin',
  super_admin: 'super-admin',
};

export const normalizeRole = (role) => {
  const rawRole = String(role || '').trim().toLowerCase();
  if (!rawRole) {
    return '';
  }

  if (ROLE_ALIAS_MAP[rawRole]) {
    return ROLE_ALIAS_MAP[rawRole];
  }

  const dashedRole = rawRole.replace(/[_\s]+/g, '-');
  return ROLE_ALIAS_MAP[dashedRole] || dashedRole;
};

export const normalizeUserRole = (user) => {
  if (!user || typeof user !== 'object') {
    return user;
  }

  const normalizedRole = normalizeRole(user.role);
  if (!normalizedRole || normalizedRole === user.role) {
    return user;
  }

  return {
    ...user,
    role: normalizedRole,
  };
};
