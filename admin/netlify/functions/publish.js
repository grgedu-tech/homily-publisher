// netlify/functions/publish.js
// Receives homily data, writes to GitHub, triggers Netlify rebuild.

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO  = process.env.GITHUB_REPO; // format: username/reponame

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server not configured. Add GITHUB_TOKEN and GITHUB_REPO to Netlify environment variables.' })
    };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }

  const { date, en, es } = body;
  if (!date) return { statusCode: 400, body: JSON.stringify({ error: 'date is required' }) };
  if (!en && !es) return { statusCode: 400, body: JSON.stringify({ error: 'At least one homily text required' }) };

  const entry   = { date, en: en || '', es: es || '' };
  const content = Buffer.from(JSON.stringify(entry, null, 2)).toString('base64');
  const path    = `homilies/${date}.json`;
  const apiURL  = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;

  const headers = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Content-Type':  'application/json',
    'User-Agent':    'daily-homily-cms'
  };

  // Check if file already exists (need its SHA to update)
  let sha;
  try {
    const check = await fetch(apiURL, { headers });
    if (check.ok) {
      const existing = await check.json();
      sha = existing.sha;
    }
  } catch(e) { /* file doesn't exist yet — that's fine */ }

  // Create or update the file
  const payload = {
    message: `Homily for ${date}`,
    content,
    branch: 'main'
  };
  if (sha) payload.sha = sha;

  try {
    const res  = await fetch(apiURL, { method: 'PUT', headers, body: JSON.stringify(payload) });
    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data.message || 'GitHub API error' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, date })
    };
  } catch(e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
