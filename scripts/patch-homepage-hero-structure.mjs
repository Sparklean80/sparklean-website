import fs from "node:fs";

let h = fs.readFileSync("index.html", "utf8");

const start = h.indexOf('<style id="homepage-rebuild-2026-08-18-hero-full">');
const end = h.indexOf("</style>", start);
if (start < 0 || end < 0) throw new Error("style block not found");

const next = `<style id="homepage-rebuild-2026-08-18-hero-full">
/* Desktop cinematic uses .homepage-hero__media (see home-hero-mobile.css). */
.homepage-hero__media{overflow:hidden;}
.homepage-hero__media img{display:block;}
.hero-benefit{font-family:var(--serif);font-size:clamp(1.05rem,2.2vw,1.35rem);line-height:1.45;color:var(--white);margin-bottom:14px;opacity:0;animation:up 1s .58s forwards;}
.hero-sub{margin-bottom:14px;}
.home-quote{padding:72px 80px;background:var(--dark2);border-top:1px solid rgba(201,168,76,.1);border-bottom:1px solid rgba(201,168,76,.1);}
.home-quote-inner{max-width:980px;margin:0 auto;}
.home-quote .sec-h{margin-bottom:12px;}
.home-quote-lead{font-family:var(--serif);font-size:.96rem;line-height:1.8;color:var(--w70);max-width:46rem;margin-bottom:28px;}
.home-quote-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;align-items:end;}
.home-quote-field{display:flex;flex-direction:column;gap:8px;}
.home-quote-field label{font-size:.5rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);}
.home-quote-field input,.home-quote-field select{width:100%;background:rgba(14,14,14,.55);border:1px solid rgba(201,168,76,.22);color:var(--white);font-family:var(--sans);font-size:.78rem;padding:14px 14px;outline:none;transition:border-color .2s;}
.home-quote-field input:focus,.home-quote-field select:focus{border-color:rgba(201,168,76,.55);}
.home-quote-field select{appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--gold) 50%),linear-gradient(135deg,var(--gold) 50%,transparent 50%);background-position:calc(100% - 18px) calc(50% - 3px),calc(100% - 12px) calc(50% - 3px);background-size:6px 6px,6px 6px;background-repeat:no-repeat;padding-right:34px;}
.home-quote-field--cta .btn-gold{width:100%;justify-content:center;border:0;cursor:pointer;font-family:var(--sans);}
.home-quote-note{margin-top:14px;font-size:.52rem;letter-spacing:.08em;text-transform:uppercase;color:rgba(249,247,243,.34);line-height:1.6;}
.svc-card .svc-intents{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;position:relative;z-index:1;}
.svc-card .svc-intent{font-size:.46rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:rgba(249,247,243,.55);}
.svc-addons-link{display:inline-flex;margin-top:28px;font-size:.56rem;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--w70);text-decoration:none;border-bottom:1px solid rgba(249,247,243,.2);padding-bottom:2px;transition:color .25s,border-color .25s;}
.svc-addons-link:hover{color:var(--gold-lt);border-color:var(--gold);}
.areas-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:3px;max-width:1100px;margin:0 auto;}
.area{padding:34px 28px 32px;text-align:left;border:1px solid rgba(201,168,76,.1);text-decoration:none;color:inherit;transition:background .3s,border-color .3s;display:flex;flex-direction:column;gap:10px;min-height:100%;}
.area:hover{background:rgba(201,168,76,.05);border-color:rgba(201,168,76,.28);}
.area-name{font-family:var(--serif);font-size:1.35rem;font-weight:400;margin-bottom:0;}
.area-desc{font-family:var(--serif);font-size:.88rem;line-height:1.7;color:var(--w70);flex:1;}
.area-cta{font-size:.5rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin-top:8px;}
.cta-trust{margin-top:22px;font-size:.52rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(249,247,243,.38);}
.svc-icon{display:none;}
#home.hero .hero-tag,#home.hero h1,#home.hero .hero-benefit,#home.hero .hero-sub,#home.hero .hero-guar,#home.hero .hero-btns,#home.hero .hero-stats{opacity:1!important;animation:none!important;transform:none!important;}
.hero-benefit{opacity:1;animation:none;}
#home.hero h1{font-size:clamp(1.95rem,3.5vw,3.05rem);line-height:1.14;max-width:none;}
.svc-grid--five{grid-template-columns:repeat(2,minmax(0,1fr));}
@media(max-width:640px){.svc-grid--five{grid-template-columns:1fr;}}
#home.hero h1 .h1-line{white-space:nowrap;}
#home.hero .hero-sub a{color:var(--gold-lt);text-decoration:underline;text-underline-offset:3px;transition:color .2s;}
#home.hero .hero-sub a:hover{color:var(--white);}
@media(max-width:1024px){
#home.hero h1{font-size:clamp(1.85rem,4.2vw,2.55rem);}
#home.hero h1 .h1-line{white-space:normal;}
#home.hero .hero-benefit{font-size:clamp(.95rem,2.4vw,1.12rem);margin-bottom:12px;}
#home.hero .hero-sub{font-size:.92rem;line-height:1.7;max-width:40em;margin-bottom:12px;}
#home.hero .hero-btns{flex-direction:column;align-items:stretch;}
.home-quote{padding-left:32px;padding-right:32px;}
.home-quote-form{grid-template-columns:1fr 1fr;}
}
@media(max-width:640px){
#home.hero h1{font-size:clamp(1.7rem,7vw,2.15rem);}
#home.hero h1 .h1-line{white-space:normal;}
#home.hero .hs-n{font-size:1.55rem;}
.home-quote{padding:60px 20px;}
.home-quote-form{grid-template-columns:1fr;}
.svc-grid--five{grid-template-columns:1fr;}
}
@media(prefers-reduced-motion:reduce){
.hero-tag,#home h1,.hero-benefit,.hero-sub,.hero-guar,.hero-btns,.hero-stats,.homepage-hero__media img{opacity:1!important;animation:none!important;transform:none!important;}
}
#home.hero .hero-tag,#home.hero h1,#home.hero .hero-benefit,#home.hero .hero-sub,#home.hero .hero-guar,#home.hero .hero-btns,#home.hero .hero-stats{animation-fill-mode:forwards;}
</style>`;

h = h.slice(0, start) + next + h.slice(end + "</style>".length);
h = h.replace(/home-hero-mobile\.css\?v=[^"]+/, "home-hero-mobile.css?v=contain-2048");
fs.writeFileSync("index.html", h);
console.log("ok homepage-hero", h.includes("homepage-hero__media"));
console.log("no hero-photo-full", !h.includes("hero-photo-full"));
console.log("css", (h.match(/home-hero-mobile\.css\?v=[^"]+/) || [])[0]);
