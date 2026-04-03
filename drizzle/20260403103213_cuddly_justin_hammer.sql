ALTER TABLE "garden_cell_groups" ADD COLUMN "cell_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "garden_cell_groups" ADD COLUMN "desired_yield" integer;--> statement-breakpoint
ALTER TABLE "garden_cell_groups" ADD COLUMN "actual_yield" integer;--> statement-breakpoint
-- Data migration: consolidate individual cells into cell groups
-- Groups of 6: cells 001-072 (12 groups)
-- Groups of 3: cells 073-084 (4 groups)
-- Keeps the first cell per group, re-points notes, deletes the rest.
CREATE TEMP TABLE cell_group_map AS
WITH numbered AS (
  SELECT
    id,
    card_id,
    CAST(SPLIT_PART(card_id, '-', 2) AS integer) AS cell_num
  FROM garden_cell_groups
),
grouped AS (
  SELECT
    id,
    card_id,
    cell_num,
    CASE
      WHEN cell_num BETWEEN 1 AND 72 THEN ((cell_num - 1) / 6) * 6 + 1
      WHEN cell_num BETWEEN 73 AND 84 THEN ((cell_num - 73) / 3) * 3 + 73
      ELSE cell_num
    END AS group_start_num,
    CASE
      WHEN cell_num BETWEEN 1 AND 72 THEN 6
      WHEN cell_num BETWEEN 73 AND 84 THEN 3
      ELSE 1
    END AS group_size
  FROM numbered
)
SELECT
  g.id,
  g.card_id,
  g.cell_num,
  g.group_start_num,
  g.group_size,
  keeper.id AS keeper_id
FROM grouped g
JOIN (
  SELECT DISTINCT ON (group_start_num)
    id, group_start_num
  FROM grouped
  ORDER BY group_start_num, cell_num
) keeper ON keeper.group_start_num = g.group_start_num;--> statement-breakpoint
UPDATE garden_cell_groups
SET cell_count = m.group_size
FROM (
  SELECT DISTINCT keeper_id, group_size
  FROM cell_group_map
) m
WHERE garden_cell_groups.id = m.keeper_id;--> statement-breakpoint
UPDATE notes
SET entity_id = m.keeper_id
FROM cell_group_map m
WHERE notes.entity_type = 'garden_cell_group'
  AND notes.entity_id = m.id
  AND m.id != m.keeper_id;--> statement-breakpoint
DELETE FROM garden_cell_groups
WHERE id IN (
  SELECT id FROM cell_group_map WHERE id != keeper_id
);--> statement-breakpoint
DROP TABLE cell_group_map;