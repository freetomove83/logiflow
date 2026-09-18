CREATE TABLE `credential_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationType` enum('agency','shipper') NOT NULL,
	`accountRole` enum('owner','member') NOT NULL DEFAULT 'owner',
	`businessNumber` varchar(20) NOT NULL,
	`organizationName` varchar(255) NOT NULL,
	`contactName` varchar(100) NOT NULL,
	`loginId` varchar(48) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credential_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `credential_accounts_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `credential_accounts_loginId_unique` UNIQUE(`loginId`)
);
