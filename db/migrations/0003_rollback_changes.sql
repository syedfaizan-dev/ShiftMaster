-- Drop notifications table and its indices
DROP TABLE IF EXISTS notifications;

-- Drop task_assignments table and its indices
DROP TABLE IF EXISTS task_assignments;

-- Add back necessary columns to shifts table
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id),
ADD COLUMN IF NOT EXISTS group_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS response_at TIMESTAMP;

-- Add back shift_id to inspector_groups
ALTER TABLE inspector_groups
ADD COLUMN IF NOT EXISTS shift_id INTEGER REFERENCES shifts(id);
