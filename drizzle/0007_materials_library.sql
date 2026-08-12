CREATE TABLE IF NOT EXISTS `studyMaterials` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `subjectId` int NOT NULL,
  `title` varchar(220) NOT NULL,
  `type` enum('link','file') NOT NULL,
  `externalUrl` varchar(2000),
  `storageKey` varchar(600),
  `storageUrl` varchar(800),
  `mimeType` varchar(160),
  `sizeBytes` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `studyMaterials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `material_user_subject_idx` ON `studyMaterials` (`userId`,`subjectId`);
