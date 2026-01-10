ALTER TABLE `bookings` ADD `paymentMethod` enum('stripe','invoice') DEFAULT 'stripe' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `paidAt` timestamp;--> statement-breakpoint
ALTER TABLE `bookings` ADD `paymentRecordedBy` int;--> statement-breakpoint
ALTER TABLE `users` ADD `canPayByInvoice` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_paymentRecordedBy_users_id_fk` FOREIGN KEY (`paymentRecordedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;