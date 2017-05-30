DO $$
    BEGIN
        ALTER TABLE sys_user DROP COLUMN IF EXISTS is_under_13;
    END;
$$
