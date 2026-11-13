// Teaser pictures for the website's "coming soon: master key systems" section — from the approved mock, sample building.
const puppeteer=require('puppeteer'),path=require('path');const F='file:///D:/Work/Code/tk-phase3/bittings-unified/mock/master-key-calculator.html',OUT='D:/Work/Code/tk-phase3/bittings-unified/site/assets';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({headless:'new'});const pg=await b.newPage();
await pg.setViewport({width:390,height:720,deviceScaleFactor:3,isMobile:true,hasTouch:true});await pg.goto(F,{waitUntil:'networkidle0'});await sleep(500);
await pg.addStyleTag({content:'.mock,.bar,#doorPick{display:none!important}'});
await pg.evaluate(()=>{document.querySelector('.top .sub').textContent='Key system · Building A · sample data';});
await pg.select('#brand','a2');await sleep(300);
const tab=async t=>{await pg.evaluate(t=>document.querySelector('.tabs [data-tab="'+t+'"]').click(),t);await sleep(300);await pg.evaluate(()=>window.scrollTo(0,0));};
await tab('chart');await pg.screenshot({path:path.join(OUT,'soon-pin-chart.webp'),type:'webp',quality:88});
await tab('keys');await pg.screenshot({path:path.join(OUT,'soon-keys.webp'),type:'webp',quality:88});
await tab('lost');await pg.screenshot({path:path.join(OUT,'soon-lost-key.webp'),type:'webp',quality:88});
await b.close();console.log('ok');})();
