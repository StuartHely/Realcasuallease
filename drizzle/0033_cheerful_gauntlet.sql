ALTER TABLE `bookings` ADD `adminComments` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `createdByAdmin` int;--> statement-breakpoint
ALTER TABLE `bookings` ADD `invoiceOverride` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_createdByAdmin_users_id_fk` FOREIGN KEY (`createdByAdmin`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;