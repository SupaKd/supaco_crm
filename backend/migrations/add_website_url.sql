-- Ajouter la colonne website_url à la table projects
ALTER TABLE projects ADD COLUMN website_url VARCHAR(500) DEFAULT NULL AFTER client_phone;
