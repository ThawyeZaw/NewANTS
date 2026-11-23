-- Migration 0003: Remove invalid Oct/Nov boundaries for Edexcel IAL Further Mathematics (XFM01 / YFM01)
-- Pearson Edexcel IAL Further Mathematics (and WFM01-03, WME03, WST03, WDM11) are examined in January & May/June only.
DELETE FROM subject_grade_boundaries
WHERE subject_id = 'edexcel-ial-maths'
  AND cash_in_code IN ('XFM01', 'YFM01')
  AND series_id LIKE 'on-%';
