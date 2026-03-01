const Joi = require('joi');
const logger = require('../utils/logger');

const schemas = {
  createOrder: Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().required(),
          quantity: Joi.number().integer().min(1).max(100).required(),
        })
      )
      .min(1)
      .max(50)
      .required()
      .messages({
        'array.min': 'At least one item is required',
        'array.max': 'Maximum 50 items allowed per order',
      }),
    delivery_time: Joi.string()
      .pattern(/^(\d{4}-\d{2}-\d{2}T)?([01]\d|2[0-3]):([0-5]\d)$/)
      .optional()
      .messages({
        'string.pattern.base': 'Delivery time must be in HH:MM or YYYY-MM-DDTHH:MM format',
      }),
    notes: Joi.string().max(500).optional(),
    payment_method: Joi.string().valid('cash', 'bkash', 'bank').optional(),
    transaction_id: Joi.string().optional(),
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
        error: 'Validation failed',
        details: errors,
      });
    }

    req.validatedBody = value;
    next();
  };
};

module.exports = { validate };
