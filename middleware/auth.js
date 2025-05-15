const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Token ไม่ถูกต้อง' });
      }
      
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ message: 'ไม่มีการยืนยันตัวตน' });
  }
};

module.exports = authenticateJWT;
