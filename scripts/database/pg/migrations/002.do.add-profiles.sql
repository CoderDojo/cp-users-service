DROP TABLE IF EXISTS cd_profiles;

CREATE TABLE cd_profiles
(
  id character varying,
  user_id character varying,
  alias character varying,
  dob date,
  country character varying,
  address character varying,
  last_editied timestamp,
  email charachter varying,
  phone charachter varying,
  parents text[],
  children text[],
  linkedin charachter varying,
  twitter charachter varying,
  languages text[],
  programming_languages text[],
  notes charachter varying,
  projects text[]
)
WITH (
  OIDS=FALSE
);
