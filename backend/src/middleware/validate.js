'use strict';

const { validationResult } = require('express-validator');

/**
 * Middleware to handle express-validator validation errors
 * Returns a consistent 422 Unprocessable Entity with field-level error messages
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = {};
    errors.array().forEach(err => {
      if (!formattedErrors[err.path]) {
        formattedErrors[err.path] = err.msg;
      }
    });
    return res.status(422).json({
      success: false,
      message: 'Validation failed. Please check the provided data.',
      errors: formattedErrors,
    });
  }
  next();
};

module.exports = { validate };
