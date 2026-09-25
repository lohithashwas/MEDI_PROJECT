// Approximate matching is limited to navigation; never use it for form actions.
const aliases = {
  appointments: ['appointment', 'appointments', 'appoints', 'appoint', 'book doctor', 'doctor visit', 'doctor appointment', 'consultation', 'consult doctor', 'book a visit'],
  checks: ['health check', 'health checks', 'health test', 'health tests', 'medical check', 'medical checks', 'checkup', 'checkups', 'check up', 'check ups', 'checks', 'screening', 'screenings', 'test', 'tests']
};

function distance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  }
  return rows[a.length][b.length];
}

export function navigationIntent(raw) {
  const tokens = raw.toLowerCase().replace(/[^a-z\s]/g, ' ').trim().split(/\s+/);
  let best = null;
  for (const [intent, phrases] of Object.entries(aliases)) {
    for (const phrase of phrases) {
      const words = phrase.split(' ');
      for (let offset = 0; offset <= tokens.length - words.length; offset++) {
        let score = 0;
        const matches = words.every((word, index) => {
          const edits = distance(word, tokens[offset + index]);
          score += edits;
          return edits <= (word.length >= 8 ? 2 : word.length >= 5 ? 1 : 0);
        });
        if (matches && (!best || score < best.score)) best = { intent, score };
      }
    }
  }
  return best?.intent || null;
}
