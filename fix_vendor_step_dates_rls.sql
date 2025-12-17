-- Check existing RLS policies for vendor_step_dates table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'vendor_step_dates';

-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'vendor_step_dates';

-- Fix: Add RLS policies for vendor_step_dates table

-- Enable RLS if not enabled
ALTER TABLE vendor_step_dates ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT (read)
DROP POLICY IF EXISTS "Allow authenticated users to read vendor step dates" ON vendor_step_dates;
CREATE POLICY "Allow authenticated users to read vendor step dates"
ON vendor_step_dates
FOR SELECT
TO authenticated
USING (true);

-- Policy for INSERT (create)
DROP POLICY IF EXISTS "Allow authenticated users to insert vendor step dates" ON vendor_step_dates;
CREATE POLICY "Allow authenticated users to insert vendor step dates"
ON vendor_step_dates
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy for UPDATE (modify)
DROP POLICY IF EXISTS "Allow authenticated users to update vendor step dates" ON vendor_step_dates;
CREATE POLICY "Allow authenticated users to update vendor step dates"
ON vendor_step_dates
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy for DELETE (remove)
DROP POLICY IF EXISTS "Allow authenticated users to delete vendor step dates" ON vendor_step_dates;
CREATE POLICY "Allow authenticated users to delete vendor step dates"
ON vendor_step_dates
FOR DELETE
TO authenticated
USING (true);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'vendor_step_dates'
ORDER BY cmd;
