const User = require('../models/User');
const jwt = require('jsonwebtoken');
const https = require('https');
const crypto = require('crypto');
const { HOSPITAL_SCOPED_ROLES, normalizeHospitalName } = require('../utils/hospitalAccess');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MAX_SUPER_ADMIN_ACCOUNTS = 5;
const SUPER_ADMIN_ROLE_PATTERN = /^super[-_\s]?admin$/i;

const normalizeUserRole = (role = '') => {
  const normalizedRole = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');

  if (normalizedRole === 'superadmin') {
    return 'super-admin';
  }

  return normalizedRole;
};

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const verifyGoogleCredential = (credential) =>
  new Promise((resolve, reject) => {
    const endpoint = new URL('https://oauth2.googleapis.com/tokeninfo');
    endpoint.searchParams.set('id_token', credential);

    const request = https.get(endpoint, (response) => {
      let responseBody = '';

      response.on('data', (chunk) => {
        responseBody += chunk;
      });

      response.on('end', () => {
        let parsedResponse;

        try {
          parsedResponse = JSON.parse(responseBody);
        } catch (parseError) {
          reject(new Error('Google verification failed'));
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(parsedResponse.error_description || 'Google verification failed'));
          return;
        }

        resolve(parsedResponse);
      });
    });

    request.on('error', () => {
      reject(new Error('Unable to verify Google login right now'));
    });

    request.setTimeout(8000, () => {
      request.destroy(new Error('Google verification request timed out'));
    });
  });

const serializeUser = (user) => ({
  id: user._id.toString(),
  _id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: normalizeUserRole(user.role),
  phone: user.phone,
  department: user.department,
  hospitalName: user.hospitalName || '',
  authProvider: user.authProvider || 'local',
  avatar: user.avatar || '',
});

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role: requestedRole,
      phone,
      department,
      hospitalName,
    } = req.body;
    const allowedRoles = ['patient', 'doctor', 'attendant', 'reception', 'admin', 'super-admin'];
    const role = normalizeUserRole(requestedRole || 'patient');
    const normalizedHospitalName = String(hospitalName || '').trim();

    // Validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role selected' });
    }

    if (HOSPITAL_SCOPED_ROLES.includes(role) && !normalizedHospitalName) {
      return res.status(400).json({
        success: false,
        message: 'Hospital name is required for this role',
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    if (role === 'super-admin') {
      const currentSuperAdminCount = await User.countDocuments({
        role: { $regex: SUPER_ADMIN_ROLE_PATTERN },
      });
      if (currentSuperAdminCount >= MAX_SUPER_ADMIN_ACCOUNTS) {
        return res.status(400).json({
          success: false,
          message: `Super admin limit reached. Only ${MAX_SUPER_ADMIN_ACCOUNTS} super admins are allowed.`,
        });
      }
    }

    if (role === 'admin') {
      const escapedHospitalName = escapeRegex(normalizedHospitalName).replace(/\s+/g, '\\s+');
      const existingAdminForHospital = await User.findOne({
        role: 'admin',
        hospitalName: { $regex: `^${escapedHospitalName}$`, $options: 'i' },
      });

      if (existingAdminForHospital) {
        return res.status(400).json({
          success: false,
          message: 'An admin already exists for this hospital',
        });
      }
    }

    // Create user
    user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      department: department || 'General',
      hospitalName: HOSPITAL_SCOPED_ROLES.includes(role) ? normalizedHospitalName : '',
      authProvider: 'local',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password, hospitalName } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Check for user (include password field)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.authProvider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google login. Please continue with Google.',
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const userRole = normalizeUserRole(user.role);

    if (HOSPITAL_SCOPED_ROLES.includes(userRole) && !String(user.hospitalName || '').trim()) {
      return res.status(403).json({
        success: false,
        message: 'Hospital assignment is required for this account',
      });
    }

    if (userRole === 'admin') {
      const normalizedHospitalInput = normalizeHospitalName(hospitalName || '');
      const normalizedUserHospital = normalizeHospitalName(user.hospitalName || '');

      if (!normalizedHospitalInput) {
        return res.status(400).json({
          success: false,
          message: 'Hospital name is required for admin login',
        });
      }

      if (normalizedHospitalInput !== normalizedUserHospital) {
        return res.status(401).json({
          success: false,
          message: 'Invalid hospital for this admin account',
        });
      }
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   POST /api/auth/google
// @desc    Login or register user with Google
// @access  Public
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential || typeof credential !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'Google credential is required' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        message: 'Google login is not configured on the server',
      });
    }

    const googleProfile = await verifyGoogleCredential(credential);

    if (googleProfile.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ success: false, message: 'Invalid Google client' });
    }

    if (googleProfile.email_verified !== 'true' || !googleProfile.email) {
      return res.status(401).json({
        success: false,
        message: 'Google account email could not be verified',
      });
    }

    const email = String(googleProfile.email).toLowerCase();
    let user = await User.findOne({ email });

    if (user) {
      if (user.googleId && user.googleId !== googleProfile.sub) {
        return res.status(401).json({
          success: false,
          message: 'This email is linked to another Google account',
        });
      }

      const updates = {};

      if (!user.googleId) {
        updates.googleId = googleProfile.sub;
      }
      if (!user.avatar && googleProfile.picture) {
        updates.avatar = googleProfile.picture;
      }

      if (Object.keys(updates).length > 0) {
        user = await User.findByIdAndUpdate(user._id, updates, {
          new: true,
        });
      }
    } else {
      const generatedPassword = crypto.randomBytes(24).toString('hex');
      user = await User.create({
        name: googleProfile.name || email.split('@')[0],
        email,
        password: generatedPassword,
        role: 'patient',
        phone: '0000000000',
        department: 'General',
        authProvider: 'google',
        googleId: googleProfile.sub,
        avatar: googleProfile.picture || '',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Google login successful',
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message || 'Google login failed' });
  }
};

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        ...serializeUser(user),
        totalVisits: user.totalVisits,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token deletion)
// @access  Private
exports.logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};
