export const dynamic = 'force-dynamic';

const allowedLanguages = new Set(['en', 'ta', 'hi', 'te']);

export async function POST(request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
    return Response.json({ error: 'ElevenLabs is not configured on this server.' }, { status: 503 });
  }

  try {
    const { text, language = 'en' } = await request.json();
    const safeText = typeof text === 'string' ? text.trim().slice(0, 1200) : '';
    if (!safeText) return Response.json({ error: 'Text is required.' }, { status: 400 });

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
        body: JSON.stringify({
          text: safeText,
          // Flash supports Tamil with lower startup latency; Telugu still needs v3.
          model_id: language === 'ta' ? 'eleven_flash_v2_5' : language === 'te' ? 'eleven_v3' : 'eleven_multilingual_v2',
          language_code: allowedLanguages.has(language) ? language : 'en',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15000)
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return Response.json({ error: 'ElevenLabs could not generate speech.', detail: detail.slice(0, 300) }, { status: response.status });
    }

    return new Response(response.body, {
      headers: { 'Content-Type': response.headers.get('content-type') || 'audio/mpeg', 'Cache-Control': 'no-store' }
    });
  } catch {
    return Response.json({ error: 'The voice request could not be completed.' }, { status: 500 });
  }
}
