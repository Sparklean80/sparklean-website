import https from "node:https";

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "Cache-Control": "no-cache", "User-Agent": "Mozilla/5.0" } }, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
      })
      .on("error", reject);
  });
}

const url = "https://www.sparklean.co/?hero=stack-" + Date.now();
const { status, body } = await get(url);
console.log("status", status);
console.log("hero-photo-full", body.includes("hero-photo-full"));
console.log("home-hero-mobile.css", body.includes("home-hero-mobile.css"));
console.log("display:none hero-bg mobile", body.includes("#home.hero .hero-bg{display:none"));
