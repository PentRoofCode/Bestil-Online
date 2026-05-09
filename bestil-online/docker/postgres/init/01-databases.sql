-- Runs once on first container start (when the data volume is empty).
-- Creates the test database used by the integration test suite.

CREATE DATABASE bestil_test OWNER bestil;
GRANT ALL PRIVILEGES ON DATABASE bestil_test TO bestil;
