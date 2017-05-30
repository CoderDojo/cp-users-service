DO $$
    BEGIN
        BEGIN
            ALTER TABLE sys_user ADD COLUMN join_requests json[];
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column join_requests already exists in sys_user.';
        END;
    END;
$$
