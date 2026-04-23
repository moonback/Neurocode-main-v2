CREATE TABLE `cost_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` integer DEFAULT (unixepoch()) NOT NULL,
	`provider` text NOT NULL,
	`app_id` integer NOT NULL,
	`chat_id` integer NOT NULL,
	`message_id` integer,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`input_cost` real NOT NULL,
	`output_cost` real NOT NULL,
	`total_cost` real NOT NULL,
	`model` text NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `message_priorities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` integer NOT NULL,
	`score` real NOT NULL,
	`recency_factor` real NOT NULL,
	`interaction_factor` real NOT NULL,
	`relevance_factor` real NOT NULL,
	`reference_count` integer DEFAULT 0 NOT NULL,
	`is_pinned` integer DEFAULT 0 NOT NULL,
	`calculated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `provider_pricing` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider_id` text NOT NULL,
	`input_tokens_per_million` real NOT NULL,
	`output_tokens_per_million` real NOT NULL,
	`last_updated` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_pricing_provider_id_unique` ON `provider_pricing` (`provider_id`);--> statement-breakpoint
CREATE TABLE `token_optimization_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_id` integer,
	`config` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `messages` ADD `is_pinned` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `last_priority_score` real;--> statement-breakpoint
ALTER TABLE `messages` ADD `reference_count` integer;