import fs from "fs";
import path from "path";

const dir = "docs/work-notes/2026-08-14-control-room-028854f";
const productSha = "028854f4b6f83ad6385fe3c2628d0e02ec1f3a88";
const previewUrl = "https://conversion-028854f--sparklean-website.netlify.app";

const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith("-sanitized-evidence.json") && !f.startsWith("MERGED"))
  .sort();

const merged = {
  productSha,
  previewUrl,
  mergedAt: new Date().toISOString(),
  phaseFiles: {},
  steps: {},
  matrix: {},
  acceptance: {},
  constraints: {
    noSeo: true,
    noMerge: true,
    noProdDeploy: true,
    noAdsBiddingChange: true,
    noGoogleAdsUiClaimWithoutDiagnostics: true,
    reconcileSecretNotInEvidence: true,
  },
};

for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  merged.phaseFiles[j.phase || f] = f;
  for (const [k, v] of Object.entries(j.steps || {})) {
    if (v != null) merged.steps[k] = v;
  }
  for (const [k, v] of Object.entries(j.matrix || {})) {
    if (v != null) merged.matrix[k] = v;
  }
}

const m = merged.matrix;
merged.acceptance = {
  guidedIntakeDurableBrowserSent:
    m.desktopIntakeUnresolved?.finalDurableTrackingStatus === "BROWSER_SENT" &&
    m.desktopIntakeUnresolved?.delayedNoteCount === 0 &&
    m.mobileIntakeUnresolved?.finalDurableTrackingStatus === "BROWSER_SENT",
  consentDeniedZeroGoogle:
    m.consentDenied?.logicalLeadConversionCount === 0 &&
    m.consentDenied?.googleRequest === "intentionally-blocked-or-denied" &&
    m.consentDenied?.finalDurableTrackingStatus === "OFFLINE_QUEUED" &&
    m.consentDenied?.delayedNoteCount === 0,
  consentGrantedExactlyOneLogical:
    m.consentGranted?.logicalLeadConversionCount === 1 &&
    m.consentGranted?.finalDurableTrackingStatus === "BROWSER_SENT",
  consentUnresolvedMayFire:
    (m.consentUnresolved?.logicalLeadConversionCount || 0) >= 1 &&
    m.consentUnresolved?.finalDurableTrackingStatus === "BROWSER_SENT",
  unauthorizedReconcileDenied: m.reconcile?.unauthorizedDenied === true,
  authorizedReconcileIdempotent:
    m.reconcile?.authorizedOk === true && m.reconcile?.authorizedIdempotent === true,
  forcedBrevoNoFalseSuccess:
    m.brevoFailureApi?.falseSuccess === false &&
    m.brevoFailureApi?.noReportTokenOnFail === true &&
    m.brevoFailureApi?.previewForceCode === true,
  normalBrevoRestoredDelivered: m.brevoRestoreApi?.deliveredSuccess === true,
};
merged.acceptance.allRequired = Object.values(merged.acceptance).every(Boolean);

fs.writeFileSync(path.join(dir, "MERGED-sanitized-evidence.json"), JSON.stringify(merged, null, 2));
console.log(JSON.stringify(merged.acceptance, null, 2));
