ALTER TABLE `shopping_centres` ADD `centreCode` varchar(50);--> statement-breakpoint
ALTER TABLE `shopping_centres` ADD CONSTRAINT `shopping_centres_centreCode_unique` UNIQUE(`centreCode`);--> statement-breakpoint
CREATE INDEX `siteId_date_range_idx` ON `bookings` (`siteId`,`startDate`,`endDate`);