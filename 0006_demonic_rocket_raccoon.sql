CREATE TABLE `account_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`permissionsJson` text NOT NULL,
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `account_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_permissions_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `document_download_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shipperUserId` int NOT NULL,
	`downloadedByUserId` int NOT NULL,
	`documentRef` varchar(96) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_download_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `staff_invites` ADD `permissionsJson` text NOT NULL;