CREATE TABLE `skill_analytics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`skill_name` text NOT NULL,
	`execution_count` integer DEFAULT 0 NOT NULL,
	`total_execution_time` integer DEFAULT 0 NOT NULL,
	`cache_hits` integer DEFAULT 0 NOT NULL,
	`cache_misses` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`last_used` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skill_analytics_skill_name_unique` ON `skill_analytics` (`skill_name`);--> statement-breakpoint
CREATE TABLE `token_analytics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` text NOT NULL,
	`conversation_id` text,
	`skill_name` text,
	`timestamp` integer DEFAULT (unixepoch()) NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`total_tokens` integer NOT NULL,
	`model_type` text NOT NULL,
	`optimizations_saved` integer DEFAULT 0 NOT NULL,
	`cost_estimate` integer
);
--> statement-breakpoint
CREATE INDEX `idx_token_analytics_conversation` ON `token_analytics` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_token_analytics_skill` ON `token_analytics` (`skill_name`);--> statement-breakpoint
CREATE INDEX `idx_token_analytics_timestamp` ON `token_analytics` (`timestamp`);
