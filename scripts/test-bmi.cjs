const assert=require('node:assert/strict');
(async()=>{const {calculateBmi}=await import('../app/health-metrics.mjs');assert.ok(Math.abs(calculateBmi(170,65)-22.49134948)<0.00001);for(const values of [['',65],[0,65],[170,0],[170,-5],['bad',65],[Infinity,65],[301,65]])assert.equal(calculateBmi(...values),null);console.log('PASS BMI formula and invalid inputs');})();
