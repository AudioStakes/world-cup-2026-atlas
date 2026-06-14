import { refreshResultsSnapshot } from "./poll";
import { readPublicResultsSnapshot } from "./publicResults";
import type { ExecutionContext, ScheduledController, WorkerEnv } from "./workerTypes";

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return handleRequest(request, env);
  },
  async scheduled(
    controller: ScheduledController,
    env: WorkerEnv,
    context: ExecutionContext,
  ): Promise<void> {
    context.waitUntil(refreshResultsSnapshot({ env, now: new Date(controller.scheduledTime) }));
  },
};

export async function handleRequest(request: Request, env: WorkerEnv): Promise<Response> {
  const url = new URL(request.url);
  const corsHeaders = createCorsHeaders(request, env);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "GET" || url.pathname !== "/api/results") {
    return new Response(JSON.stringify({ code: "not_found", message: "Not found" }), {
      status: 404,
      headers: createJsonHeaders(corsHeaders, "no-store"),
    });
  }

  const snapshot = await readPublicResultsSnapshot(env);

  return new Response(JSON.stringify(snapshot), {
    status: 200,
    headers: createJsonHeaders(corsHeaders, "public, max-age=60, stale-while-revalidate=300"),
  });
}

function createCorsHeaders(request: Request, env: WorkerEnv): Headers {
  const headers = new Headers();
  const origin = request.headers.get("Origin");

  if (!origin) {
    return headers;
  }

  const allowedOrigins = (env.ALLOWED_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((allowedOrigin) => allowedOrigin.trim())
    .filter(Boolean);

  if (!allowedOrigins.includes(origin)) {
    return headers;
  }

  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Accept, Content-Type");
  headers.set("Vary", "Origin");

  return headers;
}

function createJsonHeaders(corsHeaders: Headers, cacheControl: string): Headers {
  const headers = new Headers(corsHeaders);

  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", cacheControl);

  return headers;
}
