import {rehearse} from './rehearse';
import {validateContract} from './validate';
self.onmessage=async (event:MessageEvent)=>{
 try{
  const contract=validateContract(event.data);
  const report=await rehearse(contract);
  self.postMessage({type:'result',report});
 }catch(error){self.postMessage({type:'error',error:error instanceof Error?error.message:'Rehearsal failed'});}
};
