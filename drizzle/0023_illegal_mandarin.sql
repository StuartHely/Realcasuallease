ALTER TABLE `bookings` ADD `paymentDueDate` timestamp;--> statement-breakpoint
ALTER TABLE `bookings` ADD `remindersSent` int DEFAULT 0 NOT NULL;