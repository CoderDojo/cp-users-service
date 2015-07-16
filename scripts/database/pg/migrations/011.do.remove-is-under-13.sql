DO $$ 
    BEGIN
        ALTER TABLE sys_user DROP COLUMN is_under_13;
    END;
$$