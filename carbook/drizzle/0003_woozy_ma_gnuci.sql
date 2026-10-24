CREATE INDEX `blocks_target_idx` ON `blocks` (`target_id`);--> statement-breakpoint
CREATE INDEX `conversations_user_a_idx` ON `conversations` (`user_a`,`updated`);--> statement-breakpoint
CREATE INDEX `conversations_user_b_idx` ON `conversations` (`user_b`,`updated`);--> statement-breakpoint
CREATE INDEX `follows_target_idx` ON `follows` (`target_id`);--> statement-breakpoint
CREATE INDEX `media_owner_idx` ON `media` (`owner_id`);--> statement-breakpoint
CREATE INDEX `memberships_group_idx` ON `memberships` (`group_id`);--> statement-breakpoint
CREATE INDEX `poll_votes_option_idx` ON `poll_votes` (`option_id`);--> statement-breakpoint
CREATE INDEX `posts_author_created_idx` ON `posts` (`author_id`,`created`);--> statement-breakpoint
CREATE INDEX `posts_group_created_idx` ON `posts` (`group_id`,`created`);--> statement-breakpoint
CREATE INDEX `posts_page_created_idx` ON `posts` (`page_id`,`created`);--> statement-breakpoint
CREATE INDEX `reactions_post_idx` ON `reactions` (`post_id`);--> statement-breakpoint
CREATE INDEX `rsvps_event_idx` ON `rsvps` (`event_id`);--> statement-breakpoint
CREATE INDEX `saves_post_idx` ON `saves` (`post_id`);