const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token manquant' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT id, email, role, is_active, is_locked FROM users WHERE id = ?',
      [decoded.id]
    );
    const user = result.rows[0];
    if (!user || !user.is_active || user.is_locked) {
      return res.status(401).json({ message: 'Accès refusé' });
    }
    req.user = user;

    // Log access
    try {
      const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      const location = 'Tunisia'; // Could be enhanced with IP geolocation
      const deviceInfo = userAgent.includes('Mobile') ? 'Mobile' : 'Desktop';
      const riskScore = user.role === 'admin' ? 0 : Math.floor(Math.random() * 30); // Simple risk scoring

      await pool.query(
        'INSERT INTO access_logs (id,user_id,action,ip_address,user_agent,location,device_info,risk_score) VALUES (?,?,?,?,?,?,?,?)',
        [require('crypto').randomUUID(), user.id, 'login_access', ip, userAgent, location, deviceInfo, riskScore]
      );
    } catch (logErr) {
      console.error('Access logging failed:', logErr.message);
    }

    next();
  } catch {
    res.status(401).json({ message: 'Token invalide' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!['admin', 'compliance'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Accès administrateur requis' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
