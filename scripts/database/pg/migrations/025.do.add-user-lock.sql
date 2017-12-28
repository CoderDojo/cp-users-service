DO $$
    BEGIN
        BEGIN
            ALTER TABLE sys_user ADD COLUMN failed_login_count integer;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column failed_login_count already exists in sys_user.';
        END;
    END;
$$
