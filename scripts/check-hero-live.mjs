import https from "node:https";

https
  .get("https://www.sparklean.co/?check=" + Date.now(), (res) => {
    let d = "";
    res.on("data", (c) => (d += c));
    res.on("end", () => {
      const i = d.indexOf('id="home"');
      console.log("--- hero markup ---");
      console.log(d.slice(i, i + 700));
      console.log("hero-photo-full class", d.includes('class="hero-photo-full"'));
      console.log("home-hero-mobile.css", d.includes("home-hero-mobile.css"));
      console.log("bg display none rule", d.includes("#home.hero .hero-bg{display:none"));
      console.log("object-position 70%", d.includes("70% center"));
      console.log("left center", d.includes("left center"));
    });
  })
  .on("error", (e) => console.error(e.message));
