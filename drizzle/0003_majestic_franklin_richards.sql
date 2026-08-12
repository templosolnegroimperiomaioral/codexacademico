CREATE TABLE `academicNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subjectId` int,
	`source` enum('gmail','classroom','calendar','system') NOT NULL,
	`externalId` varchar(255),
	`title` varchar(220) NOT NULL,
	`summary` varchar(600),
	`actionUrl` varchar(1500),
	`receivedAt` bigint NOT NULL,
	`readAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `academicNotifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_user_external_unique` UNIQUE(`userId`,`externalId`)
);
--> statement-breakpoint
CREATE TABLE `integrationSyncSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`isEnabled` boolean NOT NULL DEFAULT false,
	`lastRunAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrationSyncSchedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `integrationSyncSchedules_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `integrationConnections` ADD `tokenCipher` text;--> statement-breakpoint
ALTER TABLE `integrationConnections` ADD `refreshTokenCipher` text;--> statement-breakpoint
ALTER TABLE `integrationConnections` ADD `tokenExpiresAt` bigint;--> statement-breakpoint
ALTER TABLE `integrationConnections` ADD `lastError` varchar(500);--> statement-breakpoint
ALTER TABLE `academicNotifications` ADD CONSTRAINT `academicNotifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `academicNotifications` ADD CONSTRAINT `academicNotifications_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `integrationSyncSchedules` ADD CONSTRAINT `integrationSyncSchedules_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `notification_user_received_idx` ON `academicNotifications` (`userId`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `integration_schedule_task_idx` ON `integrationSyncSchedules` (`scheduleCronTaskUid`);