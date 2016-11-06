DO $$
    BEGIN
        CREATE TYPE join_request AS ( id character varying, "dojoId" character varying, "userType" character varying, timestamp timestamp);
        CREATE OR REPLACE VIEW cd_join_requests AS
        (SELECT id,
          "userType" as user_type,
          "dojoId" as dojo_id,
          timestamp  
          FROM json_populate_recordset(null::join_request,
          (SELECT json_agg(jr) FROM
            (SELECT unnest(join_requests) as jr FROM sys_user WHERE join_requests is not null)
          as subq)));
    END;
$$
