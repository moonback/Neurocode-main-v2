const Database = require('better-sqlite3');
const path = require('path');

const dbPath = 'C:\\Users\\Mayss\\Documents\\GitHub\\Neurocode-main\\userData\\sqlite.db';
const db = new Database(dbPath);

console.log('--- Table Info ---');
const tableInfo = db.prepare('PRAGMA table_info(token_analytics)').all();
console.log(JSON.stringify(tableInfo, null, 2));

console.log('--- Row Count ---');
const count = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get();
console.log(JSON.stringify(count, null, 2));

console.log('--- Last 5 Rows ---');
const rows = db.prepare('SELECT * FROM token_analytics ORDER BY timestamp DESC LIMIT 5').all();
console.log(JSON.stringify(rows, null, 2));

db.close();
