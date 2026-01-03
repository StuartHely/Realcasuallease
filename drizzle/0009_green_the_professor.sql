ALTER TABLE `bookings` ADD `tablesRequested` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `bookings` ADD `chairsRequested` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `shopping_centres` ADD `totalTablesAvailable` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `shopping_centres` ADD `totalChairsAvailable` int DEFAULT 0;