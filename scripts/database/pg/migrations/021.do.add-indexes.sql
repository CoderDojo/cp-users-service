DO $$
    BEGIN
        BEGIN
            CREATE INDEX users_lower_email ON sys_user(lower(email));
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'index users_lower_email already exists in sys_user.';
        END;
        BEGIN
            CREATE INDEX users_username ON sys_user(username);
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'index users_username already exists in sys_user.';
        END;
    END;
$$
