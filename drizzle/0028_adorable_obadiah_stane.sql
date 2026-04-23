CREATE TABLE `task_completion_suggestions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` text NOT NULL,
	`task_description` text NOT NULL,
	`spec_type` text NOT NULL,
	`spec_path` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`priority_score` integer NOT NULL,
	`user_action` text DEFAULT 'pending' NOT NULL,
	`action_timestamp` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_task_id` text
);
--> statement-breakpoint
CREATE INDEX `task_id_idx` ON `task_completion_suggestions` (`task_id`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `task_completion_suggestions` (`created_at`);