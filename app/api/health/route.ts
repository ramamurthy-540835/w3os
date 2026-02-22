export async function GET(request: Request) {
  return Response.json(
    { status: 'healthy', timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
