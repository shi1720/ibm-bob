import {describe,it,expect} from 'vitest';
import {rehearse,sameRows,hashContract} from '../src/engine/rehearse';
import {contracts} from '../examples/contracts';

describe('executable PostgreSQL rehearsal',()=>{
 it('catches silent post-deploy data loss despite successful forward and rollback SQL',async()=>{
  const r=await rehearse(contracts[0]);expect(r.status).toBe('blocked');
  expect(r.checks.find(c=>c.id==='forward')?.status).toBe('passed');
  expect(r.checks.find(c=>c.id==='rollback')?.status).toBe('passed');
  const loss=r.checks.find(c=>c.id==='preservation');expect(loss?.status).toBe('failed');expect(loss?.before).toHaveLength(4);expect(loss?.after).toHaveLength(3);
 });
 it('keeps new orders after an additive application rollback',async()=>{
  const {summary,...repair}=contracts[0].repair!;const r=await rehearse({...contracts[0],...repair});
  expect(r.status).toBe('passed');expect(r.checks).toHaveLength(10);expect(r.checks.every(c=>c.status==='passed')).toBe(true);
 });
 it('detects both old reader and writer breakage independently',async()=>{
  const r=await rehearse(contracts[1]);expect(r.checks.find(c=>c.id==='old-reader')?.status).toBe('failed');expect(r.checks.find(c=>c.id==='old-writer')?.status).toBe('failed');expect(r.checks.find(c=>c.id==='forward')?.status).toBe('passed');
 });
 it('passes the expanded alias repair',async()=>{const {summary,...repair}=contracts[1].repair!;expect((await rehearse({...contracts[1],...repair})).status).toBe('passed')});
 it('fails closed and skips dependent checks for invalid SQL',async()=>{
  const r=await rehearse({...contracts[2],upSql:'THIS IS NOT SQL'});expect(r.status).toBe('blocked');expect(r.checks.find(c=>c.id==='preservation')?.status).toBe('skipped');
 });
 it('rejects invisible post-deploy writes rather than claiming protection',async()=>{
  const r=await rehearse({...contracts[2],newWriteSql:'SELECT 1;'});expect(r.status).toBe('blocked');expect(r.checks.find(c=>c.id==='post-deploy')?.error).toMatch(/do not change/);
 });
 it('detects value corruption even when row count is preserved',async()=>{
  const r=await rehearse({...contracts[2],downSql:'UPDATE orders SET total_cents = 0;'});const c=r.checks.find(c=>c.id==='preservation');expect(c?.status).toBe('failed');expect(c?.before?.length).toBe(c?.after?.length);
 });
 it('compares unordered multisets without losing duplicates',()=>{expect(sameRows([{a:1,b:2},{a:3}],[{a:3},{b:2,a:1}])).toBe(true);expect(sameRows([{a:1},{a:1}],[{a:1}])).toBe(false)});
 it('binds evidence to all contract content',async()=>{const hash=await hashContract(contracts[0]);expect(hash).toHaveLength(64);expect(hash).not.toBe(await hashContract({...contracts[0],downSql:'SELECT 1;'}))});
});
