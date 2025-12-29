CREATE TABLE `floor_levels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`centreId` int NOT NULL,
	`levelName` varchar(100) NOT NULL,
	`levelNumber` int NOT NULL,
	`mapImageUrl` text,
	`displayOrder` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `floor_levels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sites` ADD `floorLevelId` int;--> statement-breakpoint
ALTER TABLE `floor_levels` ADD CONSTRAINT `floor_levels_centreId_shopping_centres_id_fk` FOREIGN KEY (`centreId`) REFERENCES `shopping_centres`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `centreId_idx` ON `floor_levels` (`centreId`);--> statement-breakpoint
ALTER TABLE `sites` ADD CONSTRAINT `sites_floorLevelId_floor_levels_id_fk` FOREIGN KEY (`floorLevelId`) REFERENCES `floor_levels`(`id`) ON DELETE set null ON UPDATE no action;