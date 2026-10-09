import { Keypair, VersionedTransaction } from '@solana/web3.js';

const WSOL='So11111111111111111111111111111111111111112';
const LAMPORTS_PER_SOL=1_000_000_000;

type Side='buy'|'sell';

function rpcError(body:any){return body?.error?.message?String(body.error.message):body?.error?.data?.err?JSON.stringify(body.error.data.err):'Solana RPC error'}

export interface RaydiumExecutionResult {
  signature:string;
  confirmed:boolean;
  status:string;
  latency_ms:number;
  amount_sol:number;
  token_amount?:number;
  route:string;
  network_fee_sol?:number;
  estimated_dex_fee_sol?:number;
  quote_price_impact_pct?:number;
}

export class RaydiumExecutor {
  constructor(private readonly rpcUrl:string, private readonly apiUrl='https://transaction-v1.raydium.io'){}

  private async rpc(method:string,params:any[]=[]){
    const res=await fetch(this.rpcUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:Date.now(),method,params})});
    const body=await res.json() as any;
    if(!res.ok||body.error)throw new Error(rpcError(body));
    return body.result;
  }

  private async tokenBalanceRaw(owner:string,mint:string):Promise<{raw:bigint;ui:number;decimals:number;account?:string}>{
    const r=await this.rpc('getTokenAccountsByOwner',[owner,{mint},{encoding:'jsonParsed',commitment:'confirmed'}]);
    let raw=0n, ui=0, decimals=0, account:string|undefined;
    for(const item of (r?.value||[])){
      const ta=item?.account?.data?.parsed?.info?.tokenAmount;
      if(ta?.amount) raw+=BigInt(ta.amount);
      ui+=Number(ta?.uiAmount||0);
      decimals=Number(ta?.decimals||decimals);
      account ||= String(item?.pubkey || '');
    }
    if(raw<=0n)throw new Error('No token route: wallet has no sellable token balance');
    return {raw,ui,decimals,account};
  }

  private async getMintDecimals(mint:string){
    const r=await this.rpc('getTokenSupply',[mint,{commitment:'confirmed'}]);
    return Number(r?.value?.decimals||0);
  }

  private async quote(inputMint:string,outputMint:string,amount:string,slippagePct:number){
    const qs=new URLSearchParams({inputMint,outputMint,amount,slippageBps:String(Math.max(10,Math.round(slippagePct*100))),txVersion:'V0'});
    const res=await fetch(`${this.apiUrl}/compute/swap-base-in?${qs}`,{headers:{accept:'application/json'}});
    const body=await res.json() as any;
    if(!res.ok||body?.success===false)throw new Error(`Raydium quote failed (${res.status}): ${body?.msg||body?.error||'No route found'}`);
    if(!body?.data)throw new Error('Raydium quote failed: missing data');
    if(!Array.isArray(body.data.routePlan)||!body.data.routePlan.length)throw new Error('Raydium quote failed: no route');
    return body;
  }

  async execute(params:{signer:Keypair;publicKey:string;side:Side;mint:string;amountSol?:number;amountTokens?:number;slippagePct:number;priorityFeeSol?:number;priorityFeeMicroLamports?:number;simulate?:boolean}):Promise<RaydiumExecutionResult>{
    const started=Date.now();
    let inputMint:string,outputMint:string,amountRaw:bigint,amountSol=Number(params.amountSol||0),tokenAmount: number|undefined;
    let inputAccount:string|undefined;
    let outputAccount:string|undefined;
    let wrapSol=false,unwrapSol=false;
    if(params.side==='buy'){
      inputMint=WSOL; outputMint=params.mint; amountRaw=BigInt(Math.max(1,Math.floor(amountSol*LAMPORTS_PER_SOL))); wrapSol=true;
    }else{
      inputMint=params.mint; outputMint=WSOL;
      const bal=await this.tokenBalanceRaw(params.publicKey,params.mint);
      inputAccount=bal.account || undefined;
      const requested=params.amountTokens && params.amountTokens>0 ? Math.min(params.amountTokens,bal.ui) : bal.ui;
      if(requested<=0)throw new Error('No token route: sell amount is zero');
      const factor=10**bal.decimals;
      amountRaw=BigInt(Math.max(1,Math.floor(requested*factor))); tokenAmount=requested; unwrapSol=true;
    }

    const quote=await this.quote(inputMint,outputMint,amountRaw.toString(),params.slippagePct);
    const routeData=quote.data;
    const routeFeeSol=routeData.routePlan.reduce((sum:number,p:any)=>{
      if(String(p?.feeMint||'')===WSOL)return sum+Number(p?.feeAmount||0)/LAMPORTS_PER_SOL;
      return sum;
    },0);
    const computeUnitPriceMicroLamports=String(params.priorityFeeMicroLamports||100000);
    const buildRes=await fetch(`${this.apiUrl}/transaction/swap-base-in`,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({computeUnitPriceMicroLamports,swapResponse:quote,txVersion:'V0',wallet:params.publicKey,wrapSol,unwrapSol,inputAccount,outputAccount})});
    const built=await buildRes.json() as any;
    if(!buildRes.ok||built?.success===false||!Array.isArray(built?.data))throw new Error(`Raydium transaction build failed (${buildRes.status}): ${built?.msg||built?.error||'unknown error'}`);
    let lastSig=''; let finalStatus='confirmed';
    for(const entry of built.data){
      const raw=Buffer.from(String(entry.transaction),'base64');
      const tx=VersionedTransaction.deserialize(raw); tx.sign([params.signer]);
      if(params.simulate!==false){
        const sim=await this.rpc('simulateTransaction',[Buffer.from(tx.serialize()).toString('base64'),{encoding:'base64',commitment:'confirmed',sigVerify:true,replaceRecentBlockhash:false}]);
        if(sim?.value?.err)throw new Error(`Raydium simulation failed: ${JSON.stringify(sim.value.err)}`);
      }
      lastSig=String(await this.rpc('sendTransaction',[Buffer.from(tx.serialize()).toString('base64'),{encoding:'base64',skipPreflight:true,maxRetries:2}]));
      const ok=await this.wait(lastSig,30000); finalStatus=ok.status;
    }
    if(!lastSig)throw new Error('Raydium returned no executable transaction');
    const tx=await this.safeTx(lastSig);
    if(params.side==='buy') {
      const decimals=await this.getMintDecimals(params.mint);
      const quotedOut=Number(routeData.outputAmount||0);
      if(quotedOut>0) tokenAmount=quotedOut/(10**decimals);
    }
    return {signature:lastSig,confirmed:true,status:finalStatus,latency_ms:Date.now()-started,amount_sol:amountSol,token_amount:tokenAmount,route:'raydium-trade-api',network_fee_sol:tx.fee_sol,estimated_dex_fee_sol:routeFeeSol,quote_price_impact_pct:Number(routeData.priceImpactPct||0)*100};
  }

  private async safeTx(signature:string){
    try{const r=await this.rpc('getTransaction',[signature,{encoding:'jsonParsed',commitment:'confirmed',maxSupportedTransactionVersion:0}]);return {fee_sol:Number(r?.meta?.fee||0)/LAMPORTS_PER_SOL};}catch{return {fee_sol:0}}
  }

  private async wait(signature:string,timeoutMs:number){
    const deadline=Date.now()+timeoutMs;
    while(Date.now()<deadline){
      const r=await this.rpc('getSignatureStatuses',[[signature],{searchTransactionHistory:true}]);
      const st=r?.value?.[0];
      if(st?.err)throw new Error(`Raydium transaction failed on-chain: ${JSON.stringify(st.err)}`);
      if(st?.confirmationStatus==='confirmed'||st?.confirmationStatus==='finalized')return {status:String(st.confirmationStatus)};
      await new Promise(resolve=>setTimeout(resolve,350));
    }
    throw new Error(`Raydium transaction confirmation timeout: ${signature}`);
  }
}
