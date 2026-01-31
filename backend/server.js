const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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
const aiRoutes = require('./routes/ai');

const app = express();

// ==========================================
// LOGGER MIDDLEWARE
// ==========================================
const logger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 500 ? '\x1b[31m' : // Rouge pour 5xx
                        res.statusCode >= 400 ? '\x1b[33m' : // Jaune pour 4xx
                        res.statusCode >= 300 ? '\x1b[36m' : // Cyan pour 3xx
                        '\x1b[32m'; // Vert pour 2xx
    
    console.log(
      `${statusColor}[${timestamp}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms\x1b[0m`
    );
  });
  
  next();
};

console.log('\n🚀 ========================================');
console.log('🚀  DÉMARRAGE DU SERVEUR PROJECT MANAGER');
console.log('🚀 ========================================\n');

// ==========================================
// MIDDLEWARE DE SÉCURITÉ
// ==========================================

console.log('🔒 Configuration de la sécurité...');

// Helmet - En-têtes de sécurité HTTP
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
}));
console.log('   ✅ Helmet activé (protection en-têtes HTTP)');

// CORS - Configuration avec whitelist
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

console.log('   ✅ CORS configuré avec origins autorisées:');
allowedOrigins.forEach(origin => console.log(`      - ${origin}`));

const corsOptions = {
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (apps mobiles, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`   ⚠️  Origin bloquée par CORS: ${origin}`);
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate Limiting - Global (1000 requêtes par 15 minutes par IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: { message: 'Trop de requêtes, veuillez réessayer plus tard' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);
console.log('   ✅ Rate limiting global: 1000 req/15min');

// Rate Limiting - Authentification (5 tentatives par 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes' },
  skipSuccessfulRequests: true,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
console.log('   ✅ Rate limiting auth: 5 tentatives/15min\n');

// Body parser
app.use(express.json({ limit: '10mb' }));
console.log('📦 Body parser configuré (limite: 10mb)\n');

// Logger middleware
app.use(logger);
console.log('📝 Logger de requêtes activé\n');

// ==========================================
// ROUTES
// ==========================================

console.log('🛣️  Chargement des routes...');

const routes = [
  { path: '/api/auth', name: 'Authentification', router: authRoutes },
  { path: '/api/projects', name: 'Projets', router: projectRoutes },
  { path: '/api/tasks', name: 'Tâches', router: taskRoutes },
  { path: '/api/notes', name: 'Notes', router: noteRoutes },
  { path: '/api/tags', name: 'Tags', router: tagRoutes },
  { path: '/api/quicknotes', name: 'Notes rapides', router: quicknoteRoutes },
  { path: '/api/attachments', name: 'Pièces jointes', router: attachmentRoutes },
  { path: '/api/prospects', name: 'Prospects', router: prospectRoutes },
  { path: '/api/invoices', name: 'Factures', router: invoiceRoutes },
  { path: '/api/ai', name: 'IA', router: aiRoutes },
];

routes.forEach(({ path, name, router }) => {
  try {
    app.use(path, router);
    console.log(`   ✅ ${name.padEnd(20)} → ${path}`);
  } catch (error) {
    console.log(`   ❌ ${name.padEnd(20)} → Erreur de chargement`);
    console.error(`      ${error.message}`);
  }
});

console.log('');

// Route de test
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Project Manager fonctionnelle',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Gestion des erreurs 404
app.use((req, res) => {
  console.log(`   ⚠️  Route non trouvée: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Route non trouvée' });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error(`   ❌ Erreur serveur: ${err.message}`);
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==========================================
// DÉMARRAGE DU SERVEUR
// ==========================================

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  console.log('🎉 ========================================');
  console.log(`🎉  SERVEUR DÉMARRÉ AVEC SUCCÈS`);
  console.log('🎉 ========================================');
  console.log(`\n   🌍 URL: http://localhost:${PORT}`);
  console.log(`   📊 Environnement: ${NODE_ENV}`);
  console.log(`   ⏰ Heure de démarrage: ${new Date().toLocaleString('fr-FR')}`);
  console.log('\n   📌 Routes disponibles:');
  console.log(`      → http://localhost:${PORT}/`);
  routes.forEach(({ path }) => {
    console.log(`      → http://localhost:${PORT}${path}`);
  });
  console.log('\n✨ Le serveur est prêt à recevoir des requêtes!\n');
});

// Gestion de l'arrêt gracieux
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM reçu, arrêt gracieux du serveur...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT reçu, arrêt gracieux du serveur...');
  process.exit(0);
});