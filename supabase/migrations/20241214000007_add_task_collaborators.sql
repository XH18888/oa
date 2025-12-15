-- Create task_collaborators table
CREATE TABLE task_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, user_id)
);

-- Enable RLS
ALTER TABLE task_collaborators ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL PRIVILEGES ON task_collaborators TO authenticated;

-- Policies for task_collaborators
-- Viewable by everyone (to see who is collaborating)
CREATE POLICY "Collaborators viewable by authenticated" ON task_collaborators FOR SELECT USING (auth.role() = 'authenticated');

-- Insertable by task creator or admin or existing assignee
CREATE POLICY "Collaborators manageable by task owner" ON task_collaborators 
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = task_collaborators.task_id 
            AND (
                tasks.creator_id = auth.uid() OR 
                tasks.assignee_id = auth.uid() OR
                EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
            )
        )
    );

-- Update Tasks RLS to allow collaborators to update tasks
-- We need to drop the existing update policy and recreate it including collaborators
DROP POLICY "Tasks updatable by assignee, creator or admin" ON tasks;

CREATE POLICY "Tasks updatable by related users" ON tasks FOR UPDATE USING (
  auth.uid() = assignee_id OR 
  auth.uid() = creator_id OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  ) OR
  EXISTS (
    SELECT 1 FROM task_collaborators
    WHERE task_collaborators.task_id = tasks.id
    AND task_collaborators.user_id = auth.uid()
  )
);
