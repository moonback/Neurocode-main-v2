PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_agent_executions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chat_id` integer NOT NULL,
	`agent_profile_id` integer NOT NULL,
	`parent_execution_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`task` text NOT NULL,
	`result` text,
	`error` text,
	`metadata` text,
	`selection_reasoning` text,
	`selection_method` text,
	`selection_confidence` integer,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agent_profile_id`) REFERENCES `agent_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_agent_executions`("id", "chat_id", "agent_profile_id", "parent_execution_id", "status", "task", "result", "error", "metadata", "selection_reasoning", "selection_method", "selection_confidence", "started_at", "completed_at", "created_at") SELECT "id", "chat_id", "agent_profile_id", "parent_execution_id", "status", "task", "result", "error", "metadata", "selection_reasoning", "selection_method", "selection_confidence", "started_at", "completed_at", "created_at" FROM `agent_executions`;--> statement-breakpoint
DROP TABLE `agent_executions`;--> statement-breakpoint
ALTER TABLE `__new_agent_executions` RENAME TO `agent_executions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;