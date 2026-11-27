require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;
const jwt = require('jsonwebtoken');
const { vigente, responderCerrada } = require('../services/sesionesActivas');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return responderCerrada(res);
  }

  jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
    if (err || !vigente(decoded?.sid)) {
      return responderCerrada(res);
    }

    req.user = decoded;

    const now = Math.floor(Date.now() / 1000);
    const timeLeft = decoded.exp - now;

    if (timeLeft < 15 * 60) {
      const newToken = jwt.sign(
        { id: decoded.id, role: decoded.role, sid: decoded.sid },
        JWT_SECRET,
        { expiresIn: '1h', algorithm: 'HS256' }
      );
      res.setHeader('x-new-token', newToken);
    }

    next();
  });
};

module.exports = authenticate;
