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
Provide JSON response:
{
 "description": "...",
 "treatment": ["...","...","..."],
 "prevention": ["...","...","..."]
}`
      : `Disease "${disease}" detected in "${crop}" with ${(confidence * 100).toFixed(1)}% confidence.
Provide JSON response:
{
 "description": "...",
 "symptoms": ["...","...","...","..."],
 "treatment": ["...","...","...","..."],
 "prevention": ["...","...","...","..."],
 "urgency": "Immediate Action Required | Monitor Closely | Low Priority"
}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are an agricultural expert giving disease diagnosis advice." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Groq API error:", text);
      return res.status(500).json({ success: false, error: text });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    if (!text) {
      return res.status(200).json({ success: false, error: 'Empty response from Groq' });
    }

    // Clean response if wrapped in markdown
    let clean = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(200).json({ success: false, error: 'No JSON found in response' });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return res.status(200).json({ success: true, info: parsed });

  } catch (err) {
    console.error('Groq error:', err);
    return res.status(500).json({ error: err.message || 'Failed to get disease info' });
  }
}