CREATE TABLE `event_checkins` (
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`event_id`, `user_id`),
	FOREIGN KEY (`event_id`) REFERENCES `meetups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `event_places` (
	`event_id` text PRIMARY KEY NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`updated` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `meetups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `listing_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`buyer_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`amount` integer NOT NULL,
	`counter` integer,
	`currency` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`buyer_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`seller_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `listing_offers_buyer_idx` ON `listing_offers` (`listing_id`,`buyer_id`);--> statement-breakpoint
CREATE INDEX `listing_offers_seller_idx` ON `listing_offers` (`seller_id`,`updated`);--> statement-breakpoint
CREATE TABLE `push_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`platform` text NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `push_tokens_user_idx` ON `push_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `vehicle_records` (
	`id` text PRIMARY KEY NOT NULL,
	`car_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`date` integer NOT NULL,
	`amount` integer,
	`currency` text DEFAULT 'PKR' NOT NULL,
	`odometer` integer,
	`litres` real,
	`full_tank` integer DEFAULT 1 NOT NULL,
	`due_date` integer,
	`due_odometer` integer,
	`image` text,
	`notes` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL,
	FOREIGN KEY (`car_id`) REFERENCES `cars`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `vehicle_records_car_idx` ON `vehicle_records` (`car_id`,`date`);--> statement-breakpoint
CREATE INDEX `vehicle_records_owner_idx` ON `vehicle_records` (`owner_id`);--> statement-breakpoint
ALTER TABLE `notifications` ADD `pushed` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `notifications_push_idx` ON `notifications` (`pushed`,`created`);