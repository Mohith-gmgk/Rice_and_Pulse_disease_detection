// ============================================================
// auth-supabase.js — Login, Signup, Session via Supabase
// ============================================================

import { supabase } from "./supabase-config.js";

// ============================================================
// TOAST
// ============================================================
export function showToast(message, type = 'success') {
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
  { id: 'req-upper',  regex: /[A-Z]/  },
  { id: 'req-lower',  regex: /[a-z]/  },
  { id: 'req-digit',  regex: /[0-9]/  },
  { id: 'req-symbol', regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/ },
  { id: 'req-length', regex: /.{8,}/  },
];

function validatePassword(password) {
  return PASSWORD_RULES.every(r => r.regex.test(password));
}

export function updatePasswordUI(password, strengthBarId) {
  const score = PASSWORD_RULES.filter(r => r.regex.test(password)).length;
  const segments = document.querySelectorAll(`#${strengthBarId} .strength-segment`);
  const level = score >= 4 ? 'strong' : score >= 2 ? 'fair' : 'weak';
  const labelEl = document.querySelector(`#${strengthBarId} ~ .strength-label`);
  if (labelEl) labelEl.textContent = password.length > 0 ? `Strength: ${level.charAt(0).toUpperCase()+level.slice(1)}` : '';
  segments.forEach((seg, i) => {
    seg.className = 'strength-segment';
    if (i < score) seg.classList.add('filled', level);
  });
  PASSWORD_RULES.forEach(rule => {
    const el = document.getElementById(rule.id);
    if (el) { el.classList.toggle('met', rule.regex.test(password)); el.classList.toggle('unmet', !rule.regex.test(password)); }
  });
}

export function togglePasswordVisibility(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!input || !btn) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁' : '🙈';
}

// ============================================================
// AVATAR UPLOAD PREVIEW
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
// UPLOAD AVATAR TO SUPABASE STORAGE
// ============================================================
async function uploadAvatar(userId, file) {
  if (!file) return null;
  try {
    const ext = file.name.split('.').pop();
    const path = `avatars/${userId}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn('Avatar upload failed:', err.message);
    return null;
  }
}

// ============================================================
// GET CURRENT SESSION & USER PROFILE
// ============================================================
export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

// ============================================================
// REQUIRE AUTH — redirect if not logged in
// ============================================================
export async function requireAuth(callback) {
  const session = await getCurrentSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }
  const profile = await getUserProfile(session.user.id);
  if (callback) callback(session.user, profile);
}

// ============================================================
// LOGOUT
// ============================================================
export async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}

// Make logout available globally
window.logout = logout;

// ============================================================
// LOGIN PAGE
// ============================================================
function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const emailInput    = document.getElementById('login-email');
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
    const email    = emailInput.value.trim();
    const password = passwordInput.value;
    let valid = true;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(emailInput, 'Enter a valid email.'); valid = false; } else setValid(emailInput);
    if (!password) { setError(passwordInput, 'Password is required.'); valid = false; } else setValid(passwordInput);
    if (!valid) return;

    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in...';

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const profile = await getUserProfile(data.user.id);
      showToast(`Welcome back, ${profile?.first_name || 'User'}!`, 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);

    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = 'Sign In';
      const msg = err.message.includes('Invalid') ? 'Invalid email or password.' : err.message;
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

  fields.password.addEventListener('input', () => updatePasswordUI(fields.password.value, 'strength-bar'));

  // Blur validations
  fields.firstName.addEventListener('blur', () => { if (!fields.firstName.value.trim()) setError(fields.firstName, 'First name is required.'); else setValid(fields.firstName); });
  fields.lastName.addEventListener('blur',  () => { if (!fields.lastName.value.trim())  setError(fields.lastName,  'Last name is required.');  else setValid(fields.lastName); });
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
      // 1. Create Supabase Auth user
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      const userId = data.user.id;

      // 2. Upload avatar to Supabase Storage
      const avatarInput = document.getElementById('avatar-input');
      const avatarFile  = avatarInput?.files[0] || null;
      const avatarUrl   = avatarFile ? await uploadAvatar(userId, avatarFile) : null;

      // 3. Save profile to users table
      const { error: dbError } = await supabase.from('users').insert({
        id:         userId,
        email,
        first_name: fields.firstName.value.trim(),
        last_name:  fields.lastName.value.trim(),
        mobile,
        avatar_url: avatarUrl,
      });
      if (dbError) throw dbError;

      showToast('Account created! Please sign in.', 'success');
      setTimeout(() => { window.location.href = 'login.html'; }, 900);

    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = '🌿 Create Account';
      const msg = err.message.includes('already registered') ? 'Email already registered. Please login.' : err.message;
      showToast(msg, 'error');
      if (err.message.includes('already registered')) setError(fields.email, msg);
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
