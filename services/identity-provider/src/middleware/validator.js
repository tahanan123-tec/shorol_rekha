const Joi = require('joi');
const logger = require('../utils/logger');

const schemas = {
  login: Joi.object({
    student_id: Joi.string()
      .alphanum()
      .min(5)
      .max(50)
      .required()
      .messages({
        'string.alphanum': 'Student ID must contain only alphanumeric characters',
        'string.min': 'Student ID must be at least 5 characters',
        'string.max': 'Student ID must not exceed 50 characters',
        'any.required': 'Student ID is required',
      }),
    password: Joi.string()
      .min(8)
      .max(100)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.max': 'Password must not exceed 100 characters',
        'any.required': 'Password is required',
      }),
  }),

  register: Joi.object({
    student_id: Joi.string()
      .alphanum()
      .min(5)
      .max(50)
      .required(),
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Invalid email format',
        'any.required': 'Email is required',
      }),
    password: Joi.string()
      .min(8)
      .max(100)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/])[A-Za-z\d@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'string.min': 'Password must be at least 8 characters',
        'any.required': 'Password is required',
      }),
    full_name: Joi.string()
      .min(2)
      .max(255)
      .required()
      .messages({
        'string.min': 'Full name must be at least 2 characters',
        'any.required': 'Full name is required',
      }),
  }),

  refreshToken: Joi.object({
    refresh_token: Joi.string()
      .required()
      .messages({
        'any.required': 'Refresh token is required',
      }),
  }),
};

const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      logger.error('Validation schema not found', { schemaName });
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }

    // Debug logging
    logger.info('Validator received body', { 
      schemaName, 
      body: req.body,
      bodyType: typeof req.body,
      bodyKeys: req.body ? Object.keys(req.body) : 'null'
    });

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Validation failed', { errors, body: req.body });

      return res.status(400).json({
        success: false,
        error: errors[0].message,
        details: errors,
      });
    }

    req.validatedBody = value;
    next();
  };
};

module.exports = { validate };
