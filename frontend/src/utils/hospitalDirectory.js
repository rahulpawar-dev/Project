const HOSPITAL_STAFF_STORAGE_KEY = 'pqms_hospital_staff_v1';
const HOSPITAL_CATALOG_STORAGE_KEY = 'pqms_hospital_catalog_v1';

export const DEFAULT_DEMO_LOCATION = { latitude: 18.5204, longitude: 73.8567 };
export const DEFAULT_NEARBY_RADIUS_KM = 10;

const DEFAULT_HOSPITAL_BLUEPRINTS = [
  {
    id: 'demo-1',
    name: 'City Care Multispeciality Hospital',
    address: 'MG Road, Pune',
    phone: '+91-20-4100-1001',
    departments: ['General', 'Cardiology', 'Orthopedics'],
    emergency: true,
    currentWaitTime: '18 min',
    rating: 4.4,
    offset: { lat: 0.006, lng: 0.003 },
  },
  {
    id: 'demo-2',
    name: 'Sunrise Health Center',
    address: 'JM Road, Pune',
    phone: '+91-20-4100-1002',
    departments: ['General', 'Neurology', 'Pediatrics'],
    emergency: false,
    currentWaitTime: '12 min',
    rating: 4.2,
    offset: { lat: -0.004, lng: 0.005 },
  },
  {
    id: 'demo-3',
    name: 'Apex Heart & Trauma Hospital',
    address: 'Shivajinagar, Pune',
    phone: '+91-20-4100-1003',
    departments: ['Cardiology', 'Emergency', 'General'],
    emergency: true,
    currentWaitTime: '25 min',
    rating: 4.6,
    offset: { lat: 0.003, lng: -0.006 },
  },
  {
    id: 'demo-4',
    name: 'Green Valley Medical Institute',
    address: 'Baner Road, Pune',
    phone: '+91-20-4100-1004',
    departments: ['General', 'Orthopedics', 'Pediatrics'],
    emergency: false,
    currentWaitTime: '15 min',
    rating: 4.1,
    offset: { lat: -0.007, lng: -0.004 },
  },
];

const canUseLocalStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const randomSuffix = () => Math.random().toString(36).slice(2, 8);

const normalizeDepartmentList = (value) => {
  const source = Array.isArray(value)
    ? value
    : String(value || '')
      .split(',')
      .map((item) => item.trim());

  const normalized = source
    .map((department) => String(department || '').trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return ['General'];
  }

  return [...new Set(normalized)];
};

const toNumberOrDefault = (value, defaultValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', '1'].includes(normalized)) {
      return true;
    }
    if (['false', 'no', '0'].includes(normalized)) {
      return false;
    }
  }

  return fallback;
};

const normalizeCoordinate = (value, minimum, maximum) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    return null;
  }

  return Number(parsed.toFixed(6));
};

const normalizeCatalogLocation = (locationLike) => {
  const lat = normalizeCoordinate(locationLike?.lat, -90, 90);
  const lng = normalizeCoordinate(locationLike?.lng, -180, 180);

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng };
};

const createOffsetFromSeed = (seed = 'hospital') => {
  const text = String(seed || 'hospital');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 100000;
  }

  const lat = ((hash % 140) - 70) / 10000;
  const lng = ((Math.floor(hash / 140) % 140) - 70) / 10000;

  return { lat, lng };
};

const normalizeOffset = (offset, seed) => {
  const fallback = createOffsetFromSeed(seed);
  const lat = Number(offset?.lat);
  const lng = Number(offset?.lng);

  return {
    lat: Number.isFinite(lat) ? lat : fallback.lat,
    lng: Number.isFinite(lng) ? lng : fallback.lng,
  };
};

const getFallbackHospitalLocation = (hospital, seed) => {
  const offset = normalizeOffset(hospital?.offset, seed);
  return {
    lat: Number((DEFAULT_DEMO_LOCATION.latitude + offset.lat).toFixed(6)),
    lng: Number((DEFAULT_DEMO_LOCATION.longitude + offset.lng).toFixed(6)),
  };
};

export const normalizeHospitalName = (name = '') =>
  name.trim().toLowerCase().replace(/\s+/g, ' ');

export const isValidHospitalGeoLocation = (locationLike) =>
  Boolean(normalizeCatalogLocation(locationLike));

const normalizeHospitalBlueprint = (hospital) => {
  const name = String(hospital?.name || '').trim().replace(/\s+/g, ' ');

  if (!name) {
    return null;
  }

  const generatedId = `hospital-${Date.now()}-${randomSuffix()}`;
  const id = String(hospital?.id || generatedId).trim() || generatedId;
  const rating = Math.max(0, Math.min(5, toNumberOrDefault(hospital?.rating, 4.2)));
  const currentWaitTime = String(hospital?.currentWaitTime || '').trim() || '15 min';
  const offset = normalizeOffset(hospital?.offset, id || name);
  const location = normalizeCatalogLocation(hospital?.location)
    || normalizeCatalogLocation({
      lat: hospital?.latitude,
      lng: hospital?.longitude,
    })
    || getFallbackHospitalLocation({ offset }, id || name);

  return {
    id,
    name,
    address: String(hospital?.address || 'Address not available').trim() || 'Address not available',
    phone: String(hospital?.phone || 'Not available').trim() || 'Not available',
    departments: normalizeDepartmentList(hospital?.departments),
    emergency: parseBoolean(hospital?.emergency, false),
    currentWaitTime,
    rating,
    location,
    offset,
  };
};

const createDefaultHospitalCatalog = () =>
  DEFAULT_HOSPITAL_BLUEPRINTS.map((hospital) => normalizeHospitalBlueprint(hospital)).filter(Boolean);

const persistHospitalCatalog = (catalog) => {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(HOSPITAL_CATALOG_STORAGE_KEY, JSON.stringify(catalog));
};

export const getHospitalCatalog = () => {
  if (!canUseLocalStorage()) {
    return createDefaultHospitalCatalog();
  }

  const raw = window.localStorage.getItem(HOSPITAL_CATALOG_STORAGE_KEY);
  if (!raw) {
    const defaults = createDefaultHospitalCatalog();
    persistHospitalCatalog(defaults);
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const defaults = createDefaultHospitalCatalog();
      persistHospitalCatalog(defaults);
      return defaults;
    }

    const normalized = parsed
      .map((hospital) => normalizeHospitalBlueprint(hospital))
      .filter(Boolean);

    if (normalized.length === 0) {
      const defaults = createDefaultHospitalCatalog();
      persistHospitalCatalog(defaults);
      return defaults;
    }

    persistHospitalCatalog(normalized);
    return normalized;
  } catch (error) {
    const defaults = createDefaultHospitalCatalog();
    persistHospitalCatalog(defaults);
    return defaults;
  }
};

export const buildInitials = (name = '') => {
  const parts = name
    .trim()
    .split(' ')
    .filter(Boolean);
  if (parts.length === 0) {
    return 'NA';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

export const createDemoAvatarDataUrl = (
  name,
  backgroundColor = '#667eea',
  foregroundColor = '#ffffff'
) => {
  const initials = buildInitials(name);
  const safeInitials = initials
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="14" fill="${backgroundColor}"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-size="36" font-family="Segoe UI,Arial,sans-serif" font-weight="700" fill="${foregroundColor}">${safeInitials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const normalizeRole = (role) => (role === 'reception' ? 'reception' : 'doctor');

const normalizeEntry = (entry) => {
  const hospitalName = String(entry?.hospitalName || '').trim();
  const name = String(entry?.name || '').trim();
  const role = normalizeRole(String(entry?.role || 'doctor').trim().toLowerCase());
  const department = String(entry?.department || 'General').trim() || 'General';

  if (!hospitalName || !name) {
    return null;
  }

  const baseColor = role === 'doctor' ? '#667eea' : '#0ea5e9';
  const normalized = {
    id: String(entry?.id || `staff-${Date.now()}-${randomSuffix()}`),
    hospitalName,
    role,
    name,
    department,
    experienceYears: role === 'doctor' ? Math.max(0, toNumberOrDefault(entry?.experienceYears, 0)) : 0,
    shift: role === 'reception' ? String(entry?.shift || 'Day Shift').trim() || 'Day Shift' : '',
    phone: String(entry?.phone || '').trim() || 'Not available',
    rating: Math.max(0, Math.min(5, toNumberOrDefault(entry?.rating, 4.7))),
    image:
      String(entry?.image || '').trim()
      || createDemoAvatarDataUrl(name, baseColor, '#ffffff'),
  };

  return normalized;
};

const createDefaultHospitalStaffEntries = () => {
  const defaults = [
    {
      id: 'staff-demo-1',
      hospitalName: 'City Care Multispeciality Hospital',
      role: 'doctor',
      name: 'Dr. Aditi Sharma',
      department: 'Cardiology',
      experienceYears: 12,
      phone: '+91-98765-10001',
      rating: 4.8,
    },
    {
      id: 'staff-demo-2',
      hospitalName: 'City Care Multispeciality Hospital',
      role: 'doctor',
      name: 'Dr. Raj Patel',
      department: 'Orthopedics',
      experienceYears: 9,
      phone: '+91-98765-10002',
      rating: 4.7,
    },
    {
      id: 'staff-demo-3',
      hospitalName: 'City Care Multispeciality Hospital',
      role: 'reception',
      name: 'Neha Joshi',
      department: 'Front Desk',
      shift: 'Morning Shift',
      phone: '+91-98765-10011',
    },
    {
      id: 'staff-demo-4',
      hospitalName: 'Sunrise Health Center',
      role: 'doctor',
      name: 'Dr. Karan Mehta',
      department: 'Neurology',
      experienceYears: 10,
      phone: '+91-98765-20001',
      rating: 4.6,
    },
    {
      id: 'staff-demo-5',
      hospitalName: 'Sunrise Health Center',
      role: 'reception',
      name: 'Pooja Nair',
      department: 'Front Desk',
      shift: 'Evening Shift',
      phone: '+91-98765-20011',
    },
    {
      id: 'staff-demo-6',
      hospitalName: 'Apex Heart & Trauma Hospital',
      role: 'doctor',
      name: 'Dr. Vikram Singh',
      department: 'Emergency',
      experienceYears: 14,
      phone: '+91-98765-30001',
      rating: 4.9,
    },
    {
      id: 'staff-demo-7',
      hospitalName: 'Apex Heart & Trauma Hospital',
      role: 'reception',
      name: 'Ritu Kapoor',
      department: 'Emergency Desk',
      shift: 'Night Shift',
      phone: '+91-98765-30011',
    },
    {
      id: 'staff-demo-8',
      hospitalName: 'Green Valley Medical Institute',
      role: 'doctor',
      name: 'Dr. Sneha Kulkarni',
      department: 'Pediatrics',
      experienceYears: 8,
      phone: '+91-98765-40001',
      rating: 4.5,
    },
    {
      id: 'staff-demo-9',
      hospitalName: 'Green Valley Medical Institute',
      role: 'reception',
      name: 'Aman Verma',
      department: 'Front Desk',
      shift: 'Morning Shift',
      phone: '+91-98765-40011',
    },
  ];

  return defaults.map((entry) => normalizeEntry(entry)).filter(Boolean);
};

const persistEntries = (entries) => {
  if (!canUseLocalStorage()) {
    return;
  }
  window.localStorage.setItem(HOSPITAL_STAFF_STORAGE_KEY, JSON.stringify(entries));
};

export const addHospitalCatalogEntry = (hospital) => {
  const providedLocation = normalizeCatalogLocation(hospital?.location)
    || normalizeCatalogLocation({
      lat: hospital?.latitude,
      lng: hospital?.longitude,
    });

  if (!providedLocation) {
    throw new Error('Hospital latitude and longitude are required.');
  }

  const normalized = normalizeHospitalBlueprint({
    ...hospital,
    location: providedLocation,
    id: `hospital-${Date.now()}-${randomSuffix()}`,
  });

  if (!normalized) {
    throw new Error('Please provide valid hospital details.');
  }

  const currentCatalog = getHospitalCatalog();
  const targetName = normalizeHospitalName(normalized.name);
  const alreadyExists = currentCatalog.some(
    (entry) => normalizeHospitalName(entry.name) === targetName
  );

  if (alreadyExists) {
    throw new Error('Hospital with this name already exists.');
  }

  const updatedCatalog = [normalized, ...currentCatalog];
  persistHospitalCatalog(updatedCatalog);

  return normalized;
};

export const removeHospitalCatalogEntry = (hospitalId) => {
  const targetId = String(hospitalId || '').trim();
  if (!targetId) {
    throw new Error('Hospital identifier is required.');
  }

  const currentCatalog = getHospitalCatalog();
  const targetHospital = currentCatalog.find((hospital) => hospital.id === targetId);

  if (!targetHospital) {
    throw new Error('Hospital not found.');
  }

  const updatedCatalog = currentCatalog.filter((hospital) => hospital.id !== targetId);
  persistHospitalCatalog(updatedCatalog);

  const targetName = normalizeHospitalName(targetHospital.name);
  const remainingStaff = getHospitalStaffEntries().filter(
    (entry) => normalizeHospitalName(entry.hospitalName) !== targetName
  );
  persistEntries(remainingStaff);

  return updatedCatalog;
};

export const getHospitalStaffEntries = () => {
  if (!canUseLocalStorage()) {
    return createDefaultHospitalStaffEntries();
  }

  const raw = window.localStorage.getItem(HOSPITAL_STAFF_STORAGE_KEY);
  if (!raw) {
    const defaults = createDefaultHospitalStaffEntries();
    persistEntries(defaults);
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const defaults = createDefaultHospitalStaffEntries();
      persistEntries(defaults);
      return defaults;
    }

    const normalized = parsed.map((entry) => normalizeEntry(entry)).filter(Boolean);
    persistEntries(normalized);
    return normalized;
  } catch (error) {
    const defaults = createDefaultHospitalStaffEntries();
    persistEntries(defaults);
    return defaults;
  }
};

export const addHospitalStaffEntry = (entry) => {
  const normalized = normalizeEntry({
    ...entry,
    id: `staff-${Date.now()}-${randomSuffix()}`,
  });

  if (!normalized) {
    throw new Error('Please provide valid staff details.');
  }

  const current = getHospitalStaffEntries();
  const updated = [normalized, ...current];
  persistEntries(updated);
  return normalized;
};

export const removeHospitalStaffEntry = (entryId) => {
  const current = getHospitalStaffEntries();
  const updated = current.filter((entry) => entry.id !== entryId);
  persistEntries(updated);
  return updated;
};

export const getHospitalNameSuggestions = () => {
  const names = new Set(getHospitalCatalog().map((hospital) => hospital.name));
  getHospitalStaffEntries().forEach((entry) => {
    if (entry.hospitalName) {
      names.add(entry.hospitalName);
    }
  });

  return [...names].sort((a, b) => a.localeCompare(b));
};

const mergeDoctors = (baseDoctors = {}, additionalDoctors = {}) => {
  const merged = { ...baseDoctors };

  Object.entries(additionalDoctors).forEach(([department, doctors]) => {
    const existing = Array.isArray(merged[department]) ? merged[department] : [];
    merged[department] = [...existing, ...doctors];
  });

  return merged;
};

export const getHospitalStaffForHospital = (hospitalName, entries = getHospitalStaffEntries()) => {
  const target = normalizeHospitalName(hospitalName);
  const matching = entries.filter(
    (entry) => normalizeHospitalName(entry.hospitalName) === target
  );

  const doctorsByDepartment = {};
  const receptionStaff = [];

  matching.forEach((entry) => {
    if (entry.role === 'doctor') {
      const department = entry.department || 'General';
      if (!doctorsByDepartment[department]) {
        doctorsByDepartment[department] = [];
      }
      doctorsByDepartment[department].push({
        id: entry.id,
        name: entry.name,
        experience: `${entry.experienceYears} years experience`,
        rating: entry.rating,
        initials: buildInitials(entry.name),
        image: entry.image,
        phone: entry.phone,
      });
    } else if (entry.role === 'reception') {
      receptionStaff.push({
        id: entry.id,
        name: entry.name,
        shift: entry.shift || 'Day Shift',
        phone: entry.phone,
        initials: buildInitials(entry.name),
        image: entry.image,
      });
    }
  });

  return { doctorsByDepartment, receptionStaff };
};

export const attachHospitalStaffToHospital = (
  hospital,
  entries = getHospitalStaffEntries()
) => {
  const { doctorsByDepartment, receptionStaff } = getHospitalStaffForHospital(
    hospital.name,
    entries
  );

  const mergedDoctors = mergeDoctors(hospital.doctors || {}, doctorsByDepartment);

  return {
    ...hospital,
    doctors: mergedDoctors,
    receptionStaff,
  };
};

export const getDemoHospitalsForLocation = (
  location,
  calculateDistanceKm,
  entries = getHospitalStaffEntries(),
  hospitalCatalog = getHospitalCatalog(),
  radiusKm = DEFAULT_NEARBY_RADIUS_KM
) => {
  const origin = { lat: location.latitude, lng: location.longitude };
  const catalog = Array.isArray(hospitalCatalog) ? hospitalCatalog : getHospitalCatalog();
  const safeRadiusKm = Number.isFinite(Number(radiusKm)) && Number(radiusKm) > 0
    ? Number(radiusKm)
    : DEFAULT_NEARBY_RADIUS_KM;

  return catalog.map((hospital) => {
    const resolvedLocation = normalizeCatalogLocation(hospital.location)
      || getFallbackHospitalLocation(hospital, hospital.id || hospital.name);
    const distanceKm = calculateDistanceKm(origin, resolvedLocation);

    const baseHospital = {
      id: hospital.id,
      placeId: null,
      name: hospital.name,
      address: hospital.address,
      rating: hospital.rating,
      userRatingsTotal: null,
      phone: hospital.phone,
      isOpenNow: true,
      distanceKm,
      distance: `${distanceKm.toFixed(1)} km`,
      location: resolvedLocation,
      departments: hospital.departments,
      doctors: {},
      receptionStaff: [],
      currentWaitTime: hospital.currentWaitTime,
      emergency: hospital.emergency,
    };

    return attachHospitalStaffToHospital(baseHospital, entries);
  })
    .filter((hospital) => hospital.distanceKm <= safeRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
};
