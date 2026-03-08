// ============================================================
// dashboard-firebase.js — Dashboard with Firestore Data
// ============================================================

import { db } from "./firebase-config.js";
import {
  collection, getDocs, deleteDoc, doc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { requireAuth, logout, showToast } from "./auth-firebase.js";

let currentUser = null;

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  requireAuth(async (user, profile) => {
    currentUser = user;
    loadSidebarUser(profile);
    await loadDashboard(user.uid);
  });
});

function loadSidebarUser(profile) {
  if (!profile) return;
  const nameEl   = document.getElementById('sidebar-user-name');
  const emailEl  = document.getElementById('sidebar-user-email');
  const avatarEl = document.getElementById('sidebar-avatar');
  if (nameEl)  nameEl.textContent  = `${profile.firstName} ${profile.lastName}`;
  if (emailEl) emailEl.textContent = profile.email;
  if (avatarEl) {
    avatarEl.innerHTML = profile.avatar
      ? `<img src="${profile.avatar}" alt="${profile.firstName}">`
      : profile.firstName.charAt(0).toUpperCase();
  }
}

// ============================================================
// LOAD DASHBOARD DATA FROM FIRESTORE
// ============================================================
async function loadDashboard(uid) {
  try {
    const q = query(
      collection(db, 'users', uid, 'predictions'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const predictions = snapshot.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() || new Date() }));

    updateStats(predictions);
    renderHistory(predictions);
    renderRecent(predictions.slice(0, 3));
    setTimeout(() => renderCharts(predictions), 100);
  } catch (err) {
    console.error('Failed to load dashboard:', err);
    showToast('Failed to load history.', 'error');
  }
}

// ============================================================
// STATS
// ============================================================
function updateStats(predictions) {
  setVal('stat-total', predictions.length);
  setVal('stat-today', predictions.filter(p => isToday(p.createdAt)).length);
  setVal('stat-diseases', new Set(predictions.map(p => p.disease)).size);
  const avg = predictions.length
    ? (predictions.reduce((a, b) => a + b.confidence, 0) / predictions.length * 100).toFixed(0) + '%'
    : '—';
  setVal('stat-accuracy', avg);
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function isToday(date) {
  const t = new Date();
  return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
}

function formatDate(date) {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function severityBadgeClass(severity) {
  return { High: 'badge-red', Medium: 'badge-gold', Low: 'badge-green', None: 'badge-green' }[severity] || 'badge-green';
}

// ============================================================
// HISTORY TABLE
// ============================================================
function renderHistory(predictions) {
  const tbody = document.getElementById('history-tbody');
  if (!tbody) return;

  if (!predictions.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">
          <div style="font-size:2rem;margin-bottom:10px;">🌿</div>
          No predictions yet. <a href="predict.html" style="color:var(--green-light);">Analyze your first image</a>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = predictions.map(p => `
    <tr>
      <td>
        ${p.thumbnail
          ? `<img class="history-thumb" src="${p.thumbnail}" alt="${p.disease}">`
          : `<div class="history-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.2rem;">🌿</div>`
        }
      </td>
      <td>
        <div class="disease-name">${p.disease}</div>
        <div class="disease-crop">${p.crop}</div>
      </td>
      <td><span class="badge ${severityBadgeClass(p.severity)}">${p.severity}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="progress-bar" style="width:80px;">
            <div class="progress-fill" style="width:${(p.confidence*100).toFixed(0)}%"></div>
          </div>
          <span style="font-size:0.82rem;color:var(--green-light);font-weight:600;">${(p.confidence*100).toFixed(1)}%</span>
        </div>
      </td>
      <td style="font-size:0.82rem;color:var(--text-secondary);">${formatDate(p.createdAt)}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deletePrediction('${p.id}')">🗑 Delete</button>
      </td>
    </tr>
  `).join('');
}

// ============================================================
// RECENT ACTIVITY
// ============================================================
function renderRecent(predictions) {
  const container = document.getElementById('recent-list');
  if (!container) return;

  if (!predictions.length) {
    container.innerHTML = `<div style="color:var(--text-muted);font-size:0.88rem;padding:20px 0;">No recent activity.</div>`;
    return;
  }

  container.innerHTML = predictions.map(p => `
    <div style="display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
      ${p.thumbnail
        ? `<img style="width:40px;height:40px;border-radius:8px;object-fit:cover;" src="${p.thumbnail}">`
        : `<div style="width:40px;height:40px;border-radius:8px;background:var(--bg-card2);display:flex;align-items:center;justify-content:center;">🌿</div>`
      }
      <div style="flex:1;">
        <div style="font-size:0.88rem;font-weight:600;color:var(--text-primary);">${p.disease}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);">${p.crop} · ${(p.confidence*100).toFixed(1)}% confidence</div>
      </div>
      <span class="badge ${severityBadgeClass(p.severity)}" style="font-size:0.72rem;">${p.severity}</span>
    </div>
  `).join('');
}

// ============================================================
// DELETE PREDICTION FROM FIRESTORE
// ============================================================
window.deletePrediction = async function(predId) {
  if (!currentUser) return;
  try {
    await deleteDoc(doc(db, 'users', currentUser.uid, 'predictions', predId));
    showToast('Prediction deleted.', 'success');
    await loadDashboard(currentUser.uid);
  } catch (err) {
    showToast('Delete failed. Try again.', 'error');
  }
};

// ============================================================
// CLEAR ALL PREDICTIONS
// ============================================================
window.clearAllHistory = async function() {
  if (!currentUser) return;
  if (!confirm('Clear all prediction history? This cannot be undone.')) return;
  try {
    const snapshot = await getDocs(collection(db, 'users', currentUser.uid, 'predictions'));
    const deletes = snapshot.docs.map(d => deleteDoc(doc(db, 'users', currentUser.uid, 'predictions', d.id)));
    await Promise.all(deletes);
    showToast('History cleared.', 'success');
    await loadDashboard(currentUser.uid);
  } catch (err) {
    showToast('Failed to clear history.', 'error');
  }
};

// ============================================================
// LOGOUT
// ============================================================
window.logout = logout;

// ============================================================
// CHARTS
// ============================================================
function renderCharts(predictions) {
  if (!predictions.length) return;

  const diseaseCanvas = document.getElementById('disease-chart');
  const noDisease = document.getElementById('no-disease-chart');
  if (diseaseCanvas && window.Chart) {
    if (noDisease) noDisease.style.display = 'none';
    const counts = {};
    predictions.forEach(p => { counts[p.disease] = (counts[p.disease] || 0) + 1; });
    const colors = ['#2db567','#1a7a4a','#f5c842','#e05555','#4a90d9','#9b59b6','#e67e22','#1abc9c'];
    new Chart(diseaseCanvas, {
      type: 'doughnut',
      data: {
        labels: Object.keys(counts),
        datasets: [{ data: Object.values(counts), backgroundColor: colors, borderWidth: 2, borderColor: '#0d1f14' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { color: '#8ab89a', font: { size: 11 }, padding: 10 } } },
        cutout: '65%'
      }
    });
  }

  const weekCanvas = document.getElementById('week-chart');
  const noWeek = document.getElementById('no-week-chart');
  if (weekCanvas && window.Chart) {
    if (noWeek) noWeek.style.display = 'none';
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const counts = new Array(7).fill(0);
    const now = new Date();
    predictions.forEach(p => {
      const diff = Math.floor((now - p.createdAt) / (1000*60*60*24));
      if (diff < 7) counts[p.createdAt.getDay()]++;
    });
    const today = now.getDay();
    new Chart(weekCanvas, {
      type: 'bar',
      data: {
        labels: [...days.slice(today+1), ...days.slice(0, today+1)],
        datasets: [{
          label: 'Predictions',
          data: [...counts.slice(today+1), ...counts.slice(0, today+1)],
          backgroundColor: 'rgba(45,181,103,0.3)', borderColor: '#2db567', borderWidth: 1.5, borderRadius: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8ab89a', font: { size: 11 } }, grid: { display: false } },
          y: { ticks: { color: '#8ab89a', font: { size: 11 }, stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
      }
    });
  }
}
