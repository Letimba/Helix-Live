import { Keypair, VersionedTransaction } from '@solana/web3.js';
import { RaydiumExecutor } from './raydium.js';

type LiveSide = 'buy' | 'sell';

export interface LiveExecutionResult {
  signature: string;
  confirmed: boolean;
  status: string;
  latency_ms: number;
  amount_sol: number;
  token_amount?: number;
  route: string;
  network_fee_sol?: number;
  estimated_dex_fee_sol?: number;
  quote_price_impact_pct?: number;
}

export interface LiveBalance { sol: number; }

const PUMPPORTAL_LOCAL_URL = 'https://pumpportal.fun/api/trade-local';
const LAMPORTS_PER_SOL = 1_000_000_000;

function jsonRpcError(body: any): string {
  if (body?.error?.message) return String(body.error.message);
  if (body?.error?.data?.err) return JSON.stringify(body.error.data.err);
  return 'Solana RPC error';
}

function decodeBase58(value:string):Uint8Array {
  const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let n=0n;
  for(const c of value){
    const i=alphabet.indexOf(c);
    if(i<0) throw new Error('Invalid Base58 private key');
    n=n*58n+BigInt(i);
  }
  const out:number[]=[];
  while(n>0n){out.unshift(Number(n&255n));n>>=8n;}
  let leading=0;
  while(leading<value.length && value[leading]==='1') leading++;
  return new Uint8Array([...new Array(leading).fill(0),...out]);
}

export class LiveExecutor {
  readonly rpcUrl:string;
  readonly pumpPortalUrl:string;
  readonly raydiumUrl:string;
  readonly routeMode:'auto'|'pumpfun'|'raydium';
  readonly raydium:RaydiumExecutor;
  private signer:Keypair|null=null;
  private publicKey='';
  private keyConfigured=false;

  constructor(rpcUrl:string, pumpPortalUrl=PUMPPORTAL_LOCAL_URL, raydiumUrl='https://transaction-v1.raydium.io', routeMode:'auto'|'pumpfun'|'raydium'='auto') {
    this.rpcUrl=rpcUrl;
    this.pumpPortalUrl=pumpPortalUrl;
    this.raydiumUrl=raydiumUrl;
    this.routeMode=routeMode;
    this.raydium=new RaydiumExecutor(rpcUrl, raydiumUrl);
    this.loadSigner();
  }

  private loadSigner(){
    const raw=process.env.SOLANA_PRIVATE_KEY?.trim();
    if(!raw)return;
    try{
      let bytes:Uint8Array;
      if(raw.startsWith('[')){
        const parsed=JSON.parse(raw);
        if(!Array.isArray(parsed))throw new Error('Private key JSON must be an array');
        bytes=new Uint8Array(parsed.map((x:unknown)=>Number(x)));
      }else{
        bytes=decodeBase58(raw);
      }
      if(bytes.length===64)this.signer=Keypair.fromSecretKey(bytes);
      else if(bytes.length===32)this.signer=Keypair.fromSeed(bytes);
      else throw new Error(`Unsupported private key length: ${bytes.length} bytes`);
      this.publicKey=this.signer.publicKey.toBase58();
      this.keyConfigured=true;
    }catch(err:any){throw new Error(`SOLANA_PRIVATE_KEY invalid: ${err?.message||err}`)}
  }

  isReady(){return this.keyConfigured&&Boolean(this.signer&&this.publicKey)}
  address(){return this.publicKey}

  setPrivateKey(raw: string){
    process.env.SOLANA_PRIVATE_KEY = raw;
    this.signer = null;
    this.publicKey = '';
    this.keyConfigured = false;
    this.loadSigner();
  }

  private async rpc(method:string,params:any[]=[]){
    const started=Date.now();
    const res=await fetch(this.rpcUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:Date.now(),method,params})});
    const body=await res.json() as any;
    if(!res.ok||body.error)throw new Error(jsonRpcError(body));
    return {value:body.result,latency_ms:Date.now()-started};
  }

  async getBalance():Promise<LiveBalance>{const r=await this.rpc('getBalance',[this.publicKey,{commitment:'confirmed'}]);return {sol:Number(r.value?.value||0)/LAMPORTS_PER_SOL}}

  async getTokenBalance(mint:string):Promise<number>{
    const r=await this.rpc('getTokenAccountsByOwner',[this.publicKey,{mint},{encoding:'jsonParsed',commitment:'confirmed'}]);
    const accounts=Array.isArray(r.value?.value)?r.value.value:[];
    return accounts.reduce((sum:number,item:any)=>{const amount=Number(item?.account?.data?.parsed?.info?.tokenAmount?.uiAmount||0);return sum+(Number.isFinite(amount)?amount:0)},0);
  }

  private async buildPumpPortal(action:LiveSide,mint:string,amount:number|string,denominatedInSol:boolean,slippagePct:number,priorityFeeSol:number,pool='auto'){
    const body={publicKey:this.publicKey,action,mint,amount,denominatedInSol:String(denominatedInSol),slippage:slippagePct,priorityFee:priorityFeeSol,pool};
    const res=await fetch(this.pumpPortalUrl,{method:'POST',headers:{'content-type':'application/json',accept:'application/octet-stream'},body:JSON.stringify(body)});
    if(!res.ok){const text=await res.text();throw new Error(`PumpPortal build failed (${res.status}): ${text.slice(0,500)}`)}
    const bytes=new Uint8Array(await res.arrayBuffer());
    if(!bytes.length)throw new Error('PumpPortal returned an empty transaction');
    return bytes;
  }

  private async networkFee(signature:string):Promise<number>{
    try{
      const r=await this.rpc('getTransaction',[signature,{encoding:'jsonParsed',commitment:'confirmed',maxSupportedTransactionVersion:0}]);
      const lamports=Number(r.value?.meta?.fee||0);
      return lamports/LAMPORTS_PER_SOL;
    }catch{return 0}
  }

  private async executePump(params:{side:LiveSide;mint:string;amountSol?:number;amountTokens?:number;slippagePct:number;priorityFeeSol:number;pool?:string;simulate?:boolean}):Promise<LiveExecutionResult>{
    const started=Date.now();
    const beforeTokens=params.side==='buy'?await this.getTokenBalance(params.mint):undefined;
    const unsigned=await this.buildPumpPortal(params.side,params.mint,params.side==='sell'?'100%':Number(params.amountSol||0),params.side==='buy',Math.max(0.1,Math.min(25,params.slippagePct)),Math.max(0,params.priorityFeeSol),params.pool||'auto');
    const tx=VersionedTransaction.deserialize(unsigned); tx.sign([this.signer!]);
    const base64=Buffer.from(tx.serialize()).toString('base64');
    if(params.simulate!==false){const sim=await this.rpc('simulateTransaction',[base64,{encoding:'base64',commitment:'confirmed',sigVerify:true,replaceRecentBlockhash:false}]);if(sim.value?.err){const logs=Array.isArray(sim.value?.logs)?sim.value.logs.slice(-8).join(' | '):'';throw new Error(`LIVE simulation failed: ${JSON.stringify(sim.value.err)}${logs?` · ${logs}`:''}`)}}
    const sent=await this.rpc('sendTransaction',[base64,{encoding:'base64',skipPreflight:true,preflightCommitment:'confirmed',maxRetries:2}]);
    const signature=String(sent.value);
    const confirmation=await this.waitForConfirmation(signature,30000);
    const afterTokens=params.side==='buy'?await this.getTokenBalance(params.mint).catch(()=>undefined):undefined;
    const tokenDelta=params.side==='buy'&&beforeTokens!==undefined&&afterTokens!==undefined?Math.max(0,afterTokens-beforeTokens):undefined;
    return {signature,confirmed:confirmation.confirmed,status:confirmation.status,latency_ms:Date.now()-started,amount_sol:Number(params.amountSol||0),token_amount:tokenDelta,route:'pumpportal-local',network_fee_sol:await this.networkFee(signature)};
  }

  async execute(params:{side:LiveSide;mint:string;amountSol?:number;amountTokens?:number;slippagePct:number;priorityFeeSol:number;priorityFeeMicroLamports?:number;pool?:string;simulate?:boolean;route?:'auto'|'pumpfun'|'raydium'}):Promise<LiveExecutionResult>{
    if(!this.isReady()||!this.signer)throw new Error('LIVE signer not configured. Set SOLANA_PRIVATE_KEY in the local environment.');
    const route=params.route||this.routeMode;
    const common={...params};
    if(route==='raydium'){
      return this.raydium.execute({signer:this.signer,publicKey:this.publicKey,...common,simulate:params.simulate!==false});
    }
    if(route==='auto'){
      try{
        return await this.raydium.execute({signer:this.signer,publicKey:this.publicKey,...common,simulate:params.simulate!==false});
      }catch(err:any){
        if(params.side==='sell' && String(err?.message||'').toLowerCase().includes('no token route')) throw err;
        const fallback=await this.executePump(params);
        fallback.route=`pumpportal-fallback (${String(err?.message||'Raydium unavailable').slice(0,80)})`;
        return fallback;
      }
    }
    return this.executePump(params);
  }

  private async waitForConfirmation(signature:string,timeoutMs:number){
    const deadline=Date.now()+timeoutMs;
    while(Date.now()<deadline){
      const r=await this.rpc('getSignatureStatuses',[[signature],{searchTransactionHistory:true}]);
      const status=r.value?.value?.[0];
      if(status?.err)throw new Error(`LIVE transaction failed on-chain: ${JSON.stringify(status.err)}`);
      if(status?.confirmationStatus==='confirmed'||status?.confirmationStatus==='finalized')return {confirmed:true,status:String(status.confirmationStatus)};
      await new Promise(resolve=>setTimeout(resolve,350));
    }
    throw new Error(`LIVE transaction confirmation timeout: ${signature}`);
  }
}
