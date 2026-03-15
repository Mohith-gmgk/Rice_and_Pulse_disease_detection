export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Groq API key not configured' });

  try {
    const { disease, crop, confidence, isHealthy } = req.body;

    const prompt = isHealthy
      ? `The crop "${crop}" appears healthy with ${(confidence * 100).toFixed(1)}% confidence.
         Respond ONLY with a valid JSON object (no markdown, no extra text):
         {"description":"2-3 sentences about healthy ${crop}","treatment":["tip1","tip2","tip3"],"prevention":["tip1","tip2","tip3"]}`
      : `Disease "${disease}" detected in "${crop}" with ${(confidence * 100).toFixed(1)}% confidence.
         Respond ONLY with a valid JSON object (no markdown, no extra text):
         {"description":"2-3 sentences about this disease","symptoms":["s1","s2","s3","s4"],"treatment":["t1","t2","t3","t4"],"prevention":["p1","p2","p3","p4"],"urgency":"Immediate Action Required or Monitor Closely or Low Priority"}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are a crop disease expert. Always respond with valid JSON only, no markdown, no explanation.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    const data = await response.json();
    console.log('Groq raw response:', JSON.stringify(data));
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) return res.status(200).json({ success: false, error: 'Empty response from Groq: ' + JSON.stringify(data) });

    // Clean and parse JSON
    let clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
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
    console.error('Groq error:', err);
    return res.status(500).json({ error: err.message || 'Failed to get disease info' });
  }
}
