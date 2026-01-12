CREATE TABLE `search_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`query` text NOT NULL,
	`centreName` varchar(255),
	`minSizeM2` decimal(10,2),
	`productCategory` varchar(255),
	`resultsCount` int NOT NULL,
	`hadResults` boolean NOT NULL,
	`suggestionsShown` int DEFAULT 0,
	`suggestionClicked` boolean DEFAULT false,
	`clickedSuggestion` varchar(255),
	`searchDate` timestamp NOT NULL,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `search_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `search_analytics` ADD CONSTRAINT `search_analytics_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `searchDate_idx` ON `search_analytics` (`searchDate`);--> statement-breakpoint
CREATE INDEX `hadResults_idx` ON `search_analytics` (`hadResults`);--> statement-breakpoint
CREATE INDEX `createdAt_idx` ON `search_analytics` (`createdAt`);