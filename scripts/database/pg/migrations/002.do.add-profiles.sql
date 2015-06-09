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
  email character varying,
  phone character varying,
  parents text[],
  children text[],
  linkedin character varying,
  twitter character varying,
  languages text[],
  programming_languages text[],
  notes character varying,
  projects text[]
)
WITH (
  OIDS=FALSE
);
