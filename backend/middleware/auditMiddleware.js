const AuditLog = require('../models/AuditLog');

const audit = (action, module) => async (req, res, next) => {
  const originalSend = res.json.bind(res);
  res.json = async (body) => {
    if (res.statusCode < 400) {
      try {
        await AuditLog.create({
          user: req.user?._id,
          userName: req.user?.name,
          action,
          module,
          resourceId: req.params?.id || body?.data?._id,
          details: { method: req.method, path: req.path, body: req.body },
          ipAddress: req.ip,
          status: 'success'
        });
      } catch (e) { /* non-blocking */ }
    }
    return originalSend(body);
  };
  next();
};

module.exports = { audit };
