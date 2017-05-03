DO $$
    BEGIN
        BEGIN
            ALTER TABLE sys_user ADD COLUMN failed_login_count integer;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column token already exists in sys_user.';
        END;
    END;
$$
