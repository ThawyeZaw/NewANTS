-- Migration 0004: Clean student-friendly exam board summary labels (remove UMS/PUM/Linear jargon)
UPDATE curriculums SET summary = 'Grades A*–U' WHERE id IN ('curr-edexcel-ial', 'curr-caie-alevel');
--> statement-breakpoint
UPDATE curriculums SET summary = 'Grades A*–G' WHERE id = 'curr-caie-igcse';
--> statement-breakpoint
UPDATE curriculums SET summary = 'Grades 9–1' WHERE id = 'curr-edexcel-igcse';
