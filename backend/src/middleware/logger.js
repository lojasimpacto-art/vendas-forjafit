const pool = require('../config/database');

const log = async ({ usuario_id, acao, tabela, registro_id, descricao, dados_antes, dados_depois, ip }) => {
  try {
    await pool.query(
      `INSERT INTO logs_sistema (usuario_id, acao, tabela, registro_id, descricao, dados_antes, dados_depois, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [usuario_id, acao, tabela || null, registro_id || null, descricao || null,
       dados_antes ? JSON.stringify(dados_antes) : null,
       dados_depois ? JSON.stringify(dados_depois) : null,
       ip || null]
    );
  } catch (err) {
    console.error('Erro ao gravar log:', err.message);
  }
};

module.exports = { log };
