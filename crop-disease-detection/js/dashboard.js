// ============================================================
// DASHBOARD.JS — Dashboard Logic
// ============================================================

function loadSidebarUser() {
  const user = getCurrentUser();
  if (!user) return;

  const nameEl = document.getElementById('sidebar-user-name');
  const emailEl = document.getElementById('sidebar-user-email');
  const avatarEl = document.getElementById('sidebar-avatar');

  if (nameEl) nameEl.textContent = `${user.firstName} ${user.lastName}`;
  if (emailEl) emailEl.textContent = user.email;
  if (avatarEl) {
    if (user.avatar) {
      avatarEl.innerHTML = `<img src="${user.avatar}" alt="${user.firstName}">`;
    } else {
      avatarEl.textContent = user.firstName.charAt(0).toUpperCase();
    }
  }
}

function initDashboard() {
  const user = getCurrentUser();
  if (!user) return;

  const predictions = user.predictions || [];

  // Update stats
  setStatValue('stat-total', predictions.length);
  setStatValue('stat-today', predictions.filter(p => isToday(p.date)).length);
  setStatValue('stat-diseases', new Set(predictions.map(p => p.disease)).size);

  const avgConf = predictions.length
    ? (predictions.reduce((a, b) => a + b.confidence, 0) / predictions.length * 100).toFixed(0)
    : 0;
  setStatValue('stat-accuracy', avgConf + '%');

  // Render history table
  renderHistory(predictions);

  // Render recent activity
  renderRecent(predictions.slice(0, 3));
}

function setStatValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function isToday(dateStr) {
  const d = new Date(dateStr);
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function severityBadgeClass(severity) {
  const map = { High: 'badge-red', Medium: 'badge-gold', Low: 'badge-green', None: 'badge-green' };
  return map[severity] || 'badge-green';
}

function renderHistory(predictions) {
  const tbody = document.getElementById('history-tbody');
  if (!tbody) return;

  if (predictions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">
          <div style="font-size:2rem;margin-bottom:10px;">🌿</div>
          No predictions yet. <a href="predict.html" style="color:var(--green-light);">Analyze your first image</a>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = predictions.map((p, idx) => `
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
      <td>
        <span class="badge ${severityBadgeClass(p.severity)}">${p.severity}</span>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="progress-bar" style="width:80px;">
            <div class="progress-fill" style="width:${(p.confidence*100).toFixed(0)}%"></div>
          </div>
          <span style="font-size:0.82rem;color:var(--green-light);font-weight:600;">${(p.confidence*100).toFixed(1)}%</span>
        </div>
      </td>
      <td style="font-size:0.82rem;color:var(--text-secondary);">${formatDate(p.date)}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deletePrediction('${p.id}')">🗑 Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderRecent(predictions) {
  const container = document.getElementById('recent-list');
  if (!container) return;

  if (predictions.length === 0) {
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

function deletePrediction(id) {
  const user = getCurrentUser();
  if (!user) return;
  user.predictions = (user.predictions || []).filter(p => p.id !== id);
  const users = JSON.parse(localStorage.getItem('cropUsers') || '[]');
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) users[idx] = user;
  localStorage.setItem('cropUsers', JSON.stringify(users));
  localStorage.setItem('cropCurrentUser', JSON.stringify(user));
  initDashboard(); // Re-render
}

function clearAllHistory() {
  const user = getCurrentUser();
  if (!user) return;
  if (!confirm('Clear all prediction history? This cannot be undone.')) return;
  user.predictions = [];
  const users = JSON.parse(localStorage.getItem('cropUsers') || '[]');
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) users[idx] = user;
  localStorage.setItem('cropUsers', JSON.stringify(users));
  localStorage.setItem('cropCurrentUser', JSON.stringify(user));
  initDashboard();
}

// ---- Mobile sidebar toggle ----
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}

// ---- Chart.js mini charts ----
function renderCharts() {
  const user = getCurrentUser();
  if (!user) return;
  const predictions = user.predictions || [];
  if (!predictions.length) return;

  // Disease distribution donut chart
  const diseaseCanvas = document.getElementById('disease-chart');
  if (diseaseCanvas && window.Chart) {
    const counts = {};
    predictions.forEach(p => { counts[p.disease] = (counts[p.disease] || 0) + 1; });
    const labels = Object.keys(counts);
    const data = Object.values(counts);
    const colors = ['#2db567','#1a7a4a','#f5c842','#e05555','#4a90d9','#9b59b6','#e67e22','#1abc9c'];

    new Chart(diseaseCanvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderWidth: 2, borderColor: '#0d1f14' }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#8ab89a', font: { size: 11 }, padding: 10 } }
        },
        cutout: '65%',
      }
    });
  }

  // Weekly prediction count bar chart
  const weekCanvas = document.getElementById('week-chart');
  if (weekCanvas && window.Chart) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Array(7).fill(0);
    const now = new Date();
    predictions.forEach(p => {
      const d = new Date(p.date);
      const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      if (diff < 7) counts[d.getDay()]++;
    });

    const today = now.getDay();
    const orderedDays = [...days.slice(today + 1), ...days.slice(0, today + 1)];
    const orderedCounts = [...counts.slice(today + 1), ...counts.slice(0, today + 1)];

    new Chart(weekCanvas, {
      type: 'bar',
      data: {
        labels: orderedDays,
        datasets: [{
          label: 'Predictions',
          data: orderedCounts,
          backgroundColor: 'rgba(45,181,103,0.3)',
          borderColor: '#2db567',
          borderWidth: 1.5,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8ab89a', font: { size: 11 } }, grid: { display: false } },
          y: { ticks: { color: '#8ab89a', font: { size: 11 }, stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
      }
    });
  }
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  if (typeof requireAuth === 'function') requireAuth();
  loadSidebarUser();
  initDashboard();
  setTimeout(renderCharts, 100);
});
