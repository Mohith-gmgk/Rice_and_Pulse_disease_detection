// ============================================================
// auth-firebase.js — Firebase Authentication & User Storage
// ============================================================

import { auth, db, storage } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref, uploadDataUrl, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ============================================================
// FORM VALIDATION HELPERS
// ============================================================
function setValid(input) {
  input.classList.remove('is-invalid');
  input.classList.add('is-valid');
  const err = input.closest('.form-group')?.querySelector('.form-error');
  if (err) err.classList.remove('show');
}

function setError(input, message) {
  input.classList.remove('is-valid');
  input.classList.add('is-invalid');
  const err = input.closest('.form-group')?.querySelector('.form-error');
  if (err) { err.textContent = message; err.classList.add('show'); }
}

// ============================================================
// PASSWORD VALIDATION
// ============================================================
const PASSWORD_RULES = [
  { id: 'req-upper',  regex: /[A-Z]/,  label: 'Uppercase letter' },
  { id: 'req-lower',  regex: /[a-z]/,  label: 'Lowercase letter' },
  { id: 'req-digit',  regex: /[0-9]/,  label: 'Digit (0-9)' },
  { id: 'req-symbol', regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/, label: 'Special symbol' },
  { id: 'req-length', regex: /.{8,}/,  label: 'Min 8 characters' },
];

function validatePassword(password) {
  return PASSWORD_RULES.every(r => r.regex.test(password));
}

function updatePasswordUI(password, strengthBarId, reqContainerId) {
  const score = PASSWORD_RULES.filter(r => r.regex.test(password)).length;
  const segments = document.querySelectorAll(`#${strengthBarId} .strength-segment`);
  let level = score >= 4 ? 'strong' : score >= 2 ? 'fair' : 'weak';

  const labelEl = document.querySelector(`#${strengthBarId} ~ .strength-label`);
  if (labelEl) labelEl.textContent = password.length > 0 ? `Strength: ${level.charAt(0).toUpperCase() + level.slice(1)}` : '';

  segments.forEach((seg, i) => {
    seg.className = 'strength-segment';
    if (i < score) seg.classList.add('filled', level);
  });

  PASSWORD_RULES.forEach(rule => {
    const el = document.getElementById(rule.id);
    if (el) {
      el.classList.toggle('met', rule.regex.test(password));
      el.classList.toggle('unmet', !rule.regex.test(password));
    }
  });
}

function togglePasswordVisibility(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!input || !btn) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁' : '🙈';
}

// ============================================================
// PROFILE PICTURE UPLOAD PREVIEW
// ============================================================
function initAvatarUpload(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;
  preview.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => { preview.innerHTML = `<img src="${e.target.result}" alt="Profile">`; };
    reader.readAsDataURL(file);
  });
}

// ============================================================
// UPLOAD AVATAR TO FIREBASE STORAGE
// ============================================================
async function uploadAvatar(userId, dataUrl) {
  if (!dataUrl) return null;
  try {
    const storageRef = ref(storage, `avatars/${userId}.jpg`);
    // Use uploadString for base64 data URLs
    const { uploadString, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js");
    await uploadString(storageRef, dataUrl, 'data_url');
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (err) {
    console.warn('Avatar upload failed:', err);
    return null;
  }
}

// ============================================================
// GET CURRENT USER FROM FIRESTORE
// ============================================================
async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// Save user profile to session
function cacheUser(userData) {
  sessionStorage.setItem('cropUser', JSON.stringify(userData));
}

function getCachedUser() {
  return JSON.parse(sessionStorage.getItem('cropUser') || 'null');
}

// ============================================================
// AUTH STATE OBSERVER — call on protected pages
// ============================================================
function requireAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    let profile = getCachedUser();
    if (!profile || profile.uid !== user.uid) {
      profile = await fetchUserProfile(user.uid);
      if (profile) cacheUser(profile);
    }
    if (callback) callback(user, profile);
  });
}

// ============================================================
// LOGOUT
// ============================================================
async function logout() {
  await signOut(auth);
  sessionStorage.removeItem('cropUser');
  window.location.href = 'login.html';
}

// ============================================================
// LOGIN PAGE
// ============================================================
function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  emailInput.addEventListener('blur', () => {
    const v = emailInput.value.trim();
    if (!v) setError(emailInput, 'Email is required.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) setError(emailInput, 'Enter a valid email.');
    else setValid(emailInput);
  });

  passwordInput.addEventListener('blur', () => {
    if (!passwordInput.value) setError(passwordInput, 'Password is required.');
    else setValid(passwordInput);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let valid = true;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(emailInput, 'Enter a valid email.'); valid = false; }
    else setValid(emailInput);
    if (!password) { setError(passwordInput, 'Password is required.'); valid = false; }
    else setValid(passwordInput);
    if (!valid) return;

    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in...';

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await fetchUserProfile(userCred.user.uid);
      cacheUser(profile);
      showToast(`Welcome back, ${profile.firstName}!`, 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = 'Sign In';
      const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
        ? 'Invalid email or password.'
        : err.code === 'auth/user-not-found'
        ? 'No account found with this email.'
        : 'Sign in failed. Try again.';
      setError(passwordInput, msg);
      showToast(msg, 'error');
    }
  });
}

// ============================================================
// SIGNUP PAGE
// ============================================================
function initSignupPage() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  initAvatarUpload('avatar-input', 'avatar-preview');

  const fields = {
    firstName: document.getElementById('signup-firstname'),
    lastName:  document.getElementById('signup-lastname'),
    email:     document.getElementById('signup-email'),
    mobile:    document.getElementById('signup-mobile'),
    password:  document.getElementById('signup-password'),
    confirm:   document.getElementById('signup-confirm'),
  };

  fields.password.addEventListener('input', () => {
    updatePasswordUI(fields.password.value, 'strength-bar', 'pw-requirements');
  });

  // Blur validations
  fields.firstName.addEventListener('blur', () => {
    if (!fields.firstName.value.trim()) setError(fields.firstName, 'First name is required.');
    else setValid(fields.firstName);
  });
  fields.lastName.addEventListener('blur', () => {
    if (!fields.lastName.value.trim()) setError(fields.lastName, 'Last name is required.');
    else setValid(fields.lastName);
  });
  fields.email.addEventListener('blur', () => {
    const v = fields.email.value.trim();
    if (!v) setError(fields.email, 'Email is required.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) setError(fields.email, 'Enter a valid email.');
    else setValid(fields.email);
  });
  fields.mobile.addEventListener('blur', () => {
    const v = fields.mobile.value.trim();
    if (!v) setError(fields.mobile, 'Mobile number is required.');
    else if (!/^[0-9+\-\s]{7,15}$/.test(v)) setError(fields.mobile, 'Enter a valid mobile number.');
    else setValid(fields.mobile);
  });
  fields.password.addEventListener('blur', () => {
    if (!fields.password.value) setError(fields.password, 'Password is required.');
    else if (!validatePassword(fields.password.value)) setError(fields.password, 'Password does not meet all requirements.');
    else setValid(fields.password);
  });
  fields.confirm.addEventListener('blur', () => {
    if (!fields.confirm.value) setError(fields.confirm, 'Please confirm your password.');
    else if (fields.confirm.value !== fields.password.value) setError(fields.confirm, 'Passwords do not match.');
    else setValid(fields.confirm);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let valid = true;

    if (!fields.firstName.value.trim()) { setError(fields.firstName, 'First name is required.'); valid = false; } else setValid(fields.firstName);
    if (!fields.lastName.value.trim())  { setError(fields.lastName,  'Last name is required.');  valid = false; } else setValid(fields.lastName);

    const email = fields.email.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(fields.email, 'Enter a valid email.'); valid = false; } else setValid(fields.email);

    const mobile = fields.mobile.value.trim();
    if (!mobile || !/^[0-9+\-\s]{7,15}$/.test(mobile)) { setError(fields.mobile, 'Enter a valid mobile number.'); valid = false; } else setValid(fields.mobile);

    const password = fields.password.value;
    if (!password || !validatePassword(password)) { setError(fields.password, 'Password does not meet all requirements.'); valid = false; } else setValid(fields.password);

    const confirm = fields.confirm.value;
    if (!confirm || confirm !== password) { setError(fields.confirm, 'Passwords do not match.'); valid = false; } else setValid(fields.confirm);

    if (!valid) { showToast('Please fill all fields correctly.', 'error'); return; }

    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating Account...';

    try {
      // 1. Create Firebase Auth user
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      // 2. Upload avatar to Firebase Storage
      const avatarPreviewImg = document.querySelector('#avatar-preview img');
      const avatarUrl = avatarPreviewImg
        ? await uploadAvatar(uid, avatarPreviewImg.src)
        : null;

      // 3. Save profile to Firestore
      const userData = {
        uid,
        firstName: fields.firstName.value.trim(),
        lastName:  fields.lastName.value.trim(),
        email,
        mobile,
        avatar: avatarUrl || null,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', uid), userData);
      cacheUser({ ...userData, createdAt: new Date().toISOString() });

      showToast('Account created! Redirecting...', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);

    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = '🌿 Create Account';
      const msg = err.code === 'auth/email-already-in-use'
        ? 'This email is already registered. Please login.'
        : err.code === 'auth/weak-password'
        ? 'Password is too weak.'
        : 'Sign up failed. Please try again.';
      showToast(msg, 'error');
      if (err.code === 'auth/email-already-in-use') setError(fields.email, msg);
    }
  });
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
  initSignupPage();
});

// Export for use in other files
export { requireAuth, logout, fetchUserProfile, getCachedUser, showToast };
