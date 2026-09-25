export const dynamic = 'force-dynamic';

const supportedLanguages = new Set(['en', 'ta', 'hi', 'te']);

function decodeEntities(value) {
  return value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

export async function POST(request) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  const { text, targetLanguage = 'en' } = await request.json().catch(() => ({}));
  const safeText = typeof text === 'string' ? text.trim().slice(0, 12000) : '';

  if (!safeText) return Response.json({ error: 'Text is required.' }, { status: 400 });
  if (!supportedLanguages.has(targetLanguage)) return Response.json({ error: 'Unsupported language.' }, { status: 400 });
  if (targetLanguage === 'en') return Response.json({ text: safeText });
  if (!apiKey) return Response.json({ error: 'Translation is not configured.' }, { status: 503 });

  try {
    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: safeText, target: targetLanguage, format: 'text' }),
      cache: 'no-store'
    });
    const payload = await response.json();
    const translated = payload?.data?.translations?.[0]?.translatedText;
    if (!response.ok || !translated) return Response.json({ error: 'Translation could not be completed.' }, { status: response.status || 502 });
    return Response.json({ text: decodeEntities(translated) });
  } catch {
    return Response.json({ error: 'Translation could not be completed.' }, { status: 502 });
  }
}
