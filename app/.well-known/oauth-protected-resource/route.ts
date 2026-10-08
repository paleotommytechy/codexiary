export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return Response.json({ error: "OAuth is not configured yet." }, { status: 503 });
  }

  return Response.json({
    resource: new URL("/mcp", origin).toString(),
    authorization_servers: [`${supabaseUrl.replace(/\/$/, "")}/auth/v1`],
    scopes_supported: ["openid", "email"],
    resource_documentation: new URL("/mcp-guide", origin).toString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
