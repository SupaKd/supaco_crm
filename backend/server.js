const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const noteRoutes = require('./routes/notes');
const tagRoutes = require('./routes/tags');
const quicknoteRoutes = require('./routes/quicknotes');
const attachmentRoutes = require('./routes/attachments');
const prospectRoutes = require('./routes/prospects');
const invoiceRoutes = require('./routes/invoices');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/quicknotes', quicknoteRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/prospects', prospectRoutes);
app.use('/api/invoices', invoiceRoutes);

// Route de test
app.get('/', (req, res) => {
  res.json({ message: 'API Project Manager fonctionnelle' });
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});