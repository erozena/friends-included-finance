import {db,json} from './_lib.mjs';
export default async function(req,res){try{const role=req.query.role||'svetlana';let filter='order=submission_time.desc'; if(role!=='svetlana')filter+=`&submitter_id=eq.${encodeURIComponent(role)}`;const rows=await db(`transactions?${filter}`);json(res,200,{transactions:rows});}catch(e){json(res,500,{error:e.message});}}
