// ============================================================
// predict-supabase.js — Prediction with Supabase Storage
// ============================================================

import { supabase } from "./supabase-config.js";
import { requireAuth, showToast } from "./auth-supabase.js";

let currentFile = null;
let currentUser = null;
let currentProfile = null;

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  requireAuth((user, profile) => {
    currentUser = user;
    currentProfile = profile;
    loadSidebarUser(profile);
    initPredictPage();
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
// PREDICT PAGE
// ============================================================
function initPredictPage() {
  const uploadZone = document.getElementById('upload-zone');
  const fileInput  = document.getElementById('file-input');
  const analyzeBtn = document.getElementById('analyze-btn');
  if (!uploadZone) return;

  uploadZone.addEventListener('click', (e) => {
    if (e.target.closest('.img-action-btn')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  analyzeBtn.addEventListener('click', runAnalysis);
}

function handleFile(file) {
  if (!file.type.startsWith('image/')) { showToast('Please upload a valid image file.', 'error'); return; }
  if (file.size > 10 * 1024 * 1024)   { showToast('Image too large. Max 10MB.', 'error'); return; }
  currentFile = file;
  const reader = new FileReader();
  reader.onload = (e) => renderImagePreview(e.target.result, file.name);
  reader.readAsDataURL(file);
  resetResult();
  document.getElementById('analyze-btn').disabled = false;
}

function renderImagePreview(src, filename) {
  const zone = document.getElementById('upload-zone');
  zone.classList.add('has-image');
  zone.innerHTML = `
    <div class="image-preview-container">
      <img src="${src}" alt="Uploaded leaf" id="preview-img">
      <div class="image-actions">
        <button class="img-action-btn img-action-replace" onclick="replaceImage()" title="Replace">🔄</button>
        <button class="img-action-btn img-action-remove" onclick="removeImage()" title="Remove">✕</button>
      </div>
    </div>
    <div style="padding:14px 20px;background:var(--bg-card2);border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;">
      <span style="font-size:1.2rem;">🖼️</span>
      <div>
        <div style="font-size:0.88rem;font-weight:600;color:var(--text-primary);">${filename}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);">${(currentFile.size/1024).toFixed(1)} KB</div>
      </div>
    </div>`;
}

window.replaceImage = () => document.getElementById('file-input').click();
window.removeImage  = () => { currentFile = null; resetUploadZone(); resetResult(); document.getElementById('analyze-btn').disabled = true; };

function resetUploadZone() {
  const zone = document.getElementById('upload-zone');
  zone.classList.remove('has-image');
  zone.innerHTML = `
    <div class="upload-icon">🌿</div>
    <div class="upload-title">Drop your leaf image here</div>
    <p class="upload-hint">or click to browse from your device</p>
    <button class="btn btn-outline" onclick="document.getElementById('file-input').click(); event.stopPropagation();">📁 Choose Image</button>
    <div class="upload-formats">
      <span class="format-badge">JPG</span><span class="format-badge">PNG</span>
      <span class="format-badge">WEBP</span><span class="format-badge">Max 10MB</span>
    </div>`;
}

function resetResult() {
  document.getElementById('result-body').innerHTML = `
    <div class="result-placeholder">
      <div class="placeholder-icon">🔬</div>
      <p>Upload a leaf image and click<br><strong>Analyze Now</strong> to detect diseases</p>
    </div>`;
  document.getElementById('result-header-title').textContent = 'Detection Result';
  document.getElementById('save-btn').style.display = 'none';
}

window.runAnalysis = async function() {
  if (!currentFile) { showToast('Please upload a leaf image first.', 'error'); return; }
  const btn = document.getElementById('analyze-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Analyzing...';
  showAnalyzingState();
  try {
    const result = await window.CropModel.runDemoModel(currentFile);
    renderResult(result);
    btn.innerHTML = '🔬 Analyze Again';
    btn.disabled = false;
  } catch (err) {
    showToast('Analysis failed. Try again.', 'error');
    btn.innerHTML = '🔬 Analyze Now';
    btn.disabled = false;
    resetResult();
  }
};

function showAnalyzingState() {
  document.getElementById('result-body').innerHTML = `
    <div style="text-align:center;padding:40px 20px;">
      <div style="font-size:2.5rem;margin-bottom:16px;animation:spin 1.5s linear infinite;display:inline-block;">⚙️</div>
      <div style="font-family:var(--font-display);font-size:1rem;font-weight:700;margin-bottom:8px;color:var(--green-light);">Analyzing Leaf...</div>
      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:20px;">Running EfficientNetB2 model</div>
      <div class="progress-bar"><div class="progress-fill" id="scan-progress" style="width:0%"></div></div>
      <div style="font-size:0.78rem;color:var(--text-muted);margin-top:8px;" id="scan-step">Loading model weights...</div>
    </div>`;
  const steps = [[20,'Preprocessing image...'],[45,'Extracting features...'],[70,'Running CNN layers...'],[88,'Classifying disease...'],[95,'Generating results...']];
  let i = 0;
  const iv = setInterval(() => {
    if (i >= steps.length) { clearInterval(iv); return; }
    const bar = document.getElementById('scan-progress');
    const step = document.getElementById('scan-step');
    if (bar) bar.style.width = steps[i][0] + '%';
    if (step) step.textContent = steps[i][1];
    i++;
  }, 280);
}

function renderResult(result) {
  const { primary, topPredictions, model, inferenceTime } = result;
  const disease = primary.disease;
  const conf = primary.confidence;
  const { fmtPct, severityBadge } = window.CropModel;

  document.getElementById('result-header-title').textContent = '✅ Result Ready';
  document.getElementById('save-btn').style.display = 'inline-flex';

  document.getElementById('result-body').innerHTML = `
    <div class="result-disease">${disease.name}</div>
    <div class="result-crop">${disease.crop} · <em>${disease.scientificName}</em></div>
    <span class="badge ${severityBadge(disease.severity)}" style="margin-bottom:20px;">⚠️ Severity: ${disease.severity}</span>
    <div class="result-accuracy">
      <div class="accuracy-label"><span>Confidence Score</span><span class="accuracy-value">${fmtPct(conf)}</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${conf*100}%"></div></div>
    </div>
    <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.65;margin-bottom:16px;">${disease.description}</div>
    <div class="result-meta">
      <div class="meta-item"><div class="meta-label">Model</div><div class="meta-value">${model}</div></div>
      <div class="meta-item"><div class="meta-label">Inference Time</div><div class="meta-value">${inferenceTime}</div></div>
    </div>
    <div style="margin-top:20px;">
      <div style="font-size:0.78rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">💊 Treatment</div>
      <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.6;background:rgba(45,181,103,0.05);border:1px solid rgba(45,181,103,0.15);border-radius:8px;padding:12px;">${disease.treatment}</div>
    </div>
    <div style="margin-top:14px;">
      <div style="font-size:0.78rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">🛡️ Prevention</div>
      <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.6;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:12px;">${disease.prevention}</div>
    </div>
    <div class="top-predictions">
      <div class="top-pred-title">📊 Top Predictions</div>
      ${topPredictions.slice(0,4).map(p => `
        <div class="pred-item">
          <div class="pred-name">${p.disease.name}</div>
          <div class="pred-bar"><div class="progress-bar" style="height:5px;"><div class="progress-fill" style="width:${p.confidence*100}%;background:${p.disease.color}99"></div></div></div>
          <div class="pred-pct">${fmtPct(p.confidence)}</div>
        </div>`).join('')}
    </div>`;

  window._lastResult = { result, file: currentFile };
}

// ============================================================
// SAVE PREDICTION TO SUPABASE
// ============================================================
window.savePrediction = async function() {
  if (!window._lastResult || !currentUser) return;
  const { result } = window._lastResult;
  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    // Upload thumbnail to Supabase Storage
    let thumbnailUrl = null;
    if (currentFile) {
      const fileName = `${currentUser.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('predictions')
        .upload(fileName, currentFile, { upsert: true });

      if (!uploadError) {
        const { data } = supabase.storage.from('predictions').getPublicUrl(fileName);
        thumbnailUrl = data.publicUrl;
      }
    }

    // Save prediction to Supabase DB
    const { error } = await supabase.from('predictions').insert({
      user_id:       currentUser.id,
      disease:       result.primary.disease.name,
      crop:          result.primary.disease.crop,
      confidence:    result.primary.confidence,
      severity:      result.primary.disease.severity,
      model:         result.model,
      thumbnail_url: thumbnailUrl,
    });

    if (error) throw error;

    showToast('Prediction saved to history! ✓', 'success');
    btn.innerHTML = '✓ Saved';

  } catch (err) {
    console.error(err);
    showToast('Failed to save. Try again.', 'error');
    btn.disabled = false;
    btn.innerHTML = '💾 Save to History';
  }
};
