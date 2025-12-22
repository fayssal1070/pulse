const bcrypt = require('bcryptjs')

async function main() {
  const password = 'password123'
  const hash = await bcrypt.hash(password, 10)
  
  console.log('Generated hash:', hash)
  
  // Vérifier que ça fonctionne
  const isValid = await bcrypt.compare(password, hash)
  console.log('Verification test:', isValid ? '✅ SUCCESS' : '❌ FAILED')
  
  if (!isValid) {
    process.exit(1)
  }
  
  // Écrire le SQL
  const fs = require('fs')
  const sql = `UPDATE "User" SET "passwordHash" = '${hash}' WHERE email = 'owner@example.com';\n`
  fs.writeFileSync('prisma/update-password-final.sql', sql)
  console.log('\n✅ SQL file created: prisma/update-password-final.sql')
  console.log('Hash:', hash)
}

main().catch(console.error)
