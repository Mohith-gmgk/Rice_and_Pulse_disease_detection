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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024,responseMimeType: "application/json" },
        }),
      }
    );

    let data;

    if (!response.ok) {
      const text = await response.text();
      console.error("Gemini API error:", text);
      return res.status(500).json({ success: false, error: text });
    }

    data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) return res.status(200).json({ success: false, error: 'Empty response from Gemini' });

    // Clean and parse JSON - handle various formats
    let clean = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/^\s*\n/gm, '')
      .trim();

    // Extract JSON object if wrapped in other text
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(200).json({ success: false, error: 'No JSON in response' });
    clean = jsonMatch[0];

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch(e) {
      return res.status(200).json({ success: false, error: 'JSON parse failed: ' + e.message });
    }

    return res.status(200).json({ success: true, info: parsed });

  } catch (err) {
    console.error('Gemini error:', err);
    return res.status(500).json({ error: err.message || 'Failed to get disease info' });
  }
}
