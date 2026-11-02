require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};
const DB_NAME = process.env.DB_NAME || 'quizverse';
let pool;

async function init() {
  const boot = await mysql.createConnection(cfg);
  await boot.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await boot.end();
  pool = mysql.createPool({ ...cfg, database: DB_NAME, waitForConnections: true, connectionLimit: 10, charset: 'utf8mb4' });
  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  for (const stmt of sql.split(/;\s*$/m).map((s) => s.trim()).filter(Boolean)) await pool.query(stmt);
  // upgrade databases created before the knockout format existed
  await ensureColumn('rooms', 'questions_per_match', 'TINYINT UNSIGNED NOT NULL DEFAULT 3');
  if (await ensureColumn('rooms', 'bot_count', 'TINYINT UNSIGNED NOT NULL DEFAULT 0')) {
    await pool.query('UPDATE rooms SET bot_count = 1 WHERE bot_enabled = 1');
  }
  // player progress and character skins
  await ensureColumn('users', 'xp', 'INT UNSIGNED NOT NULL DEFAULT 0');
  await ensureColumn('users', 'wins', 'INT UNSIGNED NOT NULL DEFAULT 0');
  await ensureColumn('users', 'tournaments', 'INT UNSIGNED NOT NULL DEFAULT 0');
  await ensureColumn('users', 'skin', "VARCHAR(30) NOT NULL DEFAULT 'rookie'");
  // accounts: email, admin and suspension flags, activity (for the admin CMS)
  await ensureColumn('users', 'email', 'VARCHAR(190) NULL');
  await ensureColumn('users', 'is_admin', 'TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumn('users', 'is_banned', 'TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumn('users', 'ban_reason', 'VARCHAR(200) NULL');
  await ensureColumn('users', 'last_login_at', 'TIMESTAMP NULL');
  await ensureColumn('users', 'last_seen_at', 'TIMESTAMP NULL');
  await ensureColumn('users', 'login_count', 'INT UNSIGNED NOT NULL DEFAULT 0');
  await ensureColumn('users', 'look', 'TEXT NULL'); // Custom Doodle parts, JSON
  await ensureColumn('users', 'is_guest', 'TINYINT(1) NOT NULL DEFAULT 0'); // Skribbl guests: just a name and a character
  await ensureIndex('users', 'uq_users_email', 'UNIQUE KEY uq_users_email (email)');
  // typing-race tournaments have no quiz
  await ensureColumn('rooms', 'game_type', "ENUM('quiz','typerace') NOT NULL DEFAULT 'quiz'");
  await ensureColumn('rooms', 'text_length', "ENUM('short','medium','long') NOT NULL DEFAULT 'medium'");
  const [[quizCol]] = await pool.query(
    "SELECT IS_NULLABLE AS nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'rooms' AND COLUMN_NAME = 'quiz_id'", [DB_NAME]);
  if (quizCol && quizCol.nullable === 'NO') await pool.query('ALTER TABLE rooms MODIFY quiz_id INT UNSIGNED NULL');
  await ensureColumn('room_players', 'skin', 'VARCHAR(30) NULL'); // bots wear the default character
  // analytics
  await ensureColumn('room_answers', 'wpm', 'SMALLINT NULL');
  await ensureColumn('room_answers', 'category', 'VARCHAR(50) NULL');
  await ensureColumn('room_answers', 'created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
  await ensureColumn('room_players', 'matches_played', 'SMALLINT UNSIGNED NOT NULL DEFAULT 0');
  await ensureColumn('room_players', 'matches_won', 'SMALLINT UNSIGNED NOT NULL DEFAULT 0');
  // typing races save the number of characters typed (up to ~270) in choice, which a TINYINT (max 127) cannot hold
  const [[choiceCol]] = await pool.query(
    "SELECT DATA_TYPE AS t FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'room_answers' AND COLUMN_NAME = 'choice'", [DB_NAME]);
  const [[gt]] = await pool.query(
    "SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'rooms' AND COLUMN_NAME = 'game_type'", [DB_NAME]);
  if (gt && !String(gt.t).includes('draw')) await pool.query("ALTER TABLE rooms MODIFY game_type ENUM('quiz','typerace','draw') NOT NULL DEFAULT 'quiz'");
  if (choiceCol && choiceCol.t === 'tinyint') await pool.query('ALTER TABLE room_answers MODIFY choice SMALLINT NULL');
  await ensureColumn('room_players', 'placement', 'SMALLINT UNSIGNED NULL');
  await ensureColumn('room_answers', 'match_no', 'SMALLINT NOT NULL DEFAULT 0');
  await pool.query('DELETE FROM users WHERE is_guest = 1 AND created_at < NOW() - INTERVAL 14 DAY'); // guest accounts (and their rooms) are throw-away
  await pool.query('DELETE FROM visits WHERE created_at < NOW() - INTERVAL 180 DAY'); // keep six months of page views
  // rooms that were mid-game when the server stopped can never resume
  await pool.query("UPDATE rooms SET status='finished', finished_at=NOW() WHERE status='playing'");
}

async function ensureIndex(table, name, ddl) {
  const [[r]] = await pool.query(
    'SELECT COUNT(*) AS n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?', [DB_NAME, table, name]);
  if (!r.n) await pool.query(`ALTER TABLE \`${table}\` ADD ${ddl}`);
}

async function ensureColumn(table, column, ddl) {
  const [[r]] = await pool.query(
    'SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [DB_NAME, table, column]);
  if (r.n) return false;
  await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${column} ${ddl}`);
  return true;
}

module.exports = {
  init,
  query: (...args) => pool.query(...args),
  getConnection: () => pool.getConnection(),
};
