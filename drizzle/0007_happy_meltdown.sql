CREATE TABLE `lessonTopics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subjectId` int NOT NULL,
	`classEventId` int,
	`title` varchar(220) NOT NULL,
	`details` text,
	`plannedFor` bigint,
	`source` enum('manual','gmail') NOT NULL DEFAULT 'manual',
	`sourceMessageId` varchar(255),
	`reviewStatus` enum('pending','approved','dismissed') NOT NULL DEFAULT 'approved',
	`reviewedAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lessonTopics_id` PRIMARY KEY(`id`),
	CONSTRAINT `lesson_topic_user_message_unique` UNIQUE(`userId`,`sourceMessageId`)
);
--> statement-breakpoint
ALTER TABLE `academicProfiles` ADD `displayName` varchar(180);--> statement-breakpoint
ALTER TABLE `lessonTopics` ADD CONSTRAINT `lessonTopics_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessonTopics` ADD CONSTRAINT `lessonTopics_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessonTopics` ADD CONSTRAINT `lessonTopics_classEventId_academicEvents_id_fk` FOREIGN KEY (`classEventId`) REFERENCES `academicEvents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `lesson_topic_user_date_idx` ON `lessonTopics` (`userId`,`plannedFor`);--> statement-breakpoint
CREATE INDEX `lesson_topic_subject_idx` ON `lessonTopics` (`subjectId`);