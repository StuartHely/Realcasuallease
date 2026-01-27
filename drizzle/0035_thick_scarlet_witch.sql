CREATE TABLE `booking_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`previousStatus` enum('pending','confirmed','cancelled','completed','rejected'),
	`newStatus` enum('pending','confirmed','cancelled','completed','rejected') NOT NULL,
	`changedBy` int,
	`changedByName` varchar(255),
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `booking_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `booking_status_history` ADD CONSTRAINT `booking_status_history_bookingId_bookings_id_fk` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_status_history` ADD CONSTRAINT `booking_status_history_changedBy_users_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `booking_status_bookingId_idx` ON `booking_status_history` (`bookingId`);--> statement-breakpoint
CREATE INDEX `booking_status_createdAt_idx` ON `booking_status_history` (`createdAt`);