// ============================================================
// AUTH.JS — Login & Signup Logic
// ============================================================

// ---- Toast notifications ----
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ---- Field validation helpers ----
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
  if (err) {
    err.textContent = message;
    err.classList.add('show');
  }
}

function clearValidation(input) {
  input.classList.remove('is-invalid', 'is-valid');
  const err = input.closest('.form-group')?.querySelector('.form-error');
  if (err) err.classList.remove('show');
}

// ---- Password requirement rules ----
const PASSWORD_RULES = [
  { id: 'req-upper', regex: /[A-Z]/, label: 'Uppercase letter' },
  { id: 'req-lower', regex: /[a-z]/, label: 'Lowercase letter' },
  { id: 'req-digit', regex: /[0-9]/, label: 'Digit (0-9)' },
  { id: 'req-symbol', regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/, label: 'Special symbol' },
  { id: 'req-length', regex: /.{8,}/, label: 'Min 8 characters' },
];

function checkPasswordStrength(password) {
  const passed = PASSWORD_RULES.filter(r => r.regex.test(password)).length;
  return passed; // 0-5
}

function updatePasswordUI(password, strengthContainerId, reqContainerId) {
  const segments = document.querySelectorAll(`#${strengthContainerId} .strength-segment`);
  const score = checkPasswordStrength(password);

  let level = 'weak';
  if (score >= 4) level = 'strong';
  else if (score >= 2) level = 'fair';

  const labelEl = document.querySelector(`#${strengthContainerId} ~ .strength-label`);
  if (labelEl) {
    const labels = { weak: 'Weak', fair: 'Fair', strong: 'Strong' };
    labelEl.textContent = password.length > 0 ? `Strength: ${labels[level]}` : '';
  }

  segments.forEach((seg, i) => {
    seg.className = 'strength-segment';
    if (i < score) seg.classList.add('filled', level);
  });

  if (reqContainerId) {
    PASSWORD_RULES.forEach(rule => {
      const el = document.getElementById(rule.id);
      if (el) {
        el.classList.toggle('met', rule.regex.test(password));
        el.classList.toggle('unmet', !rule.regex.test(password));
      }
    });
  }
}

function validatePassword(password) {
  return PASSWORD_RULES.every(r => r.regex.test(password));
}

// ---- Toggle password visibility ----
function togglePasswordVisibility(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!input || !btn) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

// ---- Profile picture preview ----
function initAvatarUpload(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;

  preview.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      preview.innerHTML = `<img src="${e.target.result}" alt="Profile">`;
    };
    reader.readAsDataURL(file);
  });
}

// ---- Mock auth storage (localStorage for demo) ----
function getUsers() {
  return JSON.parse(localStorage.getItem('cropUsers') || '[]');
}

function saveUser(user) {
  const users = getUsers();
  users.push(user);
  localStorage.setItem('cropUsers', JSON.stringify(users));
}

function findUserByEmail(email) {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

function setCurrentUser(user) {
  localStorage.setItem('cropCurrentUser', JSON.stringify(user));
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('cropCurrentUser') || 'null');
}

function logout() {
  localStorage.removeItem('cropCurrentUser');
  window.location.href = '../pages/login.html';
}

// Redirect if not logged in (call on protected pages)
function requireAuth() {
  if (!getCurrentUser()) {
    window.location.href = '../pages/login.html';
  }
}

// ============================================================
// LOGIN PAGE
// ============================================================
function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  // Real-time validation
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

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email) { setError(emailInput, 'Email is required.'); valid = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(emailInput, 'Enter a valid email.'); valid = false; }
    else setValid(emailInput);

    if (!password) { setError(passwordInput, 'Password is required.'); valid = false; }
    else setValid(passwordInput);

    if (!valid) return;

    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in...';

    setTimeout(() => {
      const user = findUserByEmail(email);
      if (!user || user.password !== password) {
        btn.disabled = false;
        btn.innerHTML = 'Sign In';
        setError(passwordInput, 'Invalid email or password.');
        setError(emailInput, ' ');
        showToast('Invalid credentials. Try again.', 'error');
        return;
      }
      setCurrentUser(user);
      showToast('Welcome back, ' + user.firstName + '!', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    }, 900);
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
    lastName: document.getElementById('signup-lastname'),
    email: document.getElementById('signup-email'),
    mobile: document.getElementById('signup-mobile'),
    password: document.getElementById('signup-password'),
    confirm: document.getElementById('signup-confirm'),
  };

  // Password strength live update
  fields.password.addEventListener('input', () => {
    updatePasswordUI(fields.password.value, 'strength-bar', 'pw-requirements');
  });

  // Real-time validations
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
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) setError(fields.email, 'Enter a valid email address.');
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
    else if (!validatePassword(fields.password.value)) setError(fields.password, 'Password does not meet requirements.');
    else setValid(fields.password);
  });

  fields.confirm.addEventListener('blur', () => {
    if (!fields.confirm.value) setError(fields.confirm, 'Please confirm your password.');
    else if (fields.confirm.value !== fields.password.value) setError(fields.confirm, 'Passwords do not match.');
    else setValid(fields.confirm);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    // Validate all fields
    if (!fields.firstName.value.trim()) { setError(fields.firstName, 'First name is required.'); valid = false; }
    else setValid(fields.firstName);

    if (!fields.lastName.value.trim()) { setError(fields.lastName, 'Last name is required.'); valid = false; }
    else setValid(fields.lastName);

    const email = fields.email.value.trim();
    if (!email) { setError(fields.email, 'Email is required.'); valid = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(fields.email, 'Enter a valid email.'); valid = false; }
    else setValid(fields.email);

    const mobile = fields.mobile.value.trim();
    if (!mobile) { setError(fields.mobile, 'Mobile number is required.'); valid = false; }
    else if (!/^[0-9+\-\s]{7,15}$/.test(mobile)) { setError(fields.mobile, 'Enter a valid mobile number.'); valid = false; }
    else setValid(fields.mobile);

    const password = fields.password.value;
    if (!password) { setError(fields.password, 'Password is required.'); valid = false; }
    else if (!validatePassword(password)) { setError(fields.password, 'Password does not meet all requirements.'); valid = false; }
    else setValid(fields.password);

    const confirm = fields.confirm.value;
    if (!confirm) { setError(fields.confirm, 'Please confirm your password.'); valid = false; }
    else if (confirm !== password) { setError(fields.confirm, 'Passwords do not match.'); valid = false; }
    else setValid(fields.confirm);

    if (!valid) {
      showToast('Please fill all required fields correctly.', 'error');
      return;
    }

    // Check duplicate email
    if (findUserByEmail(email)) {
      setError(fields.email, 'This email is already registered.');
      showToast('Email already registered. Please login.', 'error');
      return;
    }

    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating Account...';

    // Get avatar
    const avatarInput = document.getElementById('avatar-input');
    const avatarPreviewImg = document.querySelector('#avatar-preview img');
    const avatarSrc = avatarPreviewImg ? avatarPreviewImg.src : null;

    setTimeout(() => {
      const user = {
        id: Date.now().toString(),
        firstName: fields.firstName.value.trim(),
        lastName: fields.lastName.value.trim(),
        email,
        mobile,
        password,
        avatar: avatarSrc,
        createdAt: new Date().toISOString(),
        predictions: [],
      };
      saveUser(user);
      setCurrentUser(user);
      showToast('Account created! Redirecting...', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
    }, 1000);
  });
}

// ---- Init on DOM ready ----
document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
  initSignupPage();
});
