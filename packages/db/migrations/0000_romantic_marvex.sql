CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`username` text,
	`role` text DEFAULT 'student' NOT NULL,
	`roles` text DEFAULT '["student"]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `certifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`issuer` text NOT NULL,
	`year` text NOT NULL,
	`credential_code` text,
	`verified` integer DEFAULT false NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `contributor_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`level` text DEFAULT 'contributor' NOT NULL,
	`focus_boards_json` text DEFAULT '[]' NOT NULL,
	`approved_submissions_count` integer DEFAULT 0 NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contributor_profiles_user_id_unique` ON `contributor_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`headline` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`avatar_url` text,
	`institution` text DEFAULT '' NOT NULL,
	`curriculum_label` text DEFAULT 'Edexcel IAL' NOT NULL,
	`timezone` text DEFAULT 'Asia/Yangon' NOT NULL,
	`preferred_app` text DEFAULT 'study' NOT NULL,
	`role` text DEFAULT 'student' NOT NULL,
	`roles` text DEFAULT '["student"]' NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`streak_days` integer DEFAULT 0 NOT NULL,
	`focus_hours_this_month` real DEFAULT 0 NOT NULL,
	`completed_sessions` integer DEFAULT 0 NOT NULL,
	`telegram_status` text DEFAULT 'unlinked' NOT NULL,
	`telegram_chat_id` text,
	`telegram_handle` text DEFAULT '' NOT NULL,
	`telegram_verification_code` text,
	`telegram_code_expires_at` text,
	`telegram_linked_at` text,
	`visibility_json` text DEFAULT '{"showStatsStreak":true,"showPortfolioProjects":true,"showCertifications":true,"showTutorSchedule":true,"showTelegramInquiry":true}' NOT NULL,
	`portfolio_json` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_user_id_unique` ON `profiles` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_username_unique` ON `profiles` (`username`);--> statement-breakpoint
CREATE TABLE `role_upgrade_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`requested_role` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`motivation` text DEFAULT '' NOT NULL,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`reviewed_by_user_id` text,
	`review_note` text,
	`reviewed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `student_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`active_board_id` text DEFAULT 'edexcel-ial' NOT NULL,
	`cohort_year` text,
	`target_university` text,
	`private_study_mode` integer DEFAULT false NOT NULL,
	`weekly_goal_minutes` integer DEFAULT 600 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `student_profiles_user_id_unique` ON `student_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `tutor_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`specialization` text DEFAULT '' NOT NULL,
	`hourly_rate_label` text DEFAULT '' NOT NULL,
	`tutor_telegram_username` text DEFAULT '' NOT NULL,
	`curriculums_json` text DEFAULT '[]' NOT NULL,
	`taught_subjects_json` text DEFAULT '[]' NOT NULL,
	`weekly_schedule_json` text DEFAULT '{}' NOT NULL,
	`featured_on_org` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tutor_profiles_user_id_unique` ON `tutor_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `org_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`category` text NOT NULL,
	`is_upcoming` integer DEFAULT false NOT NULL,
	`title` text NOT NULL,
	`date_label` text NOT NULL,
	`location` text NOT NULL,
	`attendance_label` text DEFAULT '' NOT NULL,
	`facilitators_json` text DEFAULT '[]' NOT NULL,
	`summary` text NOT NULL,
	`recap_paragraphs_json` text DEFAULT '[]' NOT NULL,
	`highlights_json` text DEFAULT '[]' NOT NULL,
	`external_links_json` text DEFAULT '[]' NOT NULL,
	`schedule_phases_json` text DEFAULT '[]' NOT NULL,
	`cover_image_src` text NOT NULL,
	`cover_alt` text DEFAULT '' NOT NULL,
	`gallery_photos_json` text DEFAULT '[]' NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_published` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `org_activities_slug_unique` ON `org_activities` (`slug`);--> statement-breakpoint
CREATE TABLE `org_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text NOT NULL,
	`category` text DEFAULT 'Study Guide' NOT NULL,
	`author_name` text NOT NULL,
	`author_username` text NOT NULL,
	`author_role` text DEFAULT 'Contributor' NOT NULL,
	`published_at_iso` text NOT NULL,
	`reading_time_minutes` integer DEFAULT 5 NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`cover_image_src` text,
	`sections_json` text DEFAULT '[]' NOT NULL,
	`markdown_body` text DEFAULT '' NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`is_published` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `org_articles_slug_unique` ON `org_articles` (`slug`);--> statement-breakpoint
CREATE TABLE `org_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`hero_headline` text NOT NULL,
	`hero_subheadline` text NOT NULL,
	`mission_statement` text NOT NULL,
	`mission_pillars_json` text DEFAULT '[]' NOT NULL,
	`hackathon_banner_json` text DEFAULT 'null',
	`social_links_json` text DEFAULT '{}' NOT NULL,
	`updated_by_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `org_team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`initials` text NOT NULL,
	`role_badge` text NOT NULL,
	`categories_json` text DEFAULT '[]' NOT NULL,
	`is_founder` integer DEFAULT false NOT NULL,
	`is_tutor` integer DEFAULT false NOT NULL,
	`headline` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`institution` text DEFAULT '' NOT NULL,
	`specialization` text DEFAULT '' NOT NULL,
	`curriculums_json` text DEFAULT '[]' NOT NULL,
	`taught_subjects_json` text DEFAULT '[]' NOT NULL,
	`hourly_rate_label` text,
	`timezone_label` text DEFAULT 'MMT (UTC+6:30)' NOT NULL,
	`tutor_telegram_username` text,
	`weekly_schedule_json` text DEFAULT '{}' NOT NULL,
	`achievements_json` text DEFAULT '[]' NOT NULL,
	`joined_label` text DEFAULT '' NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_published` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `org_team_members_username_unique` ON `org_team_members` (`username`);--> statement-breakpoint
CREATE TABLE `curriculums` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`label` text NOT NULL,
	`short_label` text NOT NULL,
	`qualification_level` text NOT NULL,
	`grading_scale` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `curriculums_code_unique` ON `curriculums` (`code`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`curriculum_id` text NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`faculty` text DEFAULT 'Sciences' NOT NULL,
	`subject_type` text DEFAULT 'fixed_linear' NOT NULL,
	`grading_scale` text DEFAULT 'A*-U' NOT NULL,
	`total_ums` integer,
	`total_raw_marks` integer NOT NULL,
	`exam_session_window` text DEFAULT 'May/June & Oct/Nov' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`qualification_data_json` text DEFAULT '{}' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`curriculum_id`) REFERENCES `curriculums`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `topic_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`completed_subtopic_ids_json` text DEFAULT '[]' NOT NULL,
	`personal_note` text DEFAULT '' NOT NULL,
	`xp_awarded` integer DEFAULT false NOT NULL,
	`last_studied_at_iso` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`unit_code` text NOT NULL,
	`unit_label` text NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`difficulty` text DEFAULT 'standard' NOT NULL,
	`estimated_minutes` integer DEFAULT 45 NOT NULL,
	`key_formulas_json` text DEFAULT '[]' NOT NULL,
	`subtopics_json` text DEFAULT '[]' NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_curriculums` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`curriculum_id` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`target_series_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`curriculum_id`) REFERENCES `curriculums`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `exam_countdowns` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subject_id` text,
	`exam_schedule_id` text,
	`board_id` text NOT NULL,
	`paper_code` text NOT NULL,
	`title` text NOT NULL,
	`exam_date_iso` text NOT NULL,
	`exam_time_24h` text DEFAULT '09:00' NOT NULL,
	`target_grade` text DEFAULT 'A*' NOT NULL,
	`category` text DEFAULT 'official' NOT NULL,
	`is_custom` integer DEFAULT false NOT NULL,
	`is_mock` integer DEFAULT false NOT NULL,
	`color_tag` text DEFAULT 'amber' NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`synced_to_flow` integer DEFAULT false NOT NULL,
	`venue_or_notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`exam_schedule_id`) REFERENCES `exam_schedules`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `exam_data_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`entity_table` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`reason` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `exam_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`series_id` text NOT NULL,
	`series_label` text NOT NULL,
	`exam_date_iso` text NOT NULL,
	`exam_time_24h` text DEFAULT '09:00' NOT NULL,
	`session_window` text DEFAULT 'AM' NOT NULL,
	`zone_code` text DEFAULT 'GLOBAL' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`paper_code` text NOT NULL,
	`unit_code` text NOT NULL,
	`title` text NOT NULL,
	`level` text DEFAULT 'AS' NOT NULL,
	`max_raw` integer NOT NULL,
	`max_ums` integer,
	`duration_minutes` integer DEFAULT 90 NOT NULL,
	`is_compulsory` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `grade_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`subject_id` text,
	`board_id` text NOT NULL,
	`subject_code` text NOT NULL,
	`subject_title` text NOT NULL,
	`series_id` text NOT NULL,
	`raw_marks_json` text DEFAULT '{}' NOT NULL,
	`total_raw` integer NOT NULL,
	`max_total_raw` integer NOT NULL,
	`total_ums` integer,
	`max_total_ums` integer,
	`percentage` real NOT NULL,
	`final_grade` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `paper_grade_boundaries` (
	`id` text PRIMARY KEY NOT NULL,
	`past_paper_id` text NOT NULL,
	`series_id` text NOT NULL,
	`max_raw` integer NOT NULL,
	`max_ums` integer,
	`thresholds_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`past_paper_id`) REFERENCES `past_papers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `past_papers` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`unit_code` text NOT NULL,
	`paper_code` text NOT NULL,
	`title` text NOT NULL,
	`variant_group` text DEFAULT 'main' NOT NULL,
	`variant_badge` text DEFAULT 'Main' NOT NULL,
	`max_raw` integer NOT NULL,
	`max_ums` integer,
	`duration_minutes` integer DEFAULT 90 NOT NULL,
	`available_series_json` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `subject_component_routes` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`cash_in_code` text NOT NULL,
	`title` text NOT NULL,
	`rule_type` text NOT NULL,
	`required_units` integer NOT NULL,
	`target_ums` integer,
	`rule_config_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `subject_grade_boundaries` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`series_id` text NOT NULL,
	`series_label` text NOT NULL,
	`cash_in_code` text,
	`is_modular_ums` integer DEFAULT false NOT NULL,
	`max_total_score` integer NOT NULL,
	`thresholds_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_badges` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`badge_code` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`awarded_at_iso` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_cash_in_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`route_id` text,
	`cash_in_code` text NOT NULL,
	`target_grade` text DEFAULT 'A*' NOT NULL,
	`is_valid_combination` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`route_id`) REFERENCES `subject_component_routes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `user_component_selections` (
	`id` text PRIMARY KEY NOT NULL,
	`cash_in_enrollment_id` text NOT NULL,
	`user_id` text NOT NULL,
	`unit_code` text NOT NULL,
	`is_compulsory` integer DEFAULT false NOT NULL,
	`target_ums` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`cash_in_enrollment_id`) REFERENCES `user_cash_in_enrollments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`target_grade` text DEFAULT 'A*' NOT NULL,
	`exam_series_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`last_reviewed_date_iso` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_exam_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subject_id` text,
	`series_id` text NOT NULL,
	`award_code` text NOT NULL,
	`achieved_grade` text NOT NULL,
	`total_ums` integer,
	`max_ums` integer,
	`notes` text,
	`sat_at_iso` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `user_exam_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exam_schedule_id` text NOT NULL,
	`custom_date_iso` text,
	`custom_time_24h` text,
	`target_grade` text,
	`is_hidden` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exam_schedule_id`) REFERENCES `exam_schedules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_past_paper_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`past_paper_id` text,
	`paper_code` text NOT NULL,
	`series_id` text NOT NULL,
	`raw_score` integer NOT NULL,
	`max_raw` integer NOT NULL,
	`percentage` real NOT NULL,
	`derived_grade` text NOT NULL,
	`derived_ums_or_pum` integer NOT NULL,
	`ums_or_pum_label` text DEFAULT 'UMS' NOT NULL,
	`timed` integer DEFAULT true NOT NULL,
	`weak_topics_json` text DEFAULT '[]' NOT NULL,
	`reflection_notes` text DEFAULT '' NOT NULL,
	`attempted_at_iso` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`past_paper_id`) REFERENCES `past_papers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `user_streaks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`current_streak_days` integer DEFAULT 0 NOT NULL,
	`longest_streak_days` integer DEFAULT 0 NOT NULL,
	`last_active_date_iso` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_streaks_user_id_unique` ON `user_streaks` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_xp_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`xp_amount` integer NOT NULL,
	`summary` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_xp_ledger_idempotency_key_unique` ON `user_xp_ledger` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `flashcard_decks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subject_id` text,
	`board_id` text DEFAULT 'edexcel-ial' NOT NULL,
	`subject_code` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `flashcard_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`flashcard_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` text NOT NULL,
	`previous_interval_days` integer NOT NULL,
	`next_interval_days` integer NOT NULL,
	`reviewed_at_iso` text NOT NULL,
	FOREIGN KEY (`flashcard_id`) REFERENCES `flashcards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flashcards` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`front_prompt` text NOT NULL,
	`back_answer` text NOT NULL,
	`hint` text,
	`formula_block` text,
	`ease_factor` real DEFAULT 2.5 NOT NULL,
	`interval_days` integer DEFAULT 0 NOT NULL,
	`repetitions` integer DEFAULT 0 NOT NULL,
	`due_at_iso` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `flashcard_decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`user_id` text NOT NULL,
	`mode` text DEFAULT 'practice' NOT NULL,
	`score` integer NOT NULL,
	`max_score` integer NOT NULL,
	`elapsed_seconds` integer DEFAULT 0 NOT NULL,
	`answers_json` text DEFAULT '{}' NOT NULL,
	`completed_at_iso` text NOT NULL,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quiz_live_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`user_id` text NOT NULL,
	`mode` text DEFAULT 'practice' NOT NULL,
	`current_index` integer DEFAULT 0 NOT NULL,
	`draft_answers_json` text DEFAULT '{}' NOT NULL,
	`started_at_iso` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quiz_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`question_type` text NOT NULL,
	`prompt` text NOT NULL,
	`options_json` text DEFAULT '[]' NOT NULL,
	`correct_answer` text NOT NULL,
	`numeric_tolerance` real,
	`explanation` text DEFAULT '' NOT NULL,
	`marks` integer DEFAULT 1 NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` text PRIMARY KEY NOT NULL,
	`author_user_id` text NOT NULL,
	`subject_id` text,
	`board_id` text DEFAULT 'edexcel-ial' NOT NULL,
	`subject_code` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`time_limit_seconds` integer,
	`is_published` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`author_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `study_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subject_id` text,
	`board_id` text DEFAULT 'edexcel-ial' NOT NULL,
	`subject_code` text NOT NULL,
	`topic_code` text,
	`title` text NOT NULL,
	`markdown_content` text DEFAULT '' NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `pomodoro_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`task_id` text,
	`phase` text DEFAULT 'work' NOT NULL,
	`task_title` text,
	`started_at_iso` text NOT NULL,
	`ended_at_iso` text,
	`duration_seconds` integer NOT NULL,
	`completed` integer DEFAULT true NOT NULL,
	`xp_awarded` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `pomodoro_user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`work_minutes` integer DEFAULT 25 NOT NULL,
	`short_break_minutes` integer DEFAULT 5 NOT NULL,
	`long_break_minutes` integer DEFAULT 15 NOT NULL,
	`long_break_interval` integer DEFAULT 4 NOT NULL,
	`auto_start_breaks` integer DEFAULT false NOT NULL,
	`auto_start_work` integer DEFAULT false NOT NULL,
	`daily_goal` integer DEFAULT 8 NOT NULL,
	`notifications_enabled` integer DEFAULT true NOT NULL,
	`sound_enabled` integer DEFAULT true NOT NULL,
	`sound_volume` real DEFAULT 0.7 NOT NULL,
	`ticking_enabled` integer DEFAULT true NOT NULL,
	`ticking_volume` real DEFAULT 0.35 NOT NULL,
	`ambient_scene` text DEFAULT 'none' NOT NULL,
	`ambient_sound` text DEFAULT 'off' NOT NULL,
	`appearance_mode` text DEFAULT 'light' NOT NULL,
	`appearance_accent` text DEFAULT 'amber' NOT NULL,
	`appearance_font` text DEFAULT 'jakarta' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pomodoro_user_settings_user_id_unique` ON `pomodoro_user_settings` (`user_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`priority` text DEFAULT 'P3' NOT NULL,
	`due_date_iso` text,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`estimated_minutes` integer DEFAULT 25 NOT NULL,
	`pomodoros_planned` integer DEFAULT 1 NOT NULL,
	`pomodoros_done` integer DEFAULT 0 NOT NULL,
	`in_today_focus` integer DEFAULT false NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`subtasks_json` text DEFAULT '[]' NOT NULL,
	`linked_block_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`linked_block_id`) REFERENCES `timetable_events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `timetable_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`date_iso` text NOT NULL,
	`start_minutes` integer NOT NULL,
	`end_minutes` integer NOT NULL,
	`category` text DEFAULT 'deep-work' NOT NULL,
	`priority` text,
	`pomodoros_planned` integer DEFAULT 0 NOT NULL,
	`pomodoros_done` integer DEFAULT 0 NOT NULL,
	`recurrence` text DEFAULT 'none' NOT NULL,
	`telegram_enabled` integer DEFAULT false NOT NULL,
	`telegram_lead_minutes` integer DEFAULT 10 NOT NULL,
	`telegram_note` text,
	`notes` text DEFAULT '' NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `activity_feed` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`app_id` text NOT NULL,
	`event_type` text NOT NULL,
	`summary` text NOT NULL,
	`metric_label` text,
	`xp_delta` integer DEFAULT 0 NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`block_reminders` integer DEFAULT true NOT NULL,
	`default_lead_minutes` integer DEFAULT 10 NOT NULL,
	`daily_morning_digest` integer DEFAULT false NOT NULL,
	`digest_time` text DEFAULT '07:00' NOT NULL,
	`exam_countdown_alerts` integer DEFAULT true NOT NULL,
	`tutor_inquiry_alerts` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_preferences_user_id_unique` ON `notification_preferences` (`user_id`);--> statement-breakpoint
CREATE TABLE `notification_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`channel` text DEFAULT 'telegram' NOT NULL,
	`telegram_chat_id` text,
	`source_type` text NOT NULL,
	`source_id` text,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`scheduled_for_iso` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`sent_at_iso` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`action_url` text,
	`is_read` integer DEFAULT false NOT NULL,
	`read_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `review_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`submitted_by_user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`action` text NOT NULL,
	`title` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by_user_id` text,
	`review_note` text,
	`reviewed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`submitted_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `version_history` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`snapshot_json` text DEFAULT '{}' NOT NULL,
	`changed_by_user_id` text,
	`change_summary` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`changed_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
