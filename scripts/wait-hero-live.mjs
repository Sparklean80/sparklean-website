import https from "node:https";

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "Cache-Control": "no-cache" } }, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve(d));
      })
      .on("error", reject);
  });
}

for (let i = 1; i <= 20; i++) {
  const body = await get("https://www.sparklean.co/?poll=" + Date.now() + "-" + i);
  const ok =
    body.includes("homepage-hero__media") &&
    body.includes("wipe-1679") &&
    body.includes("1000051679") &&
    body.includes('class="hero homepage-hero"');
  console.log("try", i, "ok", ok);
  if (ok) {
    console.log("LIVE");
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 5000));
}
process.exit(1);
