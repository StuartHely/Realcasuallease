CREATE TABLE `third_line_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`displayOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `third_line_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `third_line_categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `third_line_income` (
	`id` int AUTO_INCREMENT NOT NULL,
	`centreId` int NOT NULL,
	`assetNumber` varchar(50) NOT NULL,
	`categoryId` int NOT NULL,
	`dimensions` varchar(100),
	`powered` boolean NOT NULL DEFAULT false,
	`description` text,
	`imageUrl1` text,
	`imageUrl2` text,
	`pricePerWeek` decimal(10,2),
	`pricePerMonth` decimal(10,2),
	`floorLevelId` int,
	`mapMarkerX` int,
	`mapMarkerY` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `third_line_income_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vacant_shops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`centreId` int NOT NULL,
	`shopNumber` varchar(50) NOT NULL,
	`totalSizeM2` decimal(10,2),
	`dimensions` varchar(100),
	`powered` boolean NOT NULL DEFAULT false,
	`description` text,
	`imageUrl1` text,
	`imageUrl2` text,
	`pricePerWeek` decimal(10,2),
	`pricePerMonth` decimal(10,2),
	`floorLevelId` int,
	`mapMarkerX` int,
	`mapMarkerY` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vacant_shops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `third_line_income` ADD CONSTRAINT `third_line_income_centreId_shopping_centres_id_fk` FOREIGN KEY (`centreId`) REFERENCES `shopping_centres`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `third_line_income` ADD CONSTRAINT `third_line_income_categoryId_third_line_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `third_line_categories`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `third_line_income` ADD CONSTRAINT `third_line_income_floorLevelId_floor_levels_id_fk` FOREIGN KEY (`floorLevelId`) REFERENCES `floor_levels`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vacant_shops` ADD CONSTRAINT `vacant_shops_centreId_shopping_centres_id_fk` FOREIGN KEY (`centreId`) REFERENCES `shopping_centres`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vacant_shops` ADD CONSTRAINT `vacant_shops_floorLevelId_floor_levels_id_fk` FOREIGN KEY (`floorLevelId`) REFERENCES `floor_levels`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tli_centreId_idx` ON `third_line_income` (`centreId`);--> statement-breakpoint
CREATE INDEX `tli_categoryId_idx` ON `third_line_income` (`categoryId`);--> statement-breakpoint
CREATE INDEX `tli_floorLevelId_idx` ON `third_line_income` (`floorLevelId`);--> statement-breakpoint
CREATE INDEX `tli_isActive_idx` ON `third_line_income` (`isActive`);--> statement-breakpoint
CREATE INDEX `vs_centreId_idx` ON `vacant_shops` (`centreId`);--> statement-breakpoint
CREATE INDEX `vs_floorLevelId_idx` ON `vacant_shops` (`floorLevelId`);--> statement-breakpoint
CREATE INDEX `vs_isActive_idx` ON `vacant_shops` (`isActive`);