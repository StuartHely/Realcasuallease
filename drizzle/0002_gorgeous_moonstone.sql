ALTER TABLE `shopping_centres` ADD `includeInMainSite` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `shopping_centres` ADD `mapImageUrl` text;--> statement-breakpoint
ALTER TABLE `sites` ADD `mapMarkerX` int;--> statement-breakpoint
ALTER TABLE `sites` ADD `mapMarkerY` int;