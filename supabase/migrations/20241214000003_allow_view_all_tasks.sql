-- Drop the restrictive policy
DROP POLICY "Tasks viewable by related users" ON tasks;

-- Create a new policy that allows all authenticated users to view all tasks
CREATE POLICY "Tasks viewable by authenticated users" ON tasks
    FOR SELECT
    TO authenticated
    USING (true);
