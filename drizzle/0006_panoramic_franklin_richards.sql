ALTER TABLE `academicNotifications` ADD `detectedDueAt` bigint;--> statement-breakpoint
ALTER TABLE `studyTasks` ADD `source` enum('manual','gmail','classroom') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `studyTasks` ADD `externalId` varchar(255);