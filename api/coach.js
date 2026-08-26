export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      analysis:
        "Modo demo: todavía no hay una API key de Gemini configurada en Vercel " +
        "(Settings → Environment Variables → GEMINI_API_KEY). Una vez agregada, " +
        "este botón va a devolver un análisis real de tu semana.",
    });
  }

  const { tasks = [], notes = [] } = req.body || {};

  const prompt =
    "Sos el coach de a bordo de una app llamada Bitácora, que usa la metáfora de una travesía marítima " +
    "para el día a día de la persona. Con un tono cálido, directo y sin relleno, analizá esta semana y " +
    "devolvé: 3 observaciones concretas (qué avanzó, qué quedó varado, algún patrón) y una sugerencia " +
    "clara de rumbo para la semana próxima. Máximo 150 palabras, en español, sin encabezados ni markdown.\n\n" +
    `Tareas de la semana: ${JSON.stringify(tasks)}\n` +
    `Últimas notas del cuaderno de viaje: ${JSON.stringify(notes)}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `Error de la API de Gemini: ${errText}` });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return res.status(200).json({ analysis: text.trim() });
  } catch (err) {
    return res.status(500).json({ error: "No se pudo contactar al coach. Probá de nuevo." });
  }
}
