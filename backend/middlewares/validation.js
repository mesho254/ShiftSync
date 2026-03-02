import Joi from 'joi';

export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    next();
  };
};

// Common validation schemas
export const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  register: Joi.object({
    name: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'manager', 'staff').default('staff')
  }),
  
  createShift: Joi.object({
    locationId: Joi.string().required(),
    startUtc: Joi.date().iso().required(),
    endUtc: Joi.date().iso().greater(Joi.ref('startUtc')).required(),
    requiredSkill: Joi.string().required(),
    headcount: Joi.number().integer().min(1).default(1)
  }),
  
  assignShift: Joi.object({
    userId: Joi.string().required()
  }),
  
  createSwap: Joi.object({
    type: Joi.string().valid('swap', 'drop', 'pickup').required(),
    shiftId: Joi.string().required(),
    targetStaffId: Joi.string().when('type', {
      is: 'swap',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    notes: Joi.string().optional()
  })
};
