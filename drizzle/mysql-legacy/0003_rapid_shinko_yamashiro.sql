CREATE TABLE `shipper_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(80) NOT NULL,
	`agencyUserId` int NOT NULL,
	`agencyName` varchar(255) NOT NULL,
	`shipperName` varchar(255) NOT NULL,
	`businessNumber` varchar(20) NOT NULL,
	`status` enum('active','claimed','expired') NOT NULL DEFAULT 'active',
	`expiresAt` timestamp NOT NULL,
	`claimedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shipper_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `shipper_invites_token_unique` UNIQUE(`token`)
);
