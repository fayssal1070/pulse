/**
 * Test route to verify /api/ai/request exists
 * This is a temporary debug file
 */
export async function GET() {
  return Response.json({ 
    ok: true, 
    message: 'Route exists at /api/ai/request',
    timestamp: new Date().toISOString()
  })
}

