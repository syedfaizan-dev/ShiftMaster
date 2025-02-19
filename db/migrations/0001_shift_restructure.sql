-- Create new task_assignments table
CREATE TABLE IF NOT EXISTS task_assignments (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER NOT NULL REFERENCES shifts(id),
  role_id INTEGER NOT NULL REFERENCES roles(id),
  inspector_group_id INTEGER NOT NULL REFERENCES inspector_groups(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shift_id, role_id)
);

-- Remove columns from shifts table
ALTER TABLE shifts
DROP COLUMN IF EXISTS role_id,
DROP COLUMN IF EXISTS group_name,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS rejection_reason,
DROP COLUMN IF EXISTS response_at;

-- Remove shift_id from inspector_groups
ALTER TABLE inspector_groups
DROP COLUMN IF EXISTS shift_id;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_task_assignments_shift_id ON task_assignments(shift_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_role_id ON task_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_inspector_group_id ON task_assignments(inspector_group_id);

-- Migrate existing data
INSERT INTO task_assignments (shift_id, role_id, inspector_group_id)
SELECT DISTINCT s.id, s.role_id, ig.id
FROM shifts s
JOIN inspector_groups ig ON ig.shift_id = s.id
WHERE s.role_id IS NOT NULL;
