const pool = require('../config/database');

// checkPermission('produtos', 'pode_ver')
const checkPermission = (recurso, campo) => async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM permissoes WHERE usuario_id = $1 AND recurso = $2',
      [req.usuario.id, recurso]
    );
    if (rows.length > 0 && rows[0][campo]) return next();
    return res.status(403).json({ error: 'Sem permissão para esta ação' });
  } catch {
    return res.status(500).json({ error: 'Erro ao verificar permissões' });
  }
};

module.exports = { checkPermission };
