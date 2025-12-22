const fs = require('fs')
const FormData = require('form-data')
const fetch = require('node-fetch')

async function testImport() {
  const csvContent = fs.readFileSync('test-data.csv', 'utf8')
  
  const formData = new FormData()
  formData.append('file', Buffer.from(csvContent), {
    filename: 'test-data.csv',
    contentType: 'text/csv',
  })

  try {
    // Note: Cette requête nécessite une session valide
    // Pour un vrai test, il faudrait se connecter d'abord
    const response = await fetch('http://localhost:3000/api/import', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()
    console.log('Response status:', response.status)
    console.log('Response data:', JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error:', error.message)
  }
}

testImport()

