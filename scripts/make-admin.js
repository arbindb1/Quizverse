// Makes an existing account an admin:   node scripts/make-admin.js <username or email>
// Safe to run while the server is running (it only changes one flag and does not touch the rest of the database).
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const who = String(process.argv[2] || '').trim().toLowerCase();
  if (!who) { console.log('Usage: node scripts/make-admin.js <username or email>'); process.exit(1); }
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'quizverse',
  });
  const [r] = await conn.query('UPDATE users SET is_admin = 1 WHERE LOWER(username) = ? OR LOWER(email) = ?', [who, who]);
  console.log(r.affectedRows ? `${who} is now an admin. Log out and in again (or reload) to see the Admin link.` : `No account found for "${who}". Register it first.`);
  await conn.end();
  process.exit(r.affectedRows ? 0 : 2);
})().catch((e) => { console.error(e.message); process.exit(1); });
