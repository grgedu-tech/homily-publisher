const fs   = require('fs');
const path = require('path');

const SRC  = path.join(__dirname, 'homilies');
const DEST = path.join(__dirname, 'homilies.json');

try {
  if (!fs.existsSync(SRC)) { fs.writeFileSync(DEST, '[]'); process.exit(0); }

  const entries = fs.readdirSync(SRC)
    .filter(f => f.endsWith('.json'))
    .map(f => { try { return JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8')); } catch(e) { return null; } })
    .filter(Boolean)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  fs.writeFileSync(DEST, JSON.stringify(entries, null, 2));
  console.log('Built homilies.json with', entries.length, 'entries');
} catch(e) {
  console.error('Build error:', e.message);
  fs.writeFileSync(DEST, '[]');
}
