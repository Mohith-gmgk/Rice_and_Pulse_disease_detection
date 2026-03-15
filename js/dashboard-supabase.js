// ============================================================
// dashboard-supabase.js — Dashboard with Supabase Data
// ============================================================

import { supabase } from "./supabase-config.js";
import { requireAuth, logout, showToast } from "./auth-supabase.js";

let currentUser = null;

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  requireAuth(async (user, profile) => {
    currentUser = user;
    loadSidebarUser(profile);
    await loadDashboard(user.id);
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
      ? `<img src="${profile.avatar_url}" alt="${profile.first_name}">`
      : profile.first_name.charAt(0).toUpperCase();
  }
}

// ============================================================
// LOAD PREDICTIONS FROM SUPABASE
// ============================================================
async function loadDashboard(userId) {
  try {
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    updateStats(predictions || []);
    renderHistory(predictions || []);
    renderRecent((predictions || []).slice(0, 3));
    setTimeout(() => renderCharts(predictions || []), 100);

  } catch (err) {
    console.error(err);
    showToast('Failed to load history.', 'error');
  }
}

// ============================================================
// STATS
// ============================================================
function updateStats(predictions) {
  setVal('stat-total', predictions.length);
  setVal('stat-today', predictions.filter(p => isToday(new Date(p.created_at))).length);
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

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
        ${p.thumbnail_url
          ? `<img class="history-thumb" src="${p.thumbnail_url}" alt="${p.disease}">`
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
      <td style="font-size:0.82rem;color:var(--text-secondary);">${formatDate(p.created_at)}</td>
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
      ${p.thumbnail_url
        ? `<img style="width:40px;height:40px;border-radius:8px;object-fit:cover;" src="${p.thumbnail_url}">`
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
// DELETE PREDICTION
// ============================================================
window.deletePrediction = async function(predId) {
  if (!currentUser) return;
  try {
    const { error } = await supabase.from('predictions').delete().eq('id', predId);
    if (error) throw error;
    showToast('Prediction deleted.', 'success');
    await loadDashboard(currentUser.id);
  } catch (err) {
    showToast('Delete failed. Try again.', 'error');
  }
};

// ============================================================
// CLEAR ALL
// ============================================================
window.clearAllHistory = async function() {
  if (!currentUser) return;
  if (!confirm('Clear all prediction history? This cannot be undone.')) return;
  try {
    const { error } = await supabase.from('predictions').delete().eq('user_id', currentUser.id);
    if (error) throw error;
    showToast('History cleared.', 'success');
    await loadDashboard(currentUser.id);
  } catch (err) {
    showToast('Failed to clear history.', 'error');
  }
};

window.logout = logout;

// ============================================================
// CHARTS
// ============================================================
function renderCharts(predictions) {
  if (!predictions.length) return;

  // Daily detections chart (last 7 days)
  const dailyCanvas = document.getElementById('daily-chart');
  const noDaily = document.getElementById('no-daily-chart');
  if (dailyCanvas && window.Chart) {
    const days = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      days.push(label);
      const count = predictions.filter(p => {
        const pd = new Date(p.created_at);
        return pd.getDate() === d.getDate() && pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      }).length;
      counts.push(count);
    }
    if (noDaily) noDaily.style.display = 'none';
    new Chart(dailyCanvas, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: 'Detections',
          data: counts,
          backgroundColor: 'rgba(45,181,103,0.7)',
          borderColor: '#2db567',
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} detection${ctx.parsed.y !== 1 ? 's' : ''}` } }
        },
        scales: {
          x: { ticks: { color: '#8ab89a', font: { size: 10 } }, grid: { display: false } },
          y: {
            min: 0,
            ticks: { color: '#8ab89a', font: { size: 11 }, stepSize: 1, callback: v => Number.isInteger(v) ? v : '' },
            grid: { color: 'rgba(255,255,255,0.04)' }
          }
        }
      }
    });
  }

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

  const confidenceCanvas = document.getElementById('confidence-chart');
  const noConfidence = document.getElementById('no-week-chart');
  if (confidenceCanvas && window.Chart) {
    // Sort predictions by date ascending
    const sorted = [...predictions].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const last15 = sorted.slice(-15); // last 15 predictions
    if (last15.length < 1) return;
    if (noConfidence) noConfidence.style.display = 'none';
    const labels = last15.map((p, i) => {
      const d = new Date(p.created_at);
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    });
    const data = last15.map(p => parseFloat((p.confidence * 100).toFixed(1)));
    new Chart(confidenceCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Confidence %',
          data,
          borderColor: '#2db567',
          backgroundColor: 'rgba(45,181,103,0.08)',
          borderWidth: 2,
          pointBackgroundColor: '#2db567',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.y}% confidence`
            }
          }
        },
        scales: {
          x: { ticks: { color: '#8ab89a', font: { size: 10 } }, grid: { display: false } },
          y: {
            min: 0, max: 100,
            ticks: { color: '#8ab89a', font: { size: 11 }, callback: v => v + '%' },
            grid: { color: 'rgba(255,255,255,0.04)' }
          }
        }
      }
    });
  }
}
