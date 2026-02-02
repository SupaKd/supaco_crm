-- Table pour le suivi du temps
CREATE TABLE IF NOT EXISTS time_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME NULL,
  duration INT NULL COMMENT 'Durée en secondes',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_task_id (task_id),
  INDEX idx_user_id (user_id),
  INDEX idx_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ajouter le champ estimated_hours aux tâches
ALTER TABLE tasks
ADD COLUMN estimated_hours DECIMAL(5,2) NULL COMMENT 'Estimation en heures' AFTER priority;

-- Table pour stocker le taux horaire par projet (optionnel)
CREATE TABLE IF NOT EXISTS project_hourly_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL COMMENT 'Taux horaire en euros',
  effective_from DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
