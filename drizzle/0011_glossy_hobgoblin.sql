ALTER TABLE `bookings` ADD `customerEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `bookings` ADD `confirmationEmailSent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `reminderEmailSent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `completionEmailSent` boolean DEFAULT false NOT NULL;