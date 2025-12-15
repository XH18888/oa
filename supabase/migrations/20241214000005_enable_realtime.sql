-- Enable Realtime for tasks and comments tables
-- Note: In Supabase, we usually need to add tables to the supabase_realtime publication
-- This SQL command attempts to do that.
BEGIN;
  -- Check if publication exists, if not create it (though supabase_realtime usually exists)
  -- Actually, we can just try to alter it.
  -- To be safe, we'll just run the alter command. If it fails, it might be because the publication doesn't exist or we don't have permissions, 
  -- but usually 'postgres' role (which migrations run as) has permissions.
  
  -- However, standard Supabase migrations might not always support 'alter publication' depending on the setup, 
  -- but it's the standard way to enable realtime via SQL.
  
  ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
  ALTER PUBLICATION supabase_realtime ADD TABLE comments;
COMMIT;
