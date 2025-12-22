const bcrypt = require('bcryptjs')

async function main() {
  const password = 'password123'
  const hash = await bcrypt.hash(password, 10)
  
  console.log('Generated hash:', hash)
  console.log('Verification test:', await bcrypt.compare(password, hash))
  
  // Écrire le SQL
  const fs = require('fs')
  const sql = `UPDATE "User" SET "passwordHash" = '${hash}' WHERE email = 'owner@example.com';\n`
  fs.writeFileSync('prisma/fix-password.sql', sql)
  console.log('\nSQL file created: prisma/fix-password.sql')
}

main().catch(console.error)

