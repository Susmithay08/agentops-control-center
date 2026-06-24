// Role-based access control. Role is taken from the `x-role` header
// (simulating an authenticated session). A simple capability matrix
// governs which roles may perform which actions.

const CAPABILITIES = {
  admin: ['read', 'write', 'configure'],
  manager: ['read', 'configure'],
  engineer: ['read'],
  viewer: ['read'],
};

export function attachRole(req, res, next) {
  const role = String(req.headers['x-role'] || 'viewer').toLowerCase();
  req.role = CAPABILITIES[role] ? role : 'viewer';
  next();
}

export function requireCapability(capability) {
  return (req, res, next) => {
    const caps = CAPABILITIES[req.role] || [];
    if (!caps.includes(capability)) {
      return res.status(403).json({
        error: 'forbidden',
        message: `Role '${req.role}' lacks capability '${capability}'.`,
        traceId: req.traceId,
      });
    }
    next();
  };
}
