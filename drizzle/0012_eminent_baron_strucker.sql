CREATE TABLE `site_usage_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteId` int NOT NULL,
	`categoryId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `site_usage_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `usage_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`isFree` boolean NOT NULL DEFAULT false,
	`displayOrder` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `usage_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `usage_categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `usageCategoryId` int;--> statement-breakpoint
ALTER TABLE `bookings` ADD `additionalCategoryText` text;--> statement-breakpoint
ALTER TABLE `site_usage_categories` ADD CONSTRAINT `site_usage_categories_siteId_sites_id_fk` FOREIGN KEY (`siteId`) REFERENCES `sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `site_usage_categories` ADD CONSTRAINT `site_usage_categories_categoryId_usage_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `usage_categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `siteId_idx` ON `site_usage_categories` (`siteId`);--> statement-breakpoint
CREATE INDEX `categoryId_idx` ON `site_usage_categories` (`categoryId`);--> statement-breakpoint
CREATE INDEX `unique_site_category` ON `site_usage_categories` (`siteId`,`categoryId`);--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_usageCategoryId_usage_categories_id_fk` FOREIGN KEY (`usageCategoryId`) REFERENCES `usage_categories`(`id`) ON DELETE no action ON UPDATE no action;