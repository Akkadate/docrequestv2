const isAdmin = (req, res, next) => {
  console.log('Checking admin role:', req.user); // ดูข้อมูล user ที่ถูกส่งมาใน token
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    console.log('Admin access denied, user role:', req.user ? req.user.role : 'no user found');
    res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
  }
};

module.exports = isAdmin;
