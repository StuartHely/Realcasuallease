CREATE TABLE `imageAnalytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`site_id` int NOT NULL,
	`image_slot` int NOT NULL,
	`view_count` int NOT NULL DEFAULT 0,
	`click_count` int NOT NULL DEFAULT 0,
	`last_viewed_at` timestamp,
	`last_clicked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `imageAnalytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seasonalRates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10) NOT NULL,
	`weekdayRate` decimal(10,2),
	`weekendRate` decimal(10,2),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `seasonalRates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `image_analytics`;--> statement-breakpoint
ALTER TABLE `imageAnalytics` ADD CONSTRAINT `imageAnalytics_site_id_sites_id_fk` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE cascade ON UPDATE no action;