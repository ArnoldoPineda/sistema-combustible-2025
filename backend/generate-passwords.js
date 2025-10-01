const bcrypt = require('bcrypt');

async function generarHashes() {
  console.log('Generando hashes de contraseñas...\n');
  
  const password1 = 'admin123';
  const password2 = 'user123';
  
  const hash1 = await bcrypt.hash(password1, 10);
  const hash2 = await bcrypt.hash(password2, 10);
  
  console.log('Hash para admin123:');
  console.log(hash1);
  console.log('\nHash para user123:');
  console.log(hash2);
  
  console.log('\n\nSQL para Supabase:');
  console.log('--------------------');
  console.log(`
DELETE FROM usuarios;

INSERT INTO usuarios (username, password, nombre) VALUES
('admin', '${hash1}', 'Administrador'),
('user1', '${hash2}', 'Usuario 1');
  `);
}

generarHashes();