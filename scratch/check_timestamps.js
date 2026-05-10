const Database = require('better-sqlite3');
const dbPath = 'C:\\Users\\Mayss\\Documents\\GitHub\\Neurocode-main\\userData\\sqlite.db';
const db = new Database(dbPath);

console.log('--- Raw Timestamps ---');
const rows = db.prepare('SELECT timestamp, request_id, total_tokens FROM token_analytics ORDER BY timestamp DESC LIMIT 5').all();
console.log(JSON.stringify(rows, null, 2));

console.log('--- Current Time ---');
console.log('Date.now():', Date.now());

db.close();
