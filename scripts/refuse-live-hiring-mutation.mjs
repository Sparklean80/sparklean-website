/**
 * Intentionally does not write to production.
 *
 * A synthetic application against api.sparklean.co is DESTRUCTIVE to live
 * Sparklean OS hiring data. It is disabled by default, blocked in CI, and
 * requires SPARKLEAN_LIVE_HIRING_MUTATION=1 in a local non-CI shell:
 *
 *   SPARKLEAN_LIVE_HIRING_MUTATION=1 npm run test:careers
 */
console.error(
  "DESTRUCTIVE to production hiring data. This npm script never writes.\n" +
    "Export SPARKLEAN_LIVE_HIRING_MUTATION=1 in a local non-CI shell, then run npm run test:careers."
);
process.exit(1);
