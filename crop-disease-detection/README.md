# 🌿 CropSense AI — Rice & Pulse Disease Detection

An AI-powered web application for detecting diseases in rice and pulse crops using EfficientNetB2 deep learning model.

---

## 📁 Project Structure

```
crop-disease-detection/
├── pages/
│   ├── index.html          → Home/Landing page
│   ├── login.html          → Login page
│   ├── signup.html         → Sign up page
│   ├── dashboard.html      → User dashboard (history, charts)
│   ├── predict.html        → Disease detection page
│   └── chatbot-widget.html → Reusable chatbot HTML snippet
├── css/
│   ├── style.css           → Global styles, navbar, buttons, forms
│   ├── auth.css            → Login/signup specific styles
│   ├── dashboard.css       → Sidebar, dashboard, predict page styles
│   ├── home.css            → Landing page styles
│   └── chatbot.css         → Chatbot widget styles
├── js/
│   ├── auth.js             → Login/signup logic, validation, localStorage auth
│   ├── model.js            → Demo disease detection model (replace with real model)
│   ├── predict.js          → Image upload, prediction UI logic
│   ├── dashboard.js        → Dashboard stats, history table, charts
│   └── chatbot.js          → AI chatbot (Anthropic Claude API)
└── README.md
```

---

## 🚀 Features

- **Home Page** — Animated landing page with features, how-it-works, disease list, model info
- **Login Page** — Email + password only, form validation, demo auth
- **Sign Up Page** — Profile pic upload, full name, email, mobile, password with strength meter
- **Prediction Page** — Image upload (drag & drop), remove/replace image, EfficientNetB2 demo model
- **Dashboard** — Stats cards, disease distribution chart, weekly activity chart, full history table
- **AI Chatbot** — Powered by Claude claude-sonnet-4-20250514, answers crop disease questions

---

## 🔑 Form Validations (Sign Up)

All fields are required. Password must contain:
- ✅ At least 1 uppercase letter
- ✅ At least 1 lowercase letter  
- ✅ At least 1 digit (0–9)
- ✅ At least 1 special symbol (!@#$%^&*...)
- ✅ Minimum 8 characters

---

## 🧠 Replacing the Demo Model

The current `js/model.js` uses a random demo prediction. To integrate your real EfficientNetB2 model:

### Option 1: TensorFlow.js (Browser)
```javascript
// In model.js, replace runDemoModel() with:
import * as tf from '@tensorflow/tfjs';

let model;
async function loadModel() {
  model = await tf.loadLayersModel('/path/to/model/model.json');
}

async function runDemoModel(imageFile) {
  const img = await loadImageTensor(imageFile);
  const prediction = model.predict(img);
  // ... process and return results
}
```

### Option 2: Python Backend API
```javascript
// In predict.js, replace the fetch call to your Flask/FastAPI endpoint:
const formData = new FormData();
formData.append('image', currentFile);

const response = await fetch('http://your-api.com/predict', {
  method: 'POST',
  body: formData
});
const result = await response.json();
```

### Sample Python API (Flask)
```python
from flask import Flask, request, jsonify
import tensorflow as tf
from PIL import Image
import numpy as np

app = Flask(__name__)
model = tf.keras.models.load_model('efficientnetb2_model.h5')

@app.route('/predict', methods=['POST'])
def predict():
    img = Image.open(request.files['image']).resize((260, 260))
    arr = np.array(img) / 255.0
    arr = np.expand_dims(arr, axis=0)
    preds = model.predict(arr)
    # Return class name + confidence
    ...
```

---

## 🌐 Deployment

### GitHub Pages (Static)
```bash
git init
git add .
git commit -m "Initial CropSense AI"
git remote add origin https://github.com/yourusername/crop-disease-detection.git
git push -u origin main
# Enable GitHub Pages in repo Settings → Pages
```

### Netlify / Vercel (Drag & Drop)
- Zip the entire folder and drag to netlify.com or vercel.com dashboard
- Set root to `pages/index.html`

### With Python Backend
- Deploy Flask/FastAPI backend on Railway, Render, or Heroku
- Update API endpoint URLs in `js/predict.js`

---

## 🤖 Chatbot Setup

The chatbot uses the Anthropic API (`claude-sonnet-4-20250514`). No API key needed in `js/chatbot.js` — Claude.ai handles authentication automatically when used as an embedded artifact. 

For standalone deployment, add your API key or proxy server.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML5 + CSS3 | Structure & styling |
| Vanilla JavaScript | All interactivity |
| LocalStorage | Demo auth & history (no backend needed) |
| Chart.js | Dashboard charts |
| Claude API | AI chatbot |
| EfficientNetB2 | Disease detection model (your model) |

---

## 📞 Notes

- Demo auth uses `localStorage` — replace with real backend (Firebase, Django, etc.) for production
- Model predictions are randomized in demo mode — replace `js/model.js` with your real model
- All pages are fully responsive for mobile/tablet/desktop
