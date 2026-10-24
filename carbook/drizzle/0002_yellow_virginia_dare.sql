CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`target_id` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `circles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`privacy` text DEFAULT 'open' NOT NULL,
	`color` text DEFAULT 'forest' NOT NULL,
	`image` text,
	`rules` text DEFAULT 'Be respectful. Give credit. Keep conversations on topic.' NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `content_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`reporter_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_a` text NOT NULL,
	`user_b` text NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL,
	`read_a` integer DEFAULT 0 NOT NULL,
	`read_b` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_a`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_b`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `friendships` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`sender_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `friendships_recipient_idx` ON `friendships` (`recipient_id`,`status`);--> statement-breakpoint
CREATE INDEX `friendships_sender_idx` ON `friendships` (`sender_id`,`status`);--> statement-breakpoint
CREATE TABLE `listing_saves` (
	`listing_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`listing_id`, `user_id`),
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`price` integer NOT NULL,
	`currency` text DEFAULT 'PKR' NOT NULL,
	`category` text NOT NULL,
	`city` text NOT NULL,
	`image` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`seller_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `listings_created_idx` ON `listings` (`created`);--> statement-breakpoint
CREATE TABLE `meetups` (
	`id` text PRIMARY KEY NOT NULL,
	`organizer_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`city` text NOT NULL,
	`location` text NOT NULL,
	`starts` integer NOT NULL,
	`capacity` integer DEFAULT 100 NOT NULL,
	`image` text,
	`status` text DEFAULT 'published' NOT NULL,
	`example` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`organizer_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`image` text,
	`created` integer NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `messages_conversation_idx` ON `messages` (`conversation_id`,`created`);--> statement-breakpoint
CREATE TABLE `page_follows` (
	`page_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`page_id`, `user_id`),
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`city` text NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`image` text,
	`created` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `poll_options` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`label` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `poll_votes` (
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
	`option_id` text NOT NULL,
	PRIMARY KEY(`post_id`, `user_id`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`option_id`) REFERENCES `poll_options`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stories` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`image` text,
	`color` text DEFAULT 'forest' NOT NULL,
	`audience` text DEFAULT 'community' NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stories_expires_idx` ON `stories` (`expires`);--> statement-breakpoint
CREATE TABLE `story_views` (
	`story_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`story_id`, `user_id`),
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `comments` ADD `parent_id` text;--> statement-breakpoint
ALTER TABLE `comments` ADD `edited` integer;--> statement-breakpoint
ALTER TABLE `media` ADD `size` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `memberships` ADD `role` text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE `memberships` ADD `status` text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `edited` integer;--> statement-breakpoint
ALTER TABLE `posts` ADD `audience` text DEFAULT 'community' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `attachments` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `shared_post_id` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `page_id` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `cover` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `website` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `default_audience` text DEFAULT 'community' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `message_policy` text DEFAULT 'friends' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `notifications_enabled` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `show_examples` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `onboarded` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reactions` ADD `kind` text DEFAULT 'love' NOT NULL;--> statement-breakpoint
ALTER TABLE `rsvps` ADD `status` text DEFAULT 'interested' NOT NULL;