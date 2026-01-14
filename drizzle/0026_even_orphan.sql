CREATE TABLE `centre_budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`centreId` int NOT NULL,
	`financialYear` int NOT NULL,
	`annualBudget` decimal(14,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `centre_budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fy_percentages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`financialYear` int NOT NULL,
	`july` decimal(5,2) NOT NULL DEFAULT '8.33',
	`august` decimal(5,2) NOT NULL DEFAULT '8.33',
	`september` decimal(5,2) NOT NULL DEFAULT '8.33',
	`october` decimal(5,2) NOT NULL DEFAULT '8.33',
	`november` decimal(5,2) NOT NULL DEFAULT '8.33',
	`december` decimal(5,2) NOT NULL DEFAULT '8.33',
	`january` decimal(5,2) NOT NULL DEFAULT '8.33',
	`february` decimal(5,2) NOT NULL DEFAULT '8.33',
	`march` decimal(5,2) NOT NULL DEFAULT '8.33',
	`april` decimal(5,2) NOT NULL DEFAULT '8.33',
	`may` decimal(5,2) NOT NULL DEFAULT '8.33',
	`june` decimal(5,2) NOT NULL DEFAULT '8.37',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fy_percentages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `centre_budgets` ADD CONSTRAINT `centre_budgets_centreId_shopping_centres_id_fk` FOREIGN KEY (`centreId`) REFERENCES `shopping_centres`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `centreId_idx` ON `centre_budgets` (`centreId`);--> statement-breakpoint
CREATE INDEX `financial_year_idx` ON `centre_budgets` (`financialYear`);--> statement-breakpoint
CREATE INDEX `unique_centre_fy` ON `centre_budgets` (`centreId`,`financialYear`);--> statement-breakpoint
CREATE INDEX `unique_financial_year` ON `fy_percentages` (`financialYear`);