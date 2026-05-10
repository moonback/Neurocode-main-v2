/**
 * Diagnostic script to check token_analytics table data
 *
 * Run with: npx tsx scripts/check-token-analytics-db.ts
 */

import { db } from "../src/db";
import { tokenAnalytics } from "../src/db/schema";

async function checkDatabase() {
  console.log("🔍 Checking token_analytics table...\n");

  try {
    // Get all records
    const allRecords = db.select().from(tokenAnalytics).all();

    console.log(`📊 Total records in database: ${allRecords.length}\n`);

    if (allRecords.length > 0) {
      console.log("✅ Sample records:");
      allRecords.slice(0, 5).forEach((record, index) => {
        console.log(`\nRecord ${index + 1}:`);
        console.log(`  - ID: ${record.id}`);
        console.log(`  - Request ID: ${record.requestId}`);
        console.log(`  - Conversation ID: ${record.conversationId}`);
        console.log(`  - Skill Name: ${record.skillName}`);
        console.log(`  - Model Type: ${record.modelType}`);
        console.log(`  - Total Tokens: ${record.totalTokens}`);
        console.log(`  - Input Tokens: ${record.inputTokens}`);
        console.log(`  - Output Tokens: ${record.outputTokens}`);
        console.log(`  - Timestamp: ${record.timestamp}`);
      });

      // Test the same query that getStatistics uses
      console.log("\n\n🧪 Testing getStatistics query...");
      const { sql } = await import("drizzle-orm");

      const stats = db
        .select({
          totalRequests: sql<number>`COUNT(*)`,
          totalInputTokens: sql<number>`SUM(${tokenAnalytics.inputTokens})`,
          totalOutputTokens: sql<number>`SUM(${tokenAnalytics.outputTokens})`,
          totalTokens: sql<number>`SUM(${tokenAnalytics.totalTokens})`,
        })
        .from(tokenAnalytics)
        .get();

      console.log("\nQuery results:");
      console.log(`  - Total Requests: ${stats?.totalRequests}`);
      console.log(`  - Total Input Tokens: ${stats?.totalInputTokens}`);
      console.log(`  - Total Output Tokens: ${stats?.totalOutputTokens}`);
      console.log(`  - Total Tokens: ${stats?.totalTokens}`);
    } else {
      console.log("❌ No records found in token_analytics table");
      console.log("\nPossible reasons:");
      console.log("  1. Token tracking hasn't been triggered yet");
      console.log("  2. Database file is in a different location");
      console.log(
        "  3. Data is being written to a different database instance",
      );
    }
  } catch (error) {
    console.error("❌ Error checking database:", error);
    console.error("\nError details:", error);
  }
}

checkDatabase().catch(console.error);
