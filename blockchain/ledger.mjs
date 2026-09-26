import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export function seal(key, source, data) {
  const plaintext = canonical(data);
  if (Buffer.byteLength(plaintext) > 128 * 1024) throw new Error('Source snapshot exceeds 128 KiB');
  const envelope = { format: 'MEDIKET1', id: randomUUID(), source, capturedAt: new Date().toISOString(),
    digest: createHmac('sha256', key).update(source + '\n' + plaintext).digest('hex') };
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(canonical(envelope)));
  return { ...envelope, iv: iv.toString('hex'), ciphertext: Buffer.concat([cipher.update(plaintext), cipher.final()]).toString('hex'), tag: cipher.getAuthTag().toString('hex') };
}
export function unseal(key, envelope) {
  const { iv, ciphertext, tag, ...metadata } = envelope;
  const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  cipher.setAAD(Buffer.from(canonical(metadata)));
  cipher.setAuthTag(Buffer.from(tag, 'hex'));
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(ciphertext, 'hex')), cipher.final()]).toString());
}

export class Ledger {
  constructor({ rpc = 'http://127.0.0.1:7447', directory = '.blockchain', chainId = 1337 } = {}) {
    const url = new URL(rpc);
    if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname) || url.username || url.password) throw new Error('Use a loopback Ganache RPC');
    this.url = url; this.directory = path.resolve(directory); this.chainId = chainId;
    this.queue = []; this.records = []; this.ids = new Set(); this.latest = {}; this.cursor = 0;
  }
  async init() {
    await mkdir(this.directory, { recursive: true });
    const keyFile = path.join(this.directory, 'encryption.key');
    try { this.key = await readFile(keyFile); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      // Never silently replace a missing key for an existing ledger.
      for (const file of ['outbox.json', 'chain.json']) {
        try { await readFile(path.join(this.directory, file)); throw new Error('Restore the original encryption.key before opening this ledger'); }
        catch (e) { if (e.code !== 'ENOENT') throw e; }
      }
      this.key = randomBytes(32); await writeFile(keyFile, this.key, { flag: 'wx', mode: 0o600 });
    }
    if (this.key.length !== 32) throw new Error('Invalid encryption key');
    try { const saved = JSON.parse(await readFile(path.join(this.directory, 'outbox.json'), 'utf8')); this.queue = saved.queue; this.latest = saved.latest; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    for (const item of this.queue) { unseal(this.key, item.envelope); this.latest[item.envelope.source] = item.envelope.digest; }
  }
  async saveQueue() {
    const dest = path.join(this.directory, 'outbox.json');
    await writeFile(dest + '.tmp', JSON.stringify({queue:this.queue,latest:this.latest}), { mode: 0o600 }); await rename(dest + '.tmp', dest);
  }
  async rpc(method, params = []) {
    const response = await fetch(this.url, { method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({jsonrpc:'2.0',id:1,method,params}), signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Ganache RPC unavailable');
    const result = await response.json();
    if (result.error) throw new Error(`Ganache RPC rejected ${method}`);
    return result.result;
  }
  async connect() {
    const [version, chain, genesis, accounts] = await Promise.all([
      this.rpc('web3_clientVersion'), this.rpc('eth_chainId'), this.rpc('eth_getBlockByNumber',['0x0',false]), this.rpc('eth_accounts')]);
    if (!String(version).startsWith('Ganache/') || Number(chain) !== this.chainId || !accounts.length) throw new Error('Expected the configured local Ganache test chain');
    this.account = accounts[0];
    const fingerprint = { genesis: genesis.hash, account: this.account, chainId: this.chainId };
    const file = path.join(this.directory, 'chain.json');
    try { if (canonical(JSON.parse(await readFile(file,'utf8'))) !== canonical(fingerprint)) throw new Error('Chain identity changed. Restore the original chain database.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await writeFile(file,JSON.stringify(fingerprint)); }
    await this.sync();
  }
  async sync() {
    const tip = Number(await this.rpc('eth_blockNumber'));
    if (tip < this.cursor) throw new Error('Chain rewound; restart after restoring the correct chain');
    for (let blockNumber = this.cursor + 1; blockNumber <= tip; blockNumber++) {
      const block = await this.rpc('eth_getBlockByNumber',['0x'+blockNumber.toString(16),true]);
      for (const tx of block.transactions) {
        if (tx.from?.toLowerCase() !== this.account.toLowerCase() || tx.to?.toLowerCase() !== this.account.toLowerCase()) continue;
        let envelope;
        try { envelope = JSON.parse(Buffer.from(tx.input.slice(2),'hex').toString()); } catch { continue; }
        if (envelope.format !== 'MEDIKET1') continue;
        const data = unseal(this.key,envelope);
        const receipt = await this.rpc('eth_getTransactionReceipt',[tx.hash]);
        if (receipt?.status !== '0x1') continue;
        this.ids.add(envelope.id); this.latest[envelope.source] = envelope.digest;
        this.records.push({ id: envelope.id, source: envelope.source, capturedAt: envelope.capturedAt,
          blockNumber, blockHash: block.hash, transactionHash: tx.hash, minedAt: new Date(Number(block.timestamp)*1000).toISOString(),
          gasUsed: Number(receipt.gasUsed), data });
      }
      this.cursor = blockNumber;
    }
    for (const item of this.queue) this.latest[item.envelope.source] = item.envelope.digest;
    return tip;
  }
  async enqueue(source, data) {
    const envelope = seal(this.key, source, data);
    if (this.latest[source] === envelope.digest) return false;
    const previous = this.latest[source];
    this.queue.push({envelope}); this.latest[source] = envelope.digest;
    try { await this.saveQueue(); }
    catch (error) { this.queue.pop(); if (previous === undefined) delete this.latest[source]; else this.latest[source] = previous; throw error; }
    return true;
  }
  async flush() {
    await this.connect();
    while (this.queue.length) {
      const item = this.queue[0];
      if (!this.ids.has(item.envelope.id)) {
        // Persist the nonce before sending. A lost RPC response can safely retry
        // the same nonce; sync finds already-mined records after reconnecting.
        item.nonce ??= await this.rpc('eth_getTransactionCount',[this.account,'pending']);
        await this.saveQueue();
        const tx = {from:this.account,to:this.account,value:'0x0',nonce:item.nonce,
          data:'0x'+Buffer.from(JSON.stringify(item.envelope)).toString('hex')};
        tx.gas = await this.rpc('eth_estimateGas',[tx]);
        const hash = await this.rpc('eth_sendTransaction',[tx]);
        const receipt = await this.rpc('eth_getTransactionReceipt',[hash]);
        if (!receipt || receipt.status !== '0x1') throw new Error('Transaction not confirmed');
        await this.sync();
        if (!this.ids.has(item.envelope.id)) throw new Error('Record not found in confirmed block');
      }
      this.queue.shift(); await this.saveQueue();
    }
  }
  status() {
    return { chainId: this.chainId, rpc: this.url.origin, account: this.account, blockNumber: this.cursor,
      queued: this.queue.length, totalRecords: this.records.length, encrypted: true,
      records: this.records.slice(-50).reverse() };
  }
}
