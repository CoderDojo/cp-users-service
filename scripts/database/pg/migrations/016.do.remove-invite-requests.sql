DO $$ 
    BEGIN
		ALTER TABLE cd_profiles DROP IF EXISTS invite_requests;
	END;
$$