CREATE TABLE `academicEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subjectId` int,
	`type` enum('class','exam','assignment','presentation','appointment','other') NOT NULL DEFAULT 'other',
	`title` varchar(220) NOT NULL,
	`details` text,
	`location` varchar(180),
	`startsAt` bigint NOT NULL,
	`endsAt` bigint,
	`source` enum('manual','gmail','classroom','calendar') NOT NULL DEFAULT 'manual',
	`externalId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academicEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `academicProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`institution` varchar(180),
	`course` varchar(180),
	`timezone` varchar(64) NOT NULL DEFAULT 'America/Sao_Paulo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academicProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `academicProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `integrationConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('gmail','google_classroom','google_calendar') NOT NULL,
	`accountEmail` varchar(320),
	`status` enum('disconnected','pending','connected','error') NOT NULL DEFAULT 'disconnected',
	`scopes` text,
	`lastSyncedAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrationConnections_id` PRIMARY KEY(`id`),
	CONSTRAINT `integration_provider_user_unique` UNIQUE(`userId`,`provider`)
);
--> statement-breakpoint
CREATE TABLE `semesters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`startsAt` bigint,
	`endsAt` bigint,
	`isCurrent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `semesters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studyTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subjectId` int,
	`title` varchar(220) NOT NULL,
	`notes` text,
	`dueAt` bigint,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studyTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`semesterId` int,
	`name` varchar(180) NOT NULL,
	`professor` varchar(180),
	`color` varchar(20) NOT NULL DEFAULT '#C9A66B',
	`room` varchar(100),
	`scheduleNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `academicEvents` ADD CONSTRAINT `academicEvents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `academicEvents` ADD CONSTRAINT `academicEvents_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `academicProfiles` ADD CONSTRAINT `academicProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `integrationConnections` ADD CONSTRAINT `integrationConnections_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `semesters` ADD CONSTRAINT `semesters_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studyTasks` ADD CONSTRAINT `studyTasks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studyTasks` ADD CONSTRAINT `studyTasks_subjectId_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_semesterId_semesters_id_fk` FOREIGN KEY (`semesterId`) REFERENCES `semesters`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `event_user_time_idx` ON `academicEvents` (`userId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `event_subject_idx` ON `academicEvents` (`subjectId`);--> statement-breakpoint
CREATE INDEX `semester_user_idx` ON `semesters` (`userId`);--> statement-breakpoint
CREATE INDEX `task_user_due_idx` ON `studyTasks` (`userId`,`dueAt`);--> statement-breakpoint
CREATE INDEX `task_subject_idx` ON `studyTasks` (`subjectId`);--> statement-breakpoint
CREATE INDEX `subject_user_idx` ON `subjects` (`userId`);--> statement-breakpoint
CREATE INDEX `subject_semester_idx` ON `subjects` (`semesterId`);