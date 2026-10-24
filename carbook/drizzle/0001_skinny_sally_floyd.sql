CREATE TABLE `moderation_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`moderator_id` text NOT NULL,
	`report_id` text NOT NULL,
	`post_id` text NOT NULL,
	`decision` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`moderator_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `profiles` ADD `role` text DEFAULT 'member' NOT NULL;