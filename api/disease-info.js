export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Gemini API key not configured' });

  try {
    const { disease, crop, confidence, isHealthy } = req.body;

    const prompt = isHealthy
      ? `The crop "${crop}" has been analyzed and appears completely healthy with ${(confidence * 100).toFixed(1)}% confidence.
         Provide a brief JSON response with:
         - description: 2-3 sentences about what a healthy ${crop} plant looks like
         - treatment: array of 3 tips to maintain plant health
         - prevention: array of 3 preventive care tips
         Respond ONLY with valid JSON, no markdown.`
      : `A plant disease called "${disease}" has been detected in "${crop}" with ${(confidence * 100).toFixed(1)}% confidence.
         Provide a detailed JSON response with:
         - description: 2-3 sentences explaining what this disease is and how it affects the crop
         - symptoms: array of 4 visible symptoms to look for
         - treatment: array of 4 specific treatment steps a farmer should take
         - prevention: array of 4 prevention measures for future crops
         - urgency: one of "Immediate Action Required", "Monitor Closely", "Low Priority"
         Respond ONLY with valid JSON, no markdown backticks.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean and parse JSON
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json({ success: true, info: parsed });

  } catch (err) {
    console.error('Gemini error:', err);
    return res.status(500).json({ error: err.message || 'Failed to get disease info' });
  }
}
