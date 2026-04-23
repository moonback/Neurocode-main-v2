CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`suggestion_generation_enabled` integer DEFAULT 1 NOT NULL,
	`suggestion_display_enabled` integer DEFAULT 1 NOT NULL,
	`max_suggestions_per_task` integer DEFAULT 5 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
