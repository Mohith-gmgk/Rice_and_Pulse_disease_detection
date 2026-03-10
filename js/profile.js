// ============================================================
// profile.js — User Profile Update Page
// ============================================================
import { supabase } from "./supabase-config.js";
import { requireAuth, showToast, togglePasswordVisibility } from "./auth-supabase.js";

window.togglePasswordVisibility = togglePasswordVisibility;

let currentUser = null;
let currentProfile = null;
let newAvatarFile = null;

document.addEventListener('DOMContentLoaded', () => {
  requireAuth((user, profile) => {
    currentUser = user;
    currentProfile = profile;
    loadProfile(profile);
    initAvatarUpload();
  });
});

function loadProfile(profile) {
  if (!profile) return;

  // Sidebar
  const nameEl   = document.getElementById('sidebar-user-name');
  const emailEl  = document.getElementById('sidebar-user-email');
  const avatarEl = document.getElementById('sidebar-avatar');
  if (nameEl)  nameEl.textContent  = `${profile.first_name} ${profile.last_name}`;
  if (emailEl) emailEl.textContent = profile.email;
  if (avatarEl) {
    avatarEl.innerHTML = profile.avatar_url
      ? `<img src="${profile.avatar_url}" alt="avatar">`
      : profile.first_name.charAt(0).toUpperCase();
  }

  // Profile card
  const previewEl = document.getElementById('profile-avatar-preview');
  if (previewEl) {
    previewEl.innerHTML = profile.avatar_url
      ? `<img src="${profile.avatar_url}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : profile.first_name.charAt(0).toUpperCase();
  }

  const nameDisplay  = document.getElementById('profile-name-display');
  const emailDisplay = document.getElementById('profile-email-display');
  const joinedEl     = document.getElementById('profile-joined');
  if (nameDisplay)  nameDisplay.textContent  = `${profile.first_name} ${profile.last_name}`;
  if (emailDisplay) emailDisplay.textContent = profile.email;
  if (joinedEl) {
    const date = new Date(profile.created_at);
    joinedEl.textContent = `Joined ${date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;
  }

  // Fill form fields
  const fn = document.getElementById('profile-firstname');
  const ln = document.getElementById('profile-lastname');
  const mb = document.getElementById('profile-mobile');
  const em = document.getElementById('profile-email');
  if (fn) fn.value = profile.first_name || '';
  if (ln) ln.value = profile.last_name  || '';
  if (mb) mb.value = profile.mobile     || '';
  if (em) em.value = profile.email      || '';
}

function initAvatarUpload() {
  const input = document.getElementById('avatar-input');
  if (!input) return;
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    newAvatarFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('profile-avatar-preview');
      if (preview) preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      // Also update sidebar avatar
      const sidebarAvatar = document.getElementById('sidebar-avatar');
      if (sidebarAvatar) sidebarAvatar.innerHTML = `<img src="${e.target.result}" alt="avatar">`;
    };
    reader.readAsDataURL(file);
    showToast('Photo selected! Save changes to upload.', 'success');
  });
}

// ============================================================
// SAVE PERSONAL INFO
// ============================================================
window.savePersonalInfo = async function() {
  const firstName = document.getElementById('profile-firstname').value.trim();
  const lastName  = document.getElementById('profile-lastname').value.trim();
  const mobile    = document.getElementById('profile-mobile').value.trim();

  if (!firstName) { showToast('First name is required.', 'error'); return; }
  if (!lastName)  { showToast('Last name is required.', 'error'); return; }

  const btn = document.getElementById('save-info-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    // Upload new avatar if selected
    let avatarUrl = currentProfile?.avatar_url || null;
    if (newAvatarFile) {
      const ext  = newAvatarFile.name.split('.').pop();
      const path = `avatars/${currentUser.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('avatars').upload(path, newAvatarFile, { upsert: true });
      if (!uploadErr) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = data.publicUrl;
      }
      newAvatarFile = null;
    }

    const { error } = await supabase.from('users').update({
      first_name: firstName,
      last_name:  lastName,
      mobile,
      avatar_url: avatarUrl,
    }).eq('id', currentUser.id);

    if (error) throw error;

    // Update display
    currentProfile = { ...currentProfile, first_name: firstName, last_name: lastName, mobile, avatar_url: avatarUrl };
    document.getElementById('profile-name-display').textContent  = `${firstName} ${lastName}`;
    document.getElementById('sidebar-user-name').textContent     = `${firstName} ${lastName}`;

    showToast('Profile updated successfully! ✓', 'success');
  } catch (err) {
    console.error(err);
    showToast('Failed to update profile.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💾 Save Changes';
  }
};

// ============================================================
// SAVE EMAIL
// ============================================================
window.saveEmail = async function() {
  const email = document.getElementById('profile-email').value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Enter a valid email address.', 'error'); return;
  }
  if (email === currentProfile?.email) {
    showToast('This is already your current email.', 'error'); return;
  }

  const btn = document.getElementById('save-email-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Updating...';

  try {
    // Update in Supabase Auth
    const { error: authErr } = await supabase.auth.updateUser({ email });
    if (authErr) throw authErr;

    // Update in users table
    const { error: dbErr } = await supabase.from('users').update({ email }).eq('id', currentUser.id);
    if (dbErr) throw dbErr;

    currentProfile = { ...currentProfile, email };
    document.getElementById('profile-email-display').textContent = email;
    document.getElementById('sidebar-user-email').textContent    = email;

    showToast('Email updated! Check your inbox to confirm.', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to update email.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '📧 Update Email';
  }
};

// ============================================================
// SAVE PASSWORD
// ============================================================
window.savePassword = async function() {
  const password = document.getElementById('profile-password').value;
  const confirm  = document.getElementById('profile-confirm').value;

  if (!password || password.length < 8) {
    showToast('Password must be at least 8 characters.', 'error'); return;
  }
  if (password !== confirm) {
    showToast('Passwords do not match.', 'error'); return;
  }

  const btn = document.getElementById('save-password-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Updating...';

  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;

    document.getElementById('profile-password').value = '';
    document.getElementById('profile-confirm').value  = '';
    showToast('Password updated successfully! ✓', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to update password.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔒 Update Password';
  }
};
