# @pulse/openai

OpenAI-compatible client for Pulse AI Gateway.

## Installation

```bash
npm install @pulse/openai openai
# or
yarn add @pulse/openai openai
# or
pnpm add @pulse/openai openai
```

## Quick Start

```typescript
import { PulseOpenAI } from '@pulse/openai'

const client = new PulseOpenAI({
  baseURL: 'https://pulse-sigma-eight.vercel.app/api/v1',
  apiKey: 'your_pulse_ai_gateway_key',
})

const completion = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
})

console.log(completion.choices[0].message.content)
```

## Base URL

The Pulse API base URL is: **https://pulse-sigma-eight.vercel.app/api/v1**

## API Key

Use your Pulse AI Gateway Key as the `apiKey` parameter. Get your key from the Pulse dashboard at `/developer` or `/admin/ai`.

The API key is sent in the `Authorization: Bearer <key>` header automatically.

## Attribution

Use attribution to track costs by app, project, client, or team:

```typescript
const clientWithAttribution = client.withAttribution({
  appId: 'app_123',
  projectId: 'proj_456',
  clientId: 'client_789',
  teamId: 'team_abc',
})

const completion = await clientWithAttribution.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
})
```

This automatically sets the following headers:
- `x-pulse-app`: Your app ID
- `x-pulse-project`: Your project ID
- `x-pulse-client`: Your client ID
- `x-pulse-team`: Your team ID

## Streaming

Streaming is fully supported:

```typescript
const stream = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true,
})

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '')
}
```

## Embeddings

```typescript
const embeddings = await client.embeddings.create({
  model: 'text-embedding-ada-002',
  input: 'The quick brown fox',
})

console.log(embeddings.data[0].embedding)
```

## Next.js Route Handler Example

```typescript
// app/api/chat/route.ts
import { PulseOpenAI } from '@pulse/openai'
import { NextResponse } from 'next/server'

const client = new PulseOpenAI({
  baseURL: process.env.PULSE_BASE_URL!,
  apiKey: process.env.PULSE_API_KEY!,
})

export async function POST(request: Request) {
  const { messages } = await request.json()

  const completion = await client.chat.completions.create({
    model: 'gpt-4',
    messages,
    stream: false,
  })

  return NextResponse.json(completion)
}
```

## Node.js Script Example

```typescript
// scripts/test-pulse.ts
import { PulseOpenAI } from '@pulse/openai'

async function main() {
  const client = new PulseOpenAI({
    baseURL: process.env.PULSE_BASE_URL!,
    apiKey: process.env.PULSE_API_KEY!,
  })

  const completion = await client.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello from Node.js!' }],
  })

  console.log(completion.choices[0].message.content)
}

main().catch(console.error)
```

## Error Handling

The SDK includes automatic retry with exponential backoff and timeout handling (via the underlying OpenAI SDK):

```typescript
try {
  const completion = await client.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello!' }],
  })
} catch (error) {
  if (error instanceof Error) {
    console.error('Request failed:', error.message)
  }
}
```

## API Reference

### `PulseOpenAI`

Main client class.

#### Constructor

```typescript
new PulseOpenAI(config: PulseClientConfig)
```

- `config.baseURL`: Pulse API base URL (e.g., `https://pulse-sigma-eight.vercel.app/api/v1`)
- `config.apiKey`: Pulse AI Gateway Key
- `config.organization`: Optional organization ID

#### Methods

- `withAttribution(attribution: AttributionOptions)`: Create a client with attribution headers
- `get openai`: Access underlying OpenAI client directly

### `AttributionOptions`

```typescript
interface AttributionOptions {
  appId?: string
  projectId?: string
  clientId?: string
  teamId?: string
}
```

## License

MIT
