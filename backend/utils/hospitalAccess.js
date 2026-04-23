const HOSPITAL_SCOPED_ROLES = ['reception', 'attendant', 'admin'];

const normalizeHospitalName = (name = '') =>
  String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');

const getHospitalScopeForUser = (user) => {
  const role = String(user?.role || '').trim().toLowerCase();
  const isScopedRole = HOSPITAL_SCOPED_ROLES.includes(role);
  const hospitalName = String(user?.hospitalName || '').trim();

  return {
    role,
    isScopedRole,
    hospitalName,
    hasHospitalScope: !isScopedRole || Boolean(hospitalName),
  };
};

const ensureHospitalScope = (res, user) => {
  const scope = getHospitalScopeForUser(user);
  if (!scope.hasHospitalScope) {
    res.status(403).json({
      success: false,
      message: 'Hospital assignment is required for this account',
    });
    return null;
  }

  return scope;
};

const belongsToHospital = (resourceHospitalName, expectedHospitalName) =>
  normalizeHospitalName(resourceHospitalName) === normalizeHospitalName(expectedHospitalName);

module.exports = {
  HOSPITAL_SCOPED_ROLES,
  normalizeHospitalName,
  getHospitalScopeForUser,
  ensureHospitalScope,
  belongsToHospital,
};
