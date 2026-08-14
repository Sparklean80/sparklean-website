/**
 * HTTP invoke path for leads reconcile (Deploy Preview / ops).
 * Scheduled function `leads-reconcile` is not HTTP-callable on Netlify (platform 403).
 * Auth: timing-safe SPARKLEAN_RECONCILE_KEY via x-sparklean-reconcile-key (required).
 */
import {
  isReconcileHttpAuthorized,
  runLeadsReconcile,
} from "./leads-reconcile.mjs";

export default async (request) => {
  if (!isReconcileHttpAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const result = await runLeadsReconcile();
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
