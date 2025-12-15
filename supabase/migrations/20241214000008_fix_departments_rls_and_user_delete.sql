-- Enable RLS for departments (if not already)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Everyone can view departments
CREATE POLICY "Departments viewable by all" ON departments
    FOR SELECT
    USING (true);

-- Policy for INSERT/UPDATE/DELETE: Only admins can manage departments
CREATE POLICY "Departments manageable by admin" ON departments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policy for DELETE users: Only admins can delete users
-- Note: This only deletes from public.users. To delete from auth.users requires server-side admin API.
CREATE POLICY "Users deletable by admin" ON users
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users AS admin_user
            WHERE admin_user.id = auth.uid() 
            AND admin_user.role = 'admin'
        )
    );
