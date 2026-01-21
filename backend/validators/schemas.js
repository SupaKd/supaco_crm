const Joi = require('joi');

// ==========================================
// SCHÉMAS DE VALIDATION
// ==========================================

// Authentification
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Le nom doit contenir au moins 2 caractères',
    'string.max': 'Le nom ne peut pas dépasser 100 caractères',
    'any.required': 'Le nom est requis'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email invalide',
    'any.required': 'L\'email est requis'
  }),
  password: Joi.string().min(6).max(100).required().messages({
    'string.min': 'Le mot de passe doit contenir au moins 6 caractères',
    'string.max': 'Le mot de passe ne peut pas dépasser 100 caractères',
    'any.required': 'Le mot de passe est requis'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email invalide',
    'any.required': 'L\'email est requis'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Le mot de passe est requis'
  })
});

// Projets
const projectSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'string.min': 'Le nom du projet est requis',
    'string.max': 'Le nom ne peut pas dépasser 255 caractères',
    'any.required': 'Le nom du projet est requis'
  }),
  client_name: Joi.string().min(1).max(255).required().messages({
    'any.required': 'Le nom du client est requis'
  }),
  client_email: Joi.string().email().allow('', null).messages({
    'string.email': 'Email client invalide'
  }),
  client_phone: Joi.string().max(50).allow('', null),
  website_url: Joi.string().uri().allow('', null).messages({
    'string.uri': 'URL invalide'
  }),
  description: Joi.string().max(5000).allow('', null),
  budget: Joi.number().positive().allow(null).messages({
    'number.positive': 'Le budget doit être positif'
  }),
  status: Joi.string().valid('devis', 'en_cours', 'termine', 'annule').default('devis'),
  deadline: Joi.date().allow(null)
});

// Prospects
const prospectSchema = Joi.object({
  first_name: Joi.string().min(1).max(100).required().messages({
    'any.required': 'Le prénom est requis'
  }),
  last_name: Joi.string().min(1).max(100).required().messages({
    'any.required': 'Le nom est requis'
  }),
  email: Joi.string().email().allow('', null).messages({
    'string.email': 'Email invalide'
  }),
  phone: Joi.string().max(50).allow('', null),
  company: Joi.string().max(255).allow('', null),
  source: Joi.string().valid('site_web', 'recommandation', 'linkedin', 'salon', 'autre').default('autre'),
  estimated_budget: Joi.number().positive().allow(null),
  needs: Joi.string().max(5000).allow('', null),
  notes: Joi.string().max(5000).allow('', null)
});

const prospectStatusSchema = Joi.object({
  status: Joi.string().valid('nouveau', 'contacte', 'qualification', 'proposition', 'negociation', 'gagne', 'perdu').required()
});

// Factures
const invoiceSchema = Joi.object({
  project_id: Joi.number().integer().positive().required().messages({
    'any.required': 'L\'ID du projet est requis'
  }),
  invoice_number: Joi.string().max(50).allow('', null),
  title: Joi.string().min(1).max(255).required().messages({
    'any.required': 'Le titre est requis'
  }),
  description: Joi.string().max(2000).allow('', null),
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Le montant doit être positif',
    'any.required': 'Le montant est requis'
  }),
  invoice_date: Joi.date().allow(null),
  due_date: Joi.date().allow(null),
  status: Joi.string().valid('en_attente', 'payee', 'annulee').default('en_attente'),
  category: Joi.string().valid('modification', 'maintenance', 'hebergement', 'formation', 'autre').default('autre')
});

// Tâches
const taskSchema = Joi.object({
  project_id: Joi.number().integer().positive().required(),
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(2000).allow('', null),
  status: Joi.string().valid('todo', 'in_progress', 'done').default('todo'),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  due_date: Joi.date().allow(null)
});

// Notes
const noteSchema = Joi.object({
  project_id: Joi.number().integer().positive().required(),
  title: Joi.string().min(1).max(255).required(),
  content: Joi.string().max(10000).allow('', null)
});

// Tags
const tagSchema = Joi.object({
  name: Joi.string().min(1).max(50).required(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required().messages({
    'string.pattern.base': 'Couleur invalide (format: #RRGGBB)'
  })
});

// Interactions prospect
const interactionSchema = Joi.object({
  type: Joi.string().valid('appel', 'email', 'reunion', 'note').default('note'),
  content: Joi.string().min(1).max(5000).required().messages({
    'any.required': 'Le contenu est requis'
  })
});

// ID numérique (pour validation des params)
const idSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

const projectIdSchema = Joi.object({
  projectId: Joi.number().integer().positive().required()
});

// ==========================================
// MIDDLEWARE DE VALIDATION
// ==========================================

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({
        message: 'Données invalides',
        errors
      });
    }

    // Remplacer les données par les valeurs validées/nettoyées
    req[property] = value;
    next();
  };
};

const validateParams = (schema) => validate(schema, 'params');
const validateBody = (schema) => validate(schema, 'body');

module.exports = {
  // Schémas
  registerSchema,
  loginSchema,
  projectSchema,
  prospectSchema,
  prospectStatusSchema,
  invoiceSchema,
  taskSchema,
  noteSchema,
  tagSchema,
  interactionSchema,
  idSchema,
  projectIdSchema,

  // Middleware
  validate,
  validateParams,
  validateBody
};
