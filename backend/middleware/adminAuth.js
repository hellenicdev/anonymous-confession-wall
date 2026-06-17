const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Valid admin API key required.' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized. Invalid admin API key.' });
  }

  next();
};

module.exports = adminAuth;
