CREATE TABLE `deletion_requests` (
	`user_id` text PRIMARY KEY NOT NULL,
	`requested` integer NOT NULL,
	`execute_after` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `deletion_requests_due_idx` ON `deletion_requests` (`status`,`execute_after`);--> statement-breakpoint
CREATE TABLE `mobile_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mobile_identities_user_idx` ON `mobile_identities` (`user_id`);--> statement-breakpoint
CREATE TABLE `mobile_link_codes` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mobile_link_codes_user_idx` ON `mobile_link_codes` (`user_id`);