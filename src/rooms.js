const db = require('./db');
const { parseLook } = require('./look');

async function lobbyState(code) {
  const [[room]] = await db.query(
    `SELECT r.id, r.code, r.invite_token, r.name, r.host_id, r.max_players, r.bot_count, r.bot_difficulty, r.questions_per_match, r.game_type, r.text_length, r.status,
            q.title AS quiz_title, u.username AS host_name,
            COALESCE((SELECT COUNT(*) FROM questions WHERE quiz_id = r.quiz_id), 0) AS question_count
       FROM rooms r LEFT JOIN quizzes q ON q.id = r.quiz_id JOIN users u ON u.id = r.host_id
      WHERE r.code = ?`, [code]);
  if (!room) return null;
  const [players] = await db.query(
    `SELECT p.id, p.user_id, p.is_bot, p.display_name, p.score, COALESCE(u.skin, p.skin) AS skin, u.look FROM room_players p
       LEFT JOIN users u ON u.id = p.user_id WHERE p.room_id = ? ORDER BY p.id`, [room.id]);
  return {
    code: room.code,
    inviteToken: room.invite_token,
    name: room.name,
    hostId: room.host_id,
    hostName: (players.find((p) => p.user_id === room.host_id) || {}).display_name || room.host_name, // a guest host shows the name they typed
    gameType: room.game_type,
    textLength: room.text_length,
    quizTitle: room.quiz_title || (room.game_type === 'draw' ? 'Draw & Guess' : 'Typing race'),
    questionCount: room.question_count,
    maxPlayers: room.max_players,
    botEnabled: room.bot_count > 0,
    botCount: room.bot_count,
    botDifficulty: room.bot_difficulty,
    questionsPerMatch: room.questions_per_match,
    status: room.status,
    players: players.map((p) => ({
      id: p.id, userId: p.user_id, name: p.display_name, isBot: !!p.is_bot, skin: p.skin || (p.is_bot ? null : 'rookie'), look: parseLook(p.look), // Draw & Guess shows everybody as a Custom Doodle
      isHost: p.user_id === room.host_id, score: p.score,
    })),
  };
}

module.exports = { lobbyState };
