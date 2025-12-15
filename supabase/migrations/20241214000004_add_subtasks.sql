-- Add subtasks column to tasks table
ALTER TABLE tasks ADD COLUMN subtasks JSONB DEFAULT '[]'::jsonb;
