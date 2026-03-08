// ============================================================
// PREDICT.JS — Image Upload & Prediction Logic
// ============================================================

let currentFile = null;

function initPredictPage() {
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  const analyzeBtn = document.getElementById('analyze-btn');

  if (!uploadZone) return;

  // ---- Click to upload ----
  uploadZone.addEventListener('click', (e) => {
    if (e.target.closest('.img-action-btn')) return;
    fileInput.click();
  });

  // ---- File input change ----
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  // ---- Drag & drop ----
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  // ---- Analyze button ----
  analyzeBtn.addEventListener('click', runAnalysis);
}

// ---- Handle file selection ----
function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    showPredictToast('Please upload a valid image file (JPG, PNG, WEBP).', 'error');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showPredictToast('Image too large. Max 10MB.', 'error');
    return;
  }

  currentFile = file;
  const reader = new FileReader();
  reader.onload = (e) => renderImagePreview(e.target.result, file.name);
  reader.readAsDataURL(file);

  // Reset result
  resetResult();
  document.getElementById('analyze-btn').disabled = false;
}

// ---- Render image in upload zone ----
function renderImagePreview(src, filename) {
  const zone = document.getElementById('upload-zone');
  zone.classList.add('has-image');
  zone.innerHTML = `
    <div class="image-preview-container">
      <img src="${src}" alt="Uploaded leaf" id="preview-img">
      <div class="image-actions">
        <button class="img-action-btn img-action-replace" onclick="replaceImage()" title="Replace image">🔄</button>
        <button class="img-action-btn img-action-remove" onclick="removeImage()" title="Remove image">✕</button>
      </div>
    </div>
    <div style="padding:14px 20px; background:var(--bg-card2); border-top:1px solid var(--border); display:flex; align-items:center; gap:10px;">
      <span style="font-size:1.2rem;">🖼️</span>
      <div>
        <div style="font-size:0.88rem;font-weight:600;color:var(--text-primary);">${filename}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);">${(currentFile.size/1024).toFixed(1)} KB · ${currentFile.type}</div>
      </div>
    </div>
  `;
}

// ---- Replace image ----
function replaceImage() {
  document.getElementById('file-input').click();
}

// ---- Remove image ----
function removeImage() {
  currentFile = null;
  resetUploadZone();
  resetResult();
  document.getElementById('analyze-btn').disabled = true;
}

// ---- Reset upload zone to default ----
function resetUploadZone() {
  const zone = document.getElementById('upload-zone');
  zone.classList.remove('has-image');
  zone.innerHTML = `
    <div class="upload-icon">🌿</div>
    <div class="upload-title">Drop your leaf image here</div>
    <p class="upload-hint">or click to browse from your device</p>
    <button class="btn btn-outline" onclick="document.getElementById('file-input').click(); event.stopPropagation();">
      📁 Choose Image
    </button>
    <div class="upload-formats">
      <span class="format-badge">JPG</span>
      <span class="format-badge">PNG</span>
      <span class="format-badge">WEBP</span>
      <span class="format-badge">Max 10MB</span>
    </div>
  `;
}

// ---- Reset result panel ----
function resetResult() {
  const resultBody = document.getElementById('result-body');
  resultBody.innerHTML = `
    <div class="result-placeholder">
      <div class="placeholder-icon">🔬</div>
      <p>Upload a leaf image and click<br><strong>Analyze Now</strong> to detect diseases</p>
    </div>
  `;
  document.getElementById('result-header-title').textContent = 'Detection Result';
  document.getElementById('save-btn').style.display = 'none';
}

// ---- Run model analysis ----
async function runAnalysis() {
  if (!currentFile) {
    showPredictToast('Please upload a leaf image first.', 'error');
    return;
  }

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
    showPredictToast('Analysis failed. Please try again.', 'error');
    btn.innerHTML = '🔬 Analyze Now';
    btn.disabled = false;
    resetResult();
  }
}

// ---- Show scanning animation ----
function showAnalyzingState() {
  const resultBody = document.getElementById('result-body');
  resultBody.innerHTML = `
    <div style="text-align:center; padding:40px 20px;">
      <div style="font-size:2.5rem; margin-bottom:16px; animation:spin 1.5s linear infinite; display:inline-block;">⚙️</div>
      <div style="font-family:var(--font-display); font-size:1rem; font-weight:700; margin-bottom:8px; color:var(--green-light);">Analyzing Leaf...</div>
      <div style="font-size:0.82rem; color:var(--text-muted); margin-bottom:20px;">Running EfficientNetB2 model</div>
      <div class="progress-bar">
        <div class="progress-fill" id="scan-progress" style="width:0%"></div>
      </div>
      <div style="font-size:0.78rem; color:var(--text-muted); margin-top:8px;" id="scan-step">Loading model weights...</div>
    </div>
  `;
  // Animate progress bar
  const steps = [
    [20, 'Preprocessing image...'],
    [45, 'Extracting features...'],
    [70, 'Running CNN layers...'],
    [88, 'Classifying disease...'],
    [95, 'Generating results...'],
  ];
  let i = 0;
  const interval = setInterval(() => {
    if (i >= steps.length) { clearInterval(interval); return; }
    const bar = document.getElementById('scan-progress');
    const step = document.getElementById('scan-step');
    if (bar) bar.style.width = steps[i][0] + '%';
    if (step) step.textContent = steps[i][1];
    i++;
  }, 280);
}

// ---- Render detection result ----
function renderResult(result) {
  const { primary, topPredictions, model, inferenceTime } = result;
  const disease = primary.disease;
  const conf = primary.confidence;
  const { fmtPct, severityBadge } = window.CropModel;

  document.getElementById('result-header-title').textContent = '✅ Result Ready';
  document.getElementById('save-btn').style.display = 'inline-flex';

  const resultBody = document.getElementById('result-body');
  resultBody.innerHTML = `
    <div class="result-disease">${disease.name}</div>
    <div class="result-crop">${disease.crop} · <em>${disease.scientificName}</em></div>

    <span class="badge ${severityBadge(disease.severity)}" style="margin-bottom:20px;">
      ⚠️ Severity: ${disease.severity}
    </span>

    <div class="result-accuracy">
      <div class="accuracy-label">
        <span>Confidence Score</span>
        <span class="accuracy-value">${fmtPct(conf)}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${conf*100}%"></div>
      </div>
    </div>

    <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.65; margin-bottom:16px;">
      ${disease.description}
    </div>

    <div class="result-meta">
      <div class="meta-item">
        <div class="meta-label">Model</div>
        <div class="meta-value">${model}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Inference Time</div>
        <div class="meta-value">${inferenceTime}</div>
      </div>
    </div>

    <div style="margin-top:20px;">
      <div style="font-size:0.78rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:10px;">💊 Treatment</div>
      <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.6; background:rgba(45,181,103,0.05); border:1px solid rgba(45,181,103,0.15); border-radius:8px; padding:12px;">
        ${disease.treatment}
      </div>
    </div>

    <div style="margin-top:14px;">
      <div style="font-size:0.78rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:10px;">🛡️ Prevention</div>
      <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.6; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:12px;">
        ${disease.prevention}
      </div>
    </div>

    <div class="top-predictions">
      <div class="top-pred-title">📊 Top Predictions</div>
      ${topPredictions.slice(0,4).map(p => `
        <div class="pred-item">
          <div class="pred-name">${p.disease.name}</div>
          <div class="pred-bar">
            <div class="progress-bar" style="height:5px;">
              <div class="progress-fill" style="width:${p.confidence*100}%;background:${p.disease.color}99"></div>
            </div>
          </div>
          <div class="pred-pct">${fmtPct(p.confidence)}</div>
        </div>
      `).join('')}
    </div>
  `;

  // Store result for saving
  window._lastResult = { result, file: currentFile };
}

// ---- Save to history ----
function savePrediction() {
  if (!window._lastResult) return;
  const { result } = window._lastResult;
  const user = getCurrentUser();
  if (!user) return;

  const previewImg = document.getElementById('preview-img');
  const imgSrc = previewImg ? previewImg.src : null;

  const prediction = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    disease: result.primary.disease.name,
    crop: result.primary.disease.crop,
    confidence: result.primary.confidence,
    severity: result.primary.disease.severity,
    model: result.model,
    thumbnail: imgSrc,
  };

  user.predictions = user.predictions || [];
  user.predictions.unshift(prediction);

  // Update in storage
  const users = JSON.parse(localStorage.getItem('cropUsers') || '[]');
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) users[idx] = user;
  localStorage.setItem('cropUsers', JSON.stringify(users));
  localStorage.setItem('cropCurrentUser', JSON.stringify(user));

  showPredictToast('Prediction saved to your history! ✓', 'success');
  document.getElementById('save-btn').disabled = true;
  document.getElementById('save-btn').innerHTML = '✓ Saved';
}

// ---- Toast ----
function showPredictToast(msg, type) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${msg}`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ---- Init on DOMContentLoaded ----
document.addEventListener('DOMContentLoaded', () => {
  if (typeof requireAuth === 'function') requireAuth();
  initPredictPage();
  loadSidebarUser();
});
