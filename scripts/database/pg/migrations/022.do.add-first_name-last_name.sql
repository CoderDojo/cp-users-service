DO $$
    BEGIN
        BEGIN
            ALTER TABLE cd_profiles ADD COLUMN first_name character varying, ADD COLUMN last_name character varying;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'columns first_name, last_name already exist in sys_user.';
        END;
    END;
$$
