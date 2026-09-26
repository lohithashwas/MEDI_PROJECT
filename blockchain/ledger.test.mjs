import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import ganache from 'ganache';
import { Ledger, seal, unseal } from './ledger.mjs';

test('Authenticated encryption preserves every field and rejects tampering',()=>{
  const key=randomBytes(32), data={patientId:'synthetic-test',heartRate:72, nested:{sample:[0,1,0]}};
  const envelope=seal(key,'vitals',data);
  assert.deepEqual(unseal(key,envelope),data);
  assert.ok(!JSON.stringify(envelope).includes('synthetic-test'));
  assert.throws(()=>unseal(key,{...envelope,source:'changed'}));
  assert.throws(()=>unseal(randomBytes(32),envelope));
});

test('Actual Ganache blocks: replay, deduplication, durable outbox and lost acknowledgement',async()=>{
  const root=path.resolve('.blockchain'); await mkdir(root,{recursive:true});
  const directory=await mkdtemp(path.join(root,'test-'));
  const createServer=()=>ganache.server({logging:{quiet:true},wallet:{deterministic:true},chain:{chainId:1337},database:{dbPath:path.join(directory,'chain-db')}});
  let server=createServer();
  try {
    await server.listen(0,'127.0.0.1');
    const options={directory,rpc:`http://127.0.0.1:${server.address().port}`};
    let ledger=new Ledger(options); await ledger.init(); await ledger.connect();
    assert.equal(await ledger.enqueue('vitals',{patientId:'synthetic-test',heartRate:72}),true);
    assert.equal(await ledger.enqueue('vitals',{heartRate:72,patientId:'synthetic-test'}),false);
    assert.ok(!(await readFile(path.join(directory,'outbox.json'),'utf8')).includes('synthetic-test'));
    await ledger.flush();
    assert.equal(ledger.records.length,1); assert.equal(ledger.records[0].blockNumber,1);
    assert.equal(ledger.records[0].data.heartRate,72); assert.equal(ledger.queue.length,0);
    const tx=await ledger.rpc('eth_getTransactionByHash',[ledger.records[0].transactionHash]);
    assert.ok(!Buffer.from(tx.input.slice(2),'hex').toString().includes('synthetic-test'));
    ledger=new Ledger(options); await ledger.init(); await ledger.connect();
    assert.equal(ledger.records.length,1);
    assert.equal(await ledger.enqueue('vitals',{heartRate:72,patientId:'synthetic-test'}),false);
    await ledger.enqueue('temperature',98.6);
    ledger=new Ledger(options); await ledger.init(); assert.equal(ledger.queue.length,1);
    const rpc=ledger.rpc.bind(ledger); let dropped=false;
    ledger.rpc=async(method,params)=>{const result=await rpc(method,params);if(method==='eth_sendTransaction'&&!dropped){dropped=true;throw new Error('Lost response');}return result;};
    await assert.rejects(ledger.flush());
    await ledger.flush();
    assert.equal(ledger.records.length,2); assert.equal(ledger.cursor,2); assert.equal(ledger.queue.length,0);
    await ledger.enqueue('vitals',{patientId:'synthetic-test',heartRate:73}); await ledger.flush();
    assert.equal(ledger.records.length,3);
    await server.close();
    server=createServer(); await server.listen(0,'127.0.0.1');
    ledger=new Ledger({...options,rpc:`http://127.0.0.1:${server.address().port}`});
    await ledger.init(); await ledger.connect();
    assert.equal(ledger.records.length,3,'Disk-backed blocks survive Ganache shutdown and restart');
    assert.equal(ledger.records[2].data.heartRate,73);
    assert.throws(()=>new Ledger({rpc:'https://public.example'}));
  } finally {
    await server.close();
    if (path.dirname(directory)!==root || !path.basename(directory).startsWith('test-')) throw new Error('Unexpected cleanup path');
    await rm(directory,{recursive:true,force:true});
  }
});
