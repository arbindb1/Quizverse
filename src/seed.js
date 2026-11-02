const db = require('./db');

// Each quiz: [category, title, description, [[question, [answers], correctIndex], ...]]
const QUIZZES = [
  ['General Knowledge', 'General Knowledge Basics', 'Easy everyday trivia to warm up.', [
    ['How many days are in a leap year?', ['365', '366', '367', '364'], 1],
    ['Which planet is known as the Red Planet?', ['Venus', 'Jupiter', 'Mars', 'Mercury'], 2],
    ['Which is the largest ocean on Earth?', ['Atlantic', 'Indian', 'Arctic', 'Pacific'], 3],
    ['How many continents are there?', ['5', '6', '7', '8'], 2],
    ['What is the largest mammal in the world?', ['Blue whale', 'African elephant', 'Giraffe', 'Great white shark'], 0],
    ['What colour do you get by mixing blue and yellow?', ['Purple', 'Green', 'Orange', 'Brown'], 1],
    ['How many sides does a hexagon have?', ['5', '7', '6', '8'], 2],
    ['What is the hardest natural substance?', ['Gold', 'Quartz', 'Iron', 'Diamond'], 3],
  ]],
  ['Science', 'Science Starter', 'Biology, chemistry and physics basics.', [
    ['What is the chemical formula of water?', ['CO2', 'H2O', 'O2', 'NaCl'], 1],
    ['Which gas do plants absorb from the air?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'], 2],
    ['Roughly how fast does light travel?', ['300,000 km/s', '3,000 km/s', '30,000 km/h', '300 km/s'], 0],
    ['What is the centre of an atom called?', ['Electron', 'Nucleus', 'Cell', 'Orbit'], 1],
    ['Which planet is famous for its rings?', ['Mars', 'Earth', 'Neptune', 'Saturn'], 3],
    ['How many bones does an adult human have?', ['206', '180', '250', '300'], 0],
    ['What is the chemical symbol for gold?', ['Ag', 'Gd', 'Au', 'Go'], 2],
    ['Which force pulls objects towards the Earth?', ['Magnetism', 'Gravity', 'Friction', 'Inertia'], 1],
  ]],
  ['History', 'World History Highlights', 'Famous people and events.', [
    ['Who was the first President of the United States?', ['Abraham Lincoln', 'Thomas Jefferson', 'George Washington', 'John Adams'], 2],
    ['In which year did World War II end?', ['1918', '1939', '1950', '1945'], 3],
    ['Who painted the Mona Lisa?', ['Leonardo da Vinci', 'Michelangelo', 'Pablo Picasso', 'Vincent van Gogh'], 0],
    ['In which year did the Berlin Wall fall?', ['1979', '1989', '1991', '1999'], 1],
    ['Which empire built the Colosseum?', ['Greek', 'Ottoman', 'Roman', 'Persian'], 2],
    ['Who was the first person to walk on the Moon?', ['Buzz Aldrin', 'Yuri Gagarin', 'Neil Armstrong', 'Michael Collins'], 2],
    ['In which year did the Titanic sink?', ['1912', '1905', '1921', '1898'], 0],
    ['The pyramids of ancient Egypt were mainly built as what?', ['Markets', 'Tombs', 'Palaces', 'Temples for trade'], 1],
  ]],
  ['Geography', 'Around the World', 'Capitals, countries and landmarks.', [
    ['What is the capital of Japan?', ['Kyoto', 'Osaka', 'Tokyo', 'Seoul'], 2],
    ['Which river flows through Cairo?', ['Nile', 'Amazon', 'Danube', 'Tigris'], 0],
    ['Which is the largest country by area?', ['Canada', 'China', 'United States', 'Russia'], 3],
    ['Mount Everest lies on the border of Nepal and which country?', ['India', 'China', 'Bhutan', 'Pakistan'], 1],
    ['What is the capital of Australia?', ['Sydney', 'Melbourne', 'Canberra', 'Perth'], 2],
    ['In which continent is the Sahara Desert?', ['Asia', 'Africa', 'South America', 'Australia'], 1],
    ['Which country is shaped like a boot?', ['Spain', 'Greece', 'Portugal', 'Italy'], 3],
    ['What is the capital of Canada?', ['Toronto', 'Ottawa', 'Vancouver', 'Montreal'], 1],
  ]],
  ['Sports', 'Sports Trivia', 'Rules, records and tournaments.', [
    ['How many players per side are on the field in football (soccer)?', ['9', '10', '11', '12'], 2],
    ['How many rings are in the Olympic logo?', ['4', '5', '6', '7'], 1],
    ['Which sport is played at Wimbledon?', ['Cricket', 'Golf', 'Tennis', 'Rugby'], 2],
    ['Which country won the 2022 FIFA World Cup?', ['France', 'Brazil', 'Croatia', 'Argentina'], 3],
    ['How many balls are bowled in a standard cricket over?', ['6', '5', '8', '10'], 0],
    ['Which sport uses a shuttlecock?', ['Squash', 'Badminton', 'Table tennis', 'Hockey'], 1],
    ['Roughly how long is a marathon?', ['21 km', '30 km', '42 km', '50 km'], 2],
    ['How many points is a touchdown worth in American football (before the extra point)?', ['3', '7', '5', '6'], 3],
  ]],
  ['Movies & TV', 'Movie Night', 'Films, characters and directors.', [
    ['Who directed the 1997 film Titanic?', ['James Cameron', 'Steven Spielberg', 'Christopher Nolan', 'Ridley Scott'], 0],
    ['What is the wizarding school in Harry Potter called?', ['Beauxbatons', 'Hogwarts', 'Durmstrang', 'Ilvermorny'], 1],
    ['Which Disney film features the song "Hakuna Matata"?', ['Aladdin', 'Moana', 'The Lion King', 'Tarzan'], 2],
    ['Who plays Iron Man in the Marvel Cinematic Universe?', ['Chris Evans', 'Chris Hemsworth', 'Mark Ruffalo', 'Robert Downey Jr.'], 3],
    ['What is the cowboy toy called in Toy Story?', ['Woody', 'Buzz', 'Rex', 'Slinky'], 0],
    ['Which film series features Jedi and the Force?', ['Star Trek', 'Star Wars', 'Dune', 'Avatar'], 1],
    ['What is the fictional country in Black Panther?', ['Zamunda', 'Genovia', 'Wakanda', 'Latveria'], 2],
    ['Who directed Jurassic Park?', ['George Lucas', 'Peter Jackson', 'Tim Burton', 'Steven Spielberg'], 3],
  ]],
  ['Music', 'Music Mix', 'Bands, instruments and legends.', [
    ['How many strings does a standard guitar have?', ['4', '5', '6', '8'], 2],
    ['Who is known as the "King of Pop"?', ['Elvis Presley', 'Michael Jackson', 'Prince', 'Justin Timberlake'], 1],
    ['Which band recorded "Bohemian Rhapsody"?', ['The Rolling Stones', 'Led Zeppelin', 'Pink Floyd', 'Queen'], 3],
    ['Which instrument has black and white keys?', ['Piano', 'Flute', 'Violin', 'Drums'], 0],
    ['How many notes are in a basic do-re-mi scale (before repeating)?', ['5', '6', '7', '9'], 2],
    ['Which band included John Lennon and Paul McCartney?', ['The Beatles', 'The Who', 'The Kinks', 'Oasis'], 0],
    ['Which instrument is the larger relative of the violin, played sitting down?', ['Viola', 'Cello', 'Banjo', 'Ukulele'], 1],
    ['Which composer wrote the Ninth Symphony while almost completely deaf?', ['Mozart', 'Bach', 'Beethoven', 'Chopin'], 2],
  ]],
  ['Technology', 'Tech Basics', 'Computers, the web and software.', [
    ['What does HTML stand for?', ['HyperText Markup Language', 'High Transfer Markup Language', 'Home Tool Markup Language', 'HyperText Machine Language'], 0],
    ['What does CPU stand for?', ['Central Process Unit', 'Computer Personal Unit', 'Central Processing Unit', 'Core Program Utility'], 2],
    ['Which language runs natively in web browsers?', ['Python', 'JavaScript', 'C++', 'Java'], 1],
    ['What does "www" stand for?', ['World Wide Web', 'Web Wide World', 'Wide World Web', 'World Web Wire'], 0],
    ['Which company makes the iPhone?', ['Samsung', 'Google', 'Apple', 'Nokia'], 2],
    ['How many bits are in a byte?', ['4', '8', '16', '32'], 1],
    ['Which of these is a relational database?', ['Photoshop', 'Linux', 'Chrome', 'MySQL'], 3],
    ['Who co-founded Microsoft with Paul Allen?', ['Steve Jobs', 'Bill Gates', 'Elon Musk', 'Mark Zuckerberg'], 1],
  ]],
  ['Food & Drink', 'Food Lovers', 'Ingredients and cuisines.', [
    ['What is the main ingredient of guacamole?', ['Tomato', 'Avocado', 'Cucumber', 'Pea'], 1],
    ['Which country is sushi from?', ['China', 'Thailand', 'Korea', 'Japan'], 3],
    ['Which fruit is dried to make raisins?', ['Plums', 'Cherries', 'Grapes', 'Figs'], 2],
    ['Which Italian dish is made of layered pasta sheets, meat sauce and white sauce?', ['Lasagna', 'Risotto', 'Gnocchi', 'Ravioli'], 0],
    ['Which spice is the most expensive by weight?', ['Cinnamon', 'Saffron', 'Pepper', 'Turmeric'], 1],
    ['Tofu is made from what?', ['Rice', 'Wheat', 'Soybeans', 'Corn'], 2],
    ['What is the main ingredient of hummus?', ['Lentils', 'Beans', 'Potatoes', 'Chickpeas'], 3],
    ['Which drink is made by fermenting sweetened tea?', ['Kombucha', 'Kefir', 'Cider', 'Mead'], 0],
  ]],
  ['Nepal', 'Know Nepal', 'Culture, places and symbols of Nepal.', [
    ['What is the capital of Nepal?', ['Pokhara', 'Kathmandu', 'Lalitpur', 'Biratnagar'], 1],
    ['Which is the highest mountain in the world, found in Nepal?', ['K2', 'Kanchenjunga', 'Mount Everest', 'Lhotse'], 2],
    ['Where was Gautama Buddha born?', ['Bodh Gaya', 'Lumbini', 'Sarnath', 'Kapilvastu city centre'], 1],
    ['What is the national flower of Nepal?', ['Lotus', 'Marigold', 'Orchid', 'Rhododendron'], 3],
    ['What is the currency of Nepal?', ['Nepalese rupee', 'Taka', 'Baht', 'Kyat'], 0],
    ['What is unusual about the national flag of Nepal?', ['It is green', 'It has no colours', 'It is not rectangular', 'It has a star'], 2],
    ['Which festival is known as the festival of lights in Nepal?', ['Dashain', 'Tihar', 'Holi', 'Teej'], 1],
    ['What is the national animal of Nepal?', ['Tiger', 'Rhinoceros', 'Elephant', 'Cow'], 3],
  ]],
];

const SYSTEM_USER = 'quizverse';

// Idempotent: safe to run on every start-up. Only adds what is missing.
async function seed() {
  for (const [category] of QUIZZES) {
    await db.query('INSERT IGNORE INTO categories (name) VALUES (?)', [category]);
  }
  const extra = ['Art & Literature', 'Animals & Nature', 'Mathematics', 'Languages', 'Video Games'];
  for (const name of extra) await db.query('INSERT IGNORE INTO categories (name) VALUES (?)', [name]);

  // '!' is not a valid bcrypt hash, so nobody can ever log in as this account
  await db.query('INSERT IGNORE INTO users (username, password_hash) VALUES (?, ?)', [SYSTEM_USER, '!']);
  const [[owner]] = await db.query('SELECT id FROM users WHERE username = ?', [SYSTEM_USER]);

  let added = 0;
  for (const [category, title, description, questions] of QUIZZES) {
    const [[exists]] = await db.query('SELECT id FROM quizzes WHERE owner_id = ? AND title = ?', [owner.id, title]);
    if (exists) continue;
    const [[cat]] = await db.query('SELECT id FROM categories WHERE name = ?', [category]);
    const [q] = await db.query('INSERT INTO quizzes (owner_id, category_id, title, description, is_public) VALUES (?,?,?,?,1)',
      [owner.id, cat.id, title, description]);
    await db.query('INSERT INTO questions (quiz_id, position, text, options, correct_index, time_limit) VALUES ?',
      [questions.map(([text, options, correct], i) => [q.insertId, i, text, JSON.stringify(options), correct, 15])]);
    added++;
  }
  if (added) console.log(`Seeded ${added} starter quizzes`);
  await seedDrawWords();
}

// The words of Draw & Guess live in the table draw_words. The table is filled when it holds fewer than 1000 words; after that it is left alone, so words added or removed by hand stay that way.
async function seedDrawWords() {
  const { BY_CATEGORY } = require('./drawwords');
  const rows = [];
  const seen = new Set();
  for (const [category, list] of Object.entries(BY_CATEGORY)) {
    for (const raw of list.split(',')) {
      const w = raw.replace(/\s+/g, ' ').trim().toLowerCase();
      if (/^[a-z ]{2,40}$/.test(w) && !seen.has(w)) { seen.add(w); rows.push([w, category]); }
    }
  }
  const [[{ n: before }]] = await db.query('SELECT COUNT(*) AS n FROM draw_words');
  if (before >= 1000) return;
  for (let i = 0; i < rows.length; i += 400) await db.query('INSERT IGNORE INTO draw_words (word, category) VALUES ?', [rows.slice(i, i + 400)]);
  const [[{ n: after }]] = await db.query('SELECT COUNT(*) AS n FROM draw_words');
  console.log(`Draw & Guess words in the database: ${after} (${after - before} added)`);
}

module.exports = { seed, seedDrawWords, QUIZZES };
