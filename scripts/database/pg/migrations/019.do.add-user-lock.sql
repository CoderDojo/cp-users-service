DO $$
    BEGIN
        BEGIN
            ALTER TABLE sys_user ADD COLUMN lock_try integer;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column token already exists in sys_user.';
        END;
    END;
$$
