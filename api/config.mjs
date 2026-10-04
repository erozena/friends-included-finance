import {json} from './_lib.mjs';
export default function(req,res){json(res,200,{telegram:process.env.PUBLIC_TELEGRAM_BOT_URL||'',sheet:process.env.PUBLIC_SHEET_URL||'',github:process.env.PUBLIC_GITHUB_URL||''});}
