CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(255) NOT NULL,
	`entityType` varchar(100),
	`entityId` int,
	`changes` text,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingNumber` varchar(50) NOT NULL,
	`siteId` int NOT NULL,
	`customerId` int NOT NULL,
	`usageTypeId` int,
	`customUsage` text,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`totalAmount` decimal(12,2) NOT NULL,
	`gstAmount` decimal(12,2) NOT NULL,
	`ownerAmount` decimal(12,2) NOT NULL,
	`platformFee` decimal(12,2) NOT NULL,
	`status` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
	`requiresApproval` boolean NOT NULL DEFAULT false,
	`approvedBy` int,
	`approvedAt` timestamp,
	`stripePaymentIntentId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `bookings_bookingNumber_unique` UNIQUE(`bookingNumber`)
);
--> statement-breakpoint
CREATE TABLE `customer_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`firstName` varchar(100),
	`lastName` varchar(100),
	`phone` varchar(20),
	`companyName` varchar(255),
	`website` varchar(255),
	`abn` varchar(11),
	`streetAddress` text,
	`city` varchar(100),
	`state` varchar(50),
	`postcode` varchar(10),
	`productCategory` varchar(255),
	`insuranceCompany` varchar(255),
	`insurancePolicyNo` varchar(100),
	`insuranceAmount` decimal(12,2),
	`insuranceExpiry` timestamp,
	`insuranceDocumentUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `owners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`bankName` varchar(255),
	`bankAccountName` varchar(255),
	`bankBsb` varchar(10),
	`bankAccountNumber` varchar(20),
	`monthlyFee` decimal(10,2) NOT NULL DEFAULT '0.00',
	`commissionPercentage` decimal(5,2) NOT NULL DEFAULT '0.00',
	`remittanceType` enum('per_booking','monthly') NOT NULL DEFAULT 'monthly',
	`invoiceEmail1` varchar(320),
	`invoiceEmail2` varchar(320),
	`invoiceEmail3` varchar(320),
	`remittanceEmail1` varchar(320),
	`remittanceEmail2` varchar(320),
	`remittanceEmail3` varchar(320),
	`remittanceEmail4` varchar(320),
	`remittanceEmail5` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `owners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shopping_centres` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`suburb` varchar(100),
	`city` varchar(100),
	`state` varchar(50),
	`postcode` varchar(10),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`majors` text,
	`numberOfSpecialties` int,
	`weeklyReportEmail1` varchar(320),
	`weeklyReportEmail2` varchar(320),
	`weeklyReportEmail3` varchar(320),
	`weeklyReportEmail4` varchar(320),
	`weeklyReportEmail5` varchar(320),
	`weeklyReportEmail6` varchar(320),
	`weeklyReportEmail7` varchar(320),
	`weeklyReportEmail8` varchar(320),
	`weeklyReportEmail9` varchar(320),
	`weeklyReportEmail10` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shopping_centres_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`centreId` int NOT NULL,
	`siteNumber` varchar(50) NOT NULL,
	`description` text,
	`size` varchar(100),
	`maxTables` int,
	`powerAvailable` varchar(100),
	`restrictions` text,
	`pricePerDay` decimal(10,2) NOT NULL DEFAULT '150.00',
	`pricePerWeek` decimal(10,2) NOT NULL DEFAULT '750.00',
	`instantBooking` boolean NOT NULL DEFAULT true,
	`imageUrl1` text,
	`imageUrl2` text,
	`imageUrl3` text,
	`imageUrl4` text,
	`videoUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_config_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`ownerId` int NOT NULL,
	`type` enum('booking','cancellation','monthly_fee') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`gstAmount` decimal(12,2) NOT NULL,
	`ownerAmount` decimal(12,2) NOT NULL,
	`platformFee` decimal(12,2) NOT NULL,
	`remitted` boolean NOT NULL DEFAULT false,
	`remittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `usage_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`requiresApproval` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `usage_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('customer','owner_centre_manager','owner_marketing_manager','owner_regional_admin','owner_state_admin','owner_super_admin','mega_state_admin','mega_admin') NOT NULL DEFAULT 'customer';--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_siteId_sites_id_fk` FOREIGN KEY (`siteId`) REFERENCES `sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_usageTypeId_usage_types_id_fk` FOREIGN KEY (`usageTypeId`) REFERENCES `usage_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD CONSTRAINT `customer_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shopping_centres` ADD CONSTRAINT `shopping_centres_ownerId_owners_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sites` ADD CONSTRAINT `sites_centreId_shopping_centres_id_fk` FOREIGN KEY (`centreId`) REFERENCES `shopping_centres`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_bookingId_bookings_id_fk` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_ownerId_owners_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `userId_idx` ON `audit_log` (`userId`);--> statement-breakpoint
CREATE INDEX `createdAt_idx` ON `audit_log` (`createdAt`);--> statement-breakpoint
CREATE INDEX `siteId_idx` ON `bookings` (`siteId`);--> statement-breakpoint
CREATE INDEX `customerId_idx` ON `bookings` (`customerId`);--> statement-breakpoint
CREATE INDEX `startDate_idx` ON `bookings` (`startDate`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `bookings` (`status`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `customer_profiles` (`userId`);--> statement-breakpoint
CREATE INDEX `ownerId_idx` ON `shopping_centres` (`ownerId`);--> statement-breakpoint
CREATE INDEX `name_idx` ON `shopping_centres` (`name`);--> statement-breakpoint
CREATE INDEX `centreId_idx` ON `sites` (`centreId`);--> statement-breakpoint
CREATE INDEX `bookingId_idx` ON `transactions` (`bookingId`);--> statement-breakpoint
CREATE INDEX `ownerId_idx` ON `transactions` (`ownerId`);--> statement-breakpoint
CREATE INDEX `remitted_idx` ON `transactions` (`remitted`);