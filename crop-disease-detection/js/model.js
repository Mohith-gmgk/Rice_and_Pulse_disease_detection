// ============================================================
// MODEL.JS — Demo Disease Detection Model
// ============================================================

// Disease database - to be replaced with your EfficientNetB2 model
const DISEASE_DB = [
  {
    id: 'rice_blast',
    name: 'Rice Blast',
    crop: 'Rice',
    scientificName: 'Magnaporthe oryzae',
    severity: 'High',
    color: '#e05555',
    description: 'Fungal disease causing diamond-shaped lesions with gray centers on leaves.',
    treatment: 'Apply tricyclazole or propiconazole fungicide. Remove infected plants.',
    prevention: 'Use resistant varieties, balanced fertilization, avoid excess nitrogen.',
  },
  {
    id: 'brown_spot',
    name: 'Brown Spot',
    crop: 'Rice',
    scientificName: 'Bipolaris oryzae',
    severity: 'Medium',
    color: '#f5a742',
    description: 'Oval to circular brown spots with yellow halos on leaves.',
    treatment: 'Apply mancozeb or propiconazole. Ensure balanced soil nutrition.',
    prevention: 'Use certified seeds, avoid water stress, maintain soil potassium.',
  },
  {
    id: 'leaf_blight',
    name: 'Leaf Blight',
    crop: 'Rice',
    scientificName: 'Xanthomonas oryzae',
    severity: 'High',
    color: '#e05555',
    description: 'Water-soaked to yellowish stripe on leaf margins, turning white to gray.',
    treatment: 'Copper-based bactericides, drain fields if necessary.',
    prevention: 'Use resistant varieties, avoid excess nitrogen, balanced irrigation.',
  },
  {
    id: 'cassava_mosaic',
    name: 'Cassava Mosaic',
    crop: 'Cassava',
    scientificName: 'East African Cassava Mosaic Virus',
    severity: 'High',
    color: '#e05555',
    description: 'Mosaic chlorosis, leaf distortion, and stunted growth.',
    treatment: 'No direct cure. Remove and destroy infected plants immediately.',
    prevention: 'Use virus-free planting material, control whitefly vectors.',
  },
  {
    id: 'tungro',
    name: 'Tungro',
    crop: 'Rice',
    scientificName: 'Rice Tungro Bacilliform Virus',
    severity: 'High',
    color: '#e05555',
    description: 'Yellow-orange discoloration, stunted growth, reduced tillering.',
    treatment: 'Control leafhopper vectors. Carbofuran application.',
    prevention: 'Synchronize planting, use resistant varieties, manage irrigation.',
  },
  {
    id: 'sheath_blight',
    name: 'Sheath Blight',
    crop: 'Rice',
    scientificName: 'Rhizoctonia solani',
    severity: 'Medium',
    color: '#f5a742',
    description: 'Oval greenish-grey lesions on leaf sheaths near water level.',
    treatment: 'Apply hexaconazole or validamycin fungicide.',
    prevention: 'Reduce plant density, drain fields periodically.',
  },
  {
    id: 'pulse_wilt',
    name: 'Fusarium Wilt',
    crop: 'Pulse',
    scientificName: 'Fusarium oxysporum',
    severity: 'High',
    color: '#e05555',
    description: 'Yellowing and wilting of lower leaves, brown vascular discoloration.',
    treatment: 'Carbendazim seed treatment, Trichoderma soil application.',
    prevention: 'Crop rotation, resistant varieties, soil solarization.',
  },
  {
    id: 'powdery_mildew',
    name: 'Powdery Mildew',
    crop: 'Pulse',
    scientificName: 'Erysiphe polygoni',
    severity: 'Low',
    color: '#2db567',
    description: 'White powdery coating on leaves, stems, and pods.',
    treatment: 'Apply sulfur-based fungicide or triadimefon.',
    prevention: 'Adequate spacing, avoid excessive humidity.',
  },
  {
    id: 'healthy',
    name: 'Healthy Leaf',
    crop: 'Various',
    scientificName: 'N/A',
    severity: 'None',
    color: '#2db567',
    description: 'No disease detected. The leaf appears healthy.',
    treatment: 'No treatment necessary.',
    prevention: 'Continue current agricultural practices.',
  },
];

// ---- Demo model prediction ----
function runDemoModel(imageFile) {
  return new Promise((resolve) => {
    // Simulate model inference delay (1.5–2.5s)
    const delay = 1500 + Math.random() * 1000;

    setTimeout(() => {
      // Randomly pick a primary disease (weighted toward diseases)
      const weights = [12, 10, 10, 8, 8, 8, 7, 7, 5]; // last=healthy less likely
      const total = weights.reduce((a, b) => a + b, 0);
      let rnd = Math.random() * total;
      let primaryIndex = 0;
      for (let i = 0; i < weights.length; i++) {
        rnd -= weights[i];
        if (rnd <= 0) { primaryIndex = i; break; }
      }

      const primary = DISEASE_DB[primaryIndex];
      const primaryConf = 0.72 + Math.random() * 0.24; // 72-96%

      // Generate top-5 predictions
      const others = DISEASE_DB
        .filter((_, i) => i !== primaryIndex)
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);

      let remaining = 1 - primaryConf;
      const otherConfs = others.map((_, i) => {
        const c = i === 3 ? remaining : (remaining * (0.1 + Math.random() * 0.4));
        remaining -= c;
        return Math.max(c, 0.01);
      });

      const topPredictions = [
        { disease: primary, confidence: primaryConf },
        ...others.map((d, i) => ({ disease: d, confidence: otherConfs[i] })),
      ].sort((a, b) => b.confidence - a.confidence);

      resolve({
        primary: topPredictions[0],
        topPredictions,
        model: 'EfficientNetB2',
        inferenceTime: Math.floor(delay) + 'ms',
        imageSize: `${imageFile.size} bytes`,
      });
    }, delay);
  });
}

// ---- Format confidence as percentage ----
function fmtPct(val) {
  return (val * 100).toFixed(1) + '%';
}

// ---- Severity badge color ----
function severityBadge(severity) {
  const map = {
    'High': 'badge-red',
    'Medium': 'badge-gold',
    'Low': 'badge-green',
    'None': 'badge-green',
  };
  return map[severity] || 'badge-green';
}

// Export for use in predict.js
window.CropModel = { runDemoModel, DISEASE_DB, fmtPct, severityBadge };
