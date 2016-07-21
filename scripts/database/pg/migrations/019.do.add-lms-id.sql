DO $$
    BEGIN
        BEGIN
            ALTER TABLE sys_user ADD COLUMN lms_id character varying;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column lms_id already exists in sys_user.';
        END;
    END;
$$
