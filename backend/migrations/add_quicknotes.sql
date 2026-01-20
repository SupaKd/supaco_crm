-- Table pour les notes rapides (indépendantes des projets)
CREATE TABLE IF NOT EXISTS quicknotes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  color VARCHAR(20) DEFAULT '#fef3c7',
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour améliorer les performances
CREATE INDEX idx_quicknotes_user ON quicknotes(user_id);
CREATE INDEX idx_quicknotes_pinned ON quicknotes(is_pinned);
