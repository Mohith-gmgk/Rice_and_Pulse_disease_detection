// ============================================================
// history.js — My Uploads / Image History Page
// ============================================================
import { supabase } from "./supabase-config.js";
import { requireAuth, showToast } from "./auth-supabase.js";

let currentUser = null;
let allUploads  = [];

document.addEventListener('DOMContentLoaded', () => {
  requireAuth((user, profile) => {
    currentUser = user;
    loadSidebarUser(profile);
    loadUploads();
  });
});

function loadSidebarUser(profile) {
  if (!profile) return;
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
}

async function loadUploads() {
  try {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    allUploads = data || [];
    updateStats(allUploads);
    renderGrid(allUploads);
  } catch (err) {
    console.error(err);
    showToast('Failed to load uploads.', 'error');
  }
}

function updateStats(uploads) {
  document.getElementById('hist-total').textContent    = uploads.length;
  document.getElementById('hist-diseases').textContent = new Set(uploads.map(u => u.disease)).size;
  document.getElementById('hist-avg').textContent      = uploads.length
    ? (uploads.reduce((a, b) => a + b.confidence, 0) / uploads.length * 100).toFixed(0) + '%'
    : '—';
  document.getElementById('hist-healthy').textContent  = uploads.filter(u =>
    u.disease?.toLowerCase().includes('healthy')).length;
}

function getRelativeTime(date) {
  const now  = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60)           return 'Just now';
  if (diff < 3600)         return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400)        return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 86400 * 7)   return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 86400 * 30)  return `${Math.floor(diff / 86400 / 7)} weeks ago`;
  return `${Math.floor(diff / 86400 / 30)} months ago`;
}

function renderGrid(uploads) {
  const grid    = document.getElementById('uploads-grid');
  const emptyEl = document.getElementById('uploads-empty');

  // Remove existing cards
  grid.querySelectorAll('.upload-card').forEach(c => c.remove());

  if (!uploads.length) {
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  uploads.forEach(upload => {
    const card = document.createElement('div');
    card.className = 'upload-card';
    const conf      = (upload.confidence * 100).toFixed(1);
    const createdAt = new Date(upload.created_at);
    const date      = createdAt.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    const time      = createdAt.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12: true });
    const relTime   = getRelativeTime(createdAt);
    const sevColor  = upload.severity === 'High' ? 'var(--red)' : upload.severity === 'Medium' ? 'var(--gold)' : upload.severity === 'None' ? 'var(--green-light)' : 'var(--green-light)';
    const sevIcon   = upload.severity === 'High' ? '🔴' : upload.severity === 'Medium' ? '🟡' : '🟢';
    const isHealthy = upload.disease?.toLowerCase().includes('healthy');

    const imgHtml = upload.thumbnail_url
      ? `<img src="${upload.thumbnail_url}" alt="${upload.disease}" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
         <div class="upload-card-placeholder" style="display:none;">🌿</div>`
      : `<div class="upload-card-placeholder">🌿</div>`;

    card.innerHTML = `
      <div class="upload-card-img">
        ${imgHtml}
        <div class="upload-card-conf">${conf}%</div>
      </div>
      <div class="upload-card-body">
        <div class="upload-card-disease">${upload.disease}</div>
        <div class="upload-card-crop">🌾 ${upload.crop}</div>
        <div class="upload-card-meta">
          <span class="upload-card-severity" style="color:${sevColor};">${sevIcon} ${upload.severity || 'N/A'}</span>
          <span class="upload-card-date" title="${date} at ${time}">${relTime}</span>
        </div>
        <div class="upload-card-footer">
          <span class="upload-card-model">🤖 ${upload.model || 'EfficientNetB2'}</span>
          <span class="upload-card-time">🕐 ${time}</span>
        </div>
        <div class="upload-card-fulldate">${date}</div>
      </div>
      <button class="upload-card-delete" onclick="deleteUpload('${upload.id}')" title="Delete">🗑</button>`;
    grid.appendChild(card);
  });
}

// ============================================================
// FILTER
// ============================================================
window.filterHistory = function() {
  const search   = document.getElementById('search-input').value.toLowerCase();
  const severity = document.getElementById('severity-filter').value;

  const filtered = allUploads.filter(u => {
    const matchSearch   = !search || u.disease?.toLowerCase().includes(search) || u.crop?.toLowerCase().includes(search);
    const matchSeverity = !severity || u.severity === severity;
    return matchSearch && matchSeverity;
  });
  renderGrid(filtered);
};

// ============================================================
// DELETE SINGLE
// ============================================================
window.deleteUpload = async function(id) {
  if (!confirm('Delete this upload?')) return;
  try {
    const { error } = await supabase.from('predictions').delete().eq('id', id);
    if (error) throw error;
    allUploads = allUploads.filter(u => u.id !== id);
    updateStats(allUploads);
    renderGrid(allUploads);
    showToast('Upload deleted.', 'success');
  } catch (err) {
    showToast('Failed to delete.', 'error');
  }
};

// ============================================================
// CLEAR ALL
// ============================================================
window.clearAllUploads = async function() {
  if (!confirm('Delete ALL uploads? This cannot be undone.')) return;
  try {
    const { error } = await supabase.from('predictions').delete().eq('user_id', currentUser.id);
    if (error) throw error;
    allUploads = [];
    updateStats([]);
    renderGrid([]);
    showToast('All uploads cleared.', 'success');
  } catch (err) {
    showToast('Failed to clear uploads.', 'error');
  }
};
