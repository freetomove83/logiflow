CREATE TABLE `staff_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(80) NOT NULL,
	`invitedByUserId` int NOT NULL,
	`organizationType` enum('agency','shipper') NOT NULL,
	`organizationName` varchar(255) NOT NULL,
	`businessNumber` varchar(20) NOT NULL,
	`contactName` varchar(100) NOT NULL,
	`status` enum('active','claimed','expired') NOT NULL DEFAULT 'active',
	`expiresAt` timestamp NOT NULL,
	`claimedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staff_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_invites_token_unique` UNIQUE(`token`)
);
