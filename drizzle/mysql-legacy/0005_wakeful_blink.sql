CREATE TABLE `document_seal_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shipperUserId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`documentRef` varchar(96) NOT NULL,
	`eventType` enum('applied','finalized') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_seal_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipper_settlement_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bank` varchar(64) NOT NULL,
	`accountHolder` varchar(100) NOT NULL,
	`encryptedAccountNumber` text NOT NULL,
	`accountLast4` varchar(4) NOT NULL,
	`status` enum('submitted','verified') NOT NULL DEFAULT 'submitted',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipper_settlement_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `shipper_settlement_profiles_userId_unique` UNIQUE(`userId`)
);
