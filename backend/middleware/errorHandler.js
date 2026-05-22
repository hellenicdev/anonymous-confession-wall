const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: messages.join(', ') });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format.' });
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate entry detected.' });
  }

  res.status(500).json({ error: 'Internal server error.' });
};

module.exports = errorHandler;
