import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const IDENTITY_PREFIX = "oai-authenticated-user-";

// Self-hosted mode (SELF_HOSTED=1): an authenticating reverse proxy
// (oauth2-proxy with --pass-user-headers) sits in front of this Worker and
// sets X-Forwarded-User / X-Forwarded-Email after a verified sign-in, stripping
// any client-supplied copies. Map those onto the identity headers the app
// already reads, and never trust identity headers sent by the browser.
function selfHostedRequest(request: Request): Request | Response {
  const url = new URL(request.url);
  if (url.pathname === "/signin-with-chatgpt") {
    return redirect(safeReturnTo(url));
  }
  if (url.pathname === "/signout-with-chatgpt") {
    return redirect(`/oauth2/sign_out?rd=${encodeURIComponent(safeReturnTo(url))}`);
  }
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) {
    if (name.toLowerCase().startsWith(IDENTITY_PREFIX)) headers.delete(name);
  }
  const userId = headers.get("x-forwarded-user");
  const email = headers.get("x-forwarded-email");
  if (userId && email) {
    headers.set(`${IDENTITY_PREFIX}id`, userId);
    headers.set(`${IDENTITY_PREFIX}email`, email);
  }
  return new Request(request, { headers });
}

// Relative Location so the browser stays on the public origin behind the proxy.
function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location, "Cache-Control": "no-store" } });
}

function safeReturnTo(url: URL): string {
  const value = url.searchParams.get("return_to") || "/";
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/";
}

const worker = {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    if (env.SELF_HOSTED === "1") {
      const prepared = selfHostedRequest(request);
      if (prepared instanceof Response) return prepared;
      request = prepared;
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

export default worker;
