const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('medikit-session',JSON.stringify({role:'patient',name:'Test Patient'})));
let payload={patientId:'patient_002',heartRate:72,spo2:98,steps:0,stressLevel:28,glucose:96,ecg:[0,0.1,0,-0.3,1,-0.4,0,0.2,0],source:'Test device'};
await page.route('**/api/vitals',route=>route.fulfill({json:payload}));
await page.route('**/api/blood-pressure',route=>route.fulfill({json:{bloodPressure:'120/80'}}));
await page.route('**/api/temperature',route=>route.fulfill({json:{temperature:98.6}}));
for(const route of ['/portal','/portal/live-device']){
await page.goto('http://localhost:3002'+route);await page.getByRole('heading',{name:'Calculate your BMI'}).waitFor();
await page.getByLabel('Height cm').fill('170');await page.getByLabel('Weight kg').fill('65');assert.match(await page.locator('.bmi-result').innerText(),/22.5/);
assert.match(await page.locator('.health-insights').innerText(),/28/);assert.match(await page.locator('.health-insights').innerText(),/96/);assert.equal(await page.locator('.ecg-display polyline').count(),1);
await page.getByLabel('Weight kg').fill('-5');assert.match(await page.locator('.bmi-result').innerText(),/Enter a height/);
await page.getByLabel('Weight kg').fill('65');
}
await page.locator('.health-insights').screenshot({path:'health-insights-desktop.png'});
payload={patientId:'patient_002',steps:0};await page.getByRole('button',{name:'Refresh live data',exact:true}).first().click();await page.getByText('Sample ECG', {exact:true}).waitFor();assert.equal(await page.locator('.ecg-display polyline').count(),1);assert.equal(await page.getByRole('img', {name:'Sample ECG waveform, not a patient recording'}).count(),1);
await page.setViewportSize({width:390,height:844});await page.locator('.health-insights').screenshot({path:'health-insights-mobile.png'});console.log(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right})).slice(0,20)));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
assert.deepEqual(errors,[]);console.log('PASS: both dashboards, BMI edits and validation, measured ECG/stress/glucose, missing data, mobile overflow, no runtime errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
