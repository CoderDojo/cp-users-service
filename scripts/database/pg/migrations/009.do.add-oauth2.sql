CREATE TABLE IF NOT EXISTS cd_oauth2
(
  id character varying,
  userid character varying,  
  code character varying,
  token character varying,
  created timestamp with time zone,
  CONSTRAINT pk_cd_oauth2_id PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);

CREATE UNIQUE INDEX cd_oauth2_userid_idx ON cd_oauth2 (userid);
CREATE UNIQUE INDEX cd_oauth2_code_idx ON cd_oauth2 (code);
CREATE UNIQUE INDEX cd_oauth2_token_idx ON cd_oauth2 (token);  

  
