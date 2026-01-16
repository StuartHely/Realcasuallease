CREATE TABLE `third_line_bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingNumber` varchar(50) NOT NULL,
	`thirdLineIncomeId` int NOT NULL,
	`customerId` int NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`totalAmount` decimal(12,2) NOT NULL,
	`gstAmount` decimal(12,2) NOT NULL,
	`gstPercentage` decimal(5,2) NOT NULL,
	`ownerAmount` decimal(12,2) NOT NULL,
	`platformFee` decimal(12,2) NOT NULL,
	`status` enum('pending','confirmed','cancelled','completed','rejected') NOT NULL DEFAULT 'pending',
	`requiresApproval` boolean NOT NULL DEFAULT false,
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`stripePaymentIntentId` varchar(255),
	`paymentMethod` enum('stripe','invoice') NOT NULL DEFAULT 'stripe',
	`paidAt` timestamp,
	`paymentRecordedBy` int,
	`paymentDueDate` timestamp,
	`customerEmail` varchar(320),
	`customerNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `third_line_bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `third_line_bookings_bookingNumber_unique` UNIQUE(`bookingNumber`)
);
--> statement-breakpoint
CREATE TABLE `vacant_shop_bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingNumber` varchar(50) NOT NULL,
	`vacantShopId` int NOT NULL,
	`customerId` int NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`totalAmount` decimal(12,2) NOT NULL,
	`gstAmount` decimal(12,2) NOT NULL,
	`gstPercentage` decimal(5,2) NOT NULL,
	`ownerAmount` decimal(12,2) NOT NULL,
	`platformFee` decimal(12,2) NOT NULL,
	`status` enum('pending','confirmed','cancelled','completed','rejected') NOT NULL DEFAULT 'pending',
	`requiresApproval` boolean NOT NULL DEFAULT false,
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`stripePaymentIntentId` varchar(255),
	`paymentMethod` enum('stripe','invoice') NOT NULL DEFAULT 'stripe',
	`paidAt` timestamp,
	`paymentRecordedBy` int,
	`paymentDueDate` timestamp,
	`customerEmail` varchar(320),
	`customerNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vacant_shop_bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `vacant_shop_bookings_bookingNumber_unique` UNIQUE(`bookingNumber`)
);
--> statement-breakpoint
ALTER TABLE `third_line_bookings` ADD CONSTRAINT `third_line_bookings_thirdLineIncomeId_third_line_income_id_fk` FOREIGN KEY (`thirdLineIncomeId`) REFERENCES `third_line_income`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `third_line_bookings` ADD CONSTRAINT `third_line_bookings_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `third_line_bookings` ADD CONSTRAINT `third_line_bookings_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `third_line_bookings` ADD CONSTRAINT `third_line_bookings_paymentRecordedBy_users_id_fk` FOREIGN KEY (`paymentRecordedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vacant_shop_bookings` ADD CONSTRAINT `vacant_shop_bookings_vacantShopId_vacant_shops_id_fk` FOREIGN KEY (`vacantShopId`) REFERENCES `vacant_shops`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vacant_shop_bookings` ADD CONSTRAINT `vacant_shop_bookings_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vacant_shop_bookings` ADD CONSTRAINT `vacant_shop_bookings_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vacant_shop_bookings` ADD CONSTRAINT `vacant_shop_bookings_paymentRecordedBy_users_id_fk` FOREIGN KEY (`paymentRecordedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tlb_thirdLineIncomeId_idx` ON `third_line_bookings` (`thirdLineIncomeId`);--> statement-breakpoint
CREATE INDEX `tlb_customerId_idx` ON `third_line_bookings` (`customerId`);--> statement-breakpoint
CREATE INDEX `tlb_startDate_idx` ON `third_line_bookings` (`startDate`);--> statement-breakpoint
CREATE INDEX `tlb_status_idx` ON `third_line_bookings` (`status`);--> statement-breakpoint
CREATE INDEX `tlb_date_range_idx` ON `third_line_bookings` (`thirdLineIncomeId`,`startDate`,`endDate`);--> statement-breakpoint
CREATE INDEX `vsb_vacantShopId_idx` ON `vacant_shop_bookings` (`vacantShopId`);--> statement-breakpoint
CREATE INDEX `vsb_customerId_idx` ON `vacant_shop_bookings` (`customerId`);--> statement-breakpoint
CREATE INDEX `vsb_startDate_idx` ON `vacant_shop_bookings` (`startDate`);--> statement-breakpoint
CREATE INDEX `vsb_status_idx` ON `vacant_shop_bookings` (`status`);--> statement-breakpoint
CREATE INDEX `vsb_date_range_idx` ON `vacant_shop_bookings` (`vacantShopId`,`startDate`,`endDate`);