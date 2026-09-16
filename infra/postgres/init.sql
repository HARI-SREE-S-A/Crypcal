-- CrypCal PostgreSQL Initialization
-- This runs automatically on first container start via Docker's /docker-entrypoint-initdb.d/

-- The database and user are created by POSTGRES_DB/POSTGRES_USER env vars in docker-compose.
-- This script ensures proper encoding and adds any extensions Synapse may need.

-- Ensure proper encoding for Matrix content
ALTER DATABASE synapse SET client_encoding = 'UTF8';

-- Synapse may benefit from these settings for performance
ALTER DATABASE synapse SET default_text_search_config = 'pg_catalog.english';
