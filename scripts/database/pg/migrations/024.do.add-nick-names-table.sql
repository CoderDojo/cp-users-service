CREATE TABLE IF NOT EXISTS cd_first_name_counter
(
  id character varying NOT NULL,
  first_name character varying UNIQUE NOT NULL,
  user_count int NOT NULL,
  CONSTRAINT pk_cd_nick_names_id PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);
