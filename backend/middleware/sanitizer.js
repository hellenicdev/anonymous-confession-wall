const mongoSanitize = require('express-mongo-sanitize');

const sanitizeInput = (req, res, next) => {
  if (req.body.text) {
    req.body.text = req.body.text.trim();
  }
  next();
};

const sanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized potential NoSQL injection in key: ${key}`);
  }
});

module.exports = { sanitizeInput, sanitizeMiddleware };
