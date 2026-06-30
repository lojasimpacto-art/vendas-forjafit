// Gera o hash bcrypt para a senha Admin@123
// Executar: node database/seed.js
// Copiar o hash gerado e substituir no schema.sql

const bcrypt = require('bcrypt');

async function main() {
  const hash = await bcrypt.hash('Admin@123', 10);
  console.log('\nHash para Admin@123:');
  console.log(hash);
  console.log('\nSQL para atualizar o admin:');
  console.log(`UPDATE usuarios SET senha_hash = '${hash}' WHERE login = 'admin';`);
}

main();
