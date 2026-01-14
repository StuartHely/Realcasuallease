CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteId` int NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`budgetAmount` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `assignedState` varchar(3);--> statement-breakpoint
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_siteId_sites_id_fk` FOREIGN KEY (`siteId`) REFERENCES `sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `siteId_idx` ON `budgets` (`siteId`);--> statement-breakpoint
CREATE INDEX `month_year_idx` ON `budgets` (`month`,`year`);--> statement-breakpoint
CREATE INDEX `unique_site_month_year` ON `budgets` (`siteId`,`month`,`year`);