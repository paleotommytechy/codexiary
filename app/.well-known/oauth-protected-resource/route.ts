import { protectedResourceHandlerClerk, metadataCorsOptionsRequestHandler } from "@clerk/mcp-tools/next";

const handler = protectedResourceHandlerClerk({
  scopes_supported: ["openid", "profile", "email"],
});
const preflight = metadataCorsOptionsRequestHandler();
export { handler as GET, preflight as OPTIONS };
