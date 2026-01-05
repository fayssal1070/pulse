/**
 * Basic Node.js example using Pulse OpenAI SDK
 * 
 * Usage:
 *   PULSE_BASE_URL=https://pulse-sigma-eight.vercel.app/api/v1 \
 *   PULSE_API_KEY=your_key_here \
 *   npx tsx examples/node-basic.ts
 */

import { PulseOpenAI } from '../src/index'

async function main() {
  const baseURL = process.env.PULSE_BASE_URL || 'https://pulse-sigma-eight.vercel.app/api/v1'
  const apiKey = process.env.PULSE_API_KEY

  if (!apiKey) {
    console.error('PULSE_API_KEY environment variable is required')
    process.exit(1)
  }

  const client = new PulseOpenAI({
    baseURL,
    apiKey,
  })

  console.log('Testing Pulse OpenAI SDK...\n')

  // Test 1: List models
  console.log('1. Listing available models...')
  try {
    const models = await client.openai.models.list()
    console.log(`   ✓ Found ${models.data.length} models`)
    if (models.data.length > 0) {
      console.log(`   First model: ${models.data[0].id}`)
    }
  } catch (error: any) {
    console.error(`   ✗ Error: ${error.message}`)
  }

  // Test 2: Chat completion
  console.log('\n2. Creating chat completion...')
  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Say "Hello from Pulse!" in exactly 3 words.' }],
      max_tokens: 20,
    })

    console.log(`   ✓ Response: ${completion.choices[0].message.content}`)
    console.log(`   Usage: ${completion.usage?.total_tokens} tokens`)
  } catch (error: any) {
    console.error(`   ✗ Error: ${error.message}`)
  }

  // Test 3: Streaming
  console.log('\n3. Testing streaming...')
  try {
    const stream = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Count from 1 to 5, one number per line.' }],
      stream: true,
      max_tokens: 50,
    })

    console.log('   ✓ Streaming response:')
    process.stdout.write('   ')
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        process.stdout.write(content)
      }
    }
    console.log('\n')
  } catch (error: any) {
    console.error(`   ✗ Error: ${error.message}`)
  }

  // Test 4: With attribution
  console.log('\n4. Testing with attribution...')
  try {
    const clientWithAttr = client.withAttribution({
      appId: 'test-app',
      projectId: 'test-project',
    })

    const completion = await clientWithAttr.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Say "attributed" in one word.' }],
      max_tokens: 10,
    })

    console.log(`   ✓ Response: ${completion.choices[0].message.content}`)
    console.log('   (Check Pulse dashboard to see attribution in cost logs)')
  } catch (error: any) {
    console.error(`   ✗ Error: ${error.message}`)
  }

  console.log('\n✓ All tests completed!')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

