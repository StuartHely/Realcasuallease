CREATE TABLE `image_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`site_id` int NOT NULL,
	`image_slot` int NOT NULL,
	`view_count` int NOT NULL DEFAULT 0,
	`click_count` int NOT NULL DEFAULT 0,
	`last_viewed_at` timestamp,
	`last_clicked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `image_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `image_analytics` ADD CONSTRAINT `image_analytics_site_id_sites_id_fk` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE cascade ON UPDATE no action;