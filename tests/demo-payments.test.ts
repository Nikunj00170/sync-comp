import {test,expect,vi,afterEach} from 'vitest';
import {readDemoPayments,writeDemoPayments} from '../apps/customer/src/lib/demoPayments';
afterEach(()=>vi.unstubAllGlobals());
test('browser demo receipts remain owner scoped and discard malformed stored entries',()=>{
  const data=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>data.get(key)||null,setItem:(key:string,value:string)=>data.set(key,value)});
  const receipt={reference:'DEMO-PAY-ONE',orderId:'SYNC-one',method:'Card' as const,amount:117882,business:'Office',address:'24 Road',createdAt:new Date().toISOString()};
  writeDemoPayments('owner-one',[receipt]);expect(readDemoPayments('owner-one')).toEqual([receipt]);expect(readDemoPayments('owner-two')).toEqual([]);
  data.set('sync:demo-payments:v1:owner-two',JSON.stringify([{...receipt,amount:-1},{...receipt,method:'real gateway'}]));expect(readDemoPayments('owner-two')).toEqual([]);
});
