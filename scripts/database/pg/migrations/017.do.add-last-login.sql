DO $$
    BEGIN
        BEGIN
            ALTER TABLE sys_user ADD COLUMN last_login timestamp with time zone;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column last_login already exists in sys_user.';
        END;
    END;
$$
