(function(){
  function osFromUA(ua){
    return /android/i.test(ua||"") && !/windows phone/i.test(ua||"") ? "android" : "iphone";
  }
  function apply(os){
    var root=document.getElementById("install")||document.querySelector('[data-testid="cp-install"]');
    if(!root) return;
    document.documentElement.setAttribute("data-install-os",os);
    root.setAttribute("data-install-os",os);
    var iphone=root.querySelector('[data-testid="install-steps-iphone"]');
    var android=root.querySelector('[data-testid="install-steps-android"]');
    var tabI=root.querySelector('[data-testid="install-os-iphone"]');
    var tabA=root.querySelector('[data-testid="install-os-android"]');
    if(iphone) iphone.hidden=os!=="iphone";
    if(android) android.hidden=os!=="android";
    if(tabI){
      tabI.setAttribute("aria-selected",os==="iphone"?"true":"false");
      tabI.classList.toggle("is-active",os==="iphone");
    }
    if(tabA){
      tabA.setAttribute("aria-selected",os==="android"?"true":"false");
      tabA.classList.toggle("is-active",os==="android");
    }
    var native=root.querySelector('[data-testid="sk-android-install"]');
    if(native) native.hidden=!(os==="android" && window.__sparkleanAndroidPrompt);
  }
  var start=osFromUA(navigator.userAgent||"");
  apply(start);
  var root=document.getElementById("install")||document.querySelector('[data-testid="cp-install"]');
  if(!root) return;
  var tabI=root.querySelector('[data-testid="install-os-iphone"]');
  var tabA=root.querySelector('[data-testid="install-os-android"]');
  if(tabI) tabI.addEventListener("click",function(){ apply("iphone"); });
  if(tabA) tabA.addEventListener("click",function(){ apply("android"); });
  window.addEventListener("beforeinstallprompt",function(e){
    e.preventDefault();
    window.__sparkleanAndroidPrompt=e;
    apply(osFromUA(navigator.userAgent||""));
  });
  var btn=root.querySelector('[data-testid="sk-android-install"]');
  if(btn) btn.addEventListener("click",function(){
    var p=window.__sparkleanAndroidPrompt;
    if(!p || typeof p.prompt!=="function") return;
    Promise.resolve(p.prompt()).then(function(){ window.__sparkleanInstallPrompted=true; });
  });
})();
