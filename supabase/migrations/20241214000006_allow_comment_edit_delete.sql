-- Enable RLS for comments (already enabled in initial schema, but good to be explicit if modifying)
-- ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Allow users to update their own comments
CREATE POLICY "Comments updatable by owner" ON comments
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Comments deletable by owner" ON comments
    FOR DELETE
    USING (auth.uid() = user_id);

-- Allow admins to delete any comment (optional, but good for moderation)
CREATE POLICY "Comments deletable by admin" ON comments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );
