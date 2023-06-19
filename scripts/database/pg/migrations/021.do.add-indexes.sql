DO $$
    BEGIN
        BEGIN
            CREATE INDEX users_lower_email ON sys_user(lower(email));
        EXCEPTION WHEN OTHERS THEN
           RAISE NOTICE 'problem creating index users_lower_email in sys_user.';
        END;
        BEGIN
            CREATE INDEX users_username ON sys_user(username);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'problem creating index users_username in sys_user.';
        END;
    END;
$$
