'use client';
import { useDeviceReading } from './use-device-reading';

export function BlockchainRecords() {
  const {data,status,refresh}=useDeviceReading('/api/blockchain');
  return <section className="insight-card blockchain-records" aria-label="Blockchain records">
    <div className="insight-title"><div><span className="eyebrow">GANACHE CLI · LOCAL BLOCKCHAIN</span><h2>Device data in blocks</h2></div><button className="outline-button" onClick={refresh}>Refresh blocks</button></div>
    <p role="status">{status==='loading'?'Connecting to the ledger…':!data?'Blockchain service unavailable.':data.status==='connected'?'Connected · encrypted snapshots are being recorded.':data.error}</p>
    {data && <>
      <div className="blockchain-stats"><span>Chain <b>{data.chainId}</b></span><span>Latest block <b>{data.blockNumber}</b></span><span>Stored records <b>{data.totalRecords}</b></span><span>Queued <b>{data.queued}</b></span></div>
      <p className="insight-note">RPC: {data.rpc} · Last checked: {data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'Waiting'}</p>
      <div className="blockchain-sources">{Object.entries(data.sources || {}).map(([name,source])=><span key={name}>{name}: <b>{source.status}</b></span>)}</div>
      <p className="insight-note">Incoming snapshots are checked every 5 seconds. Changed data creates a transaction; unchanged readings are not duplicated. Blocks contain encrypted data. Records below are decrypted locally.</p>
      {!data.records?.length && <p>No confirmed records yet.</p>}
      <div className="blockchain-history">{data.records?.map(record=><details key={record.id}><summary><b>Block #{record.blockNumber}</b> · {record.source} <span>{new Date(record.capturedAt).toLocaleString()}</span></summary>
        <dl><dt>Transaction hash</dt><dd>{record.transactionHash}</dd><dt>Block hash</dt><dd>{record.blockHash}</dd><dt>Gas used</dt><dd>{record.gasUsed}</dd><dt>Mined</dt><dd>{new Date(record.minedAt).toLocaleString()}</dd></dl>
        <h3>Stored source data</h3><pre>{JSON.stringify(record.data,null,2)}</pre></details>)}</div>
    </>}
    <p className="insight-note">Local development chain using test ETH. Observation time is not measurement time. This ledger does not validate sensor accuracy or provide a diagnosis.</p>
  </section>;
}
