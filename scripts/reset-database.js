/**
 * Script to reset the database by deleting the sqlite.db file
 * This will force the app to recreate it with all migrations on next startup
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

// Determine user data path (same logic as in src/paths/paths.ts)
function getUserDataPath() {
  const appName = "NeuroCode";

  switch (process.platform) {
    case "darwin":
      return path.join(os.homedir(), "Library", "Application Support", appName);
    case "win32":
      return path.join(
        process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
        appName,
      );
    case "linux":
      return path.join(
        process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"),
        appName,
      );
    default:
      return path.join(os.homedir(), `.${appName.toLowerCase()}`);
  }
}

const dbPath = path.join(getUserDataPath(), "sqlite.db");
const walPath = path.join(getUserDataPath(), "sqlite.db-wal");
const shmPath = path.join(getUserDataPath(), "sqlite.db-shm");

console.log("Database reset script");
console.log("====================");
console.log("Database path:", dbPath);
console.log("");

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.log("✓ Database file does not exist. Nothing to delete.");
  process.exit(0);
}

// Try to delete the database files
try {
  console.log("Deleting database files...");

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log("✓ Deleted:", dbPath);
  }

  if (fs.existsSync(walPath)) {
    fs.unlinkSync(walPath);
    console.log("✓ Deleted:", walPath);
  }

  if (fs.existsSync(shmPath)) {
    fs.unlinkSync(shmPath);
    console.log("✓ Deleted:", shmPath);
  }

  console.log("");
  console.log("✓ Database reset complete!");
  console.log("");
  console.log("Next steps:");
  console.log("1. Start the application: npm run dev");
  console.log("2. The database will be recreated with all tables");
} catch (error) {
  console.error("");
  console.error("✗ Error deleting database files:", error.message);
  console.error("");
  console.error(
    "The database file might be locked because the app is running.",
  );
  console.error("Please close the application completely and try again.");
  console.error("");
  process.exit(1);
}
