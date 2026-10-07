import express from 'express';
const app = express();
const PORT = process.env.PORT || 3000;
const MEXC = 'https://api.mexc.com/api/v3';
const DEX = 'https://api.dexscreener.com/latest/dex/search';

app.use(express.static('public'));

let cache = { at: 0, rows: [] };
const TTL = 7000;

async function json(url){
  const r = await fetch(url, { headers:{'accept':'application/json','user-agent':'spread-scanner/0.1'} });
  if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

async function mexcTickers(){
  const data = await json(`${MEXC}/ticker/24hr`);
  return data.filter(x => x.symbol.endsWith('USDT')).map(x => ({
    symbol:x.symbol.replace('USDT',''), pair:x.symbol, price:+x.lastPrice||0,
    change24:+x.priceChangePercent||0, quoteVolume:+x.quoteVolume||0
  }));
}

async function dexFor(symbol){
  try{
    const data = await json(`${DEX}?q=${encodeURIComponent(symbol)}`);
    const pairs = (data.pairs||[]).filter(p => p.baseToken?.symbol?.toUpperCase()===symbol.toUpperCase() && +p.priceUsd>0);
    pairs.sort((a,b)=>(+(b.liquidity?.usd||0))-(+(a.liquidity?.usd||0)));
    const p = pairs[0];
    if(!p) return null;
    return { dexPrice:+p.priceUsd, liquidity:+(p.liquidity?.usd||0), chain:p.chainId||'', dex:p.dexId||'', url:p.url||'', pair:p.baseToken?.symbol+'/'+p.quoteToken?.symbol };
  }catch{return null}
}

app.get('/api/scan', async (req,res)=>{
  try{
    if(Date.now()-cache.at<TTL) return res.json(cache.rows);
    const all = await mexcTickers();
    // MVP: inspect the most active movers first; avoids hammering the DEX API.
    const candidates = all.filter(x=>x.price>0 && x.quoteVolume>1000).sort((a,b)=>Math.abs(b.change24)-Math.abs(a.change24)).slice(0,80);
    const out=[];
    for(let i=0;i<candidates.length;i+=8){
      const chunk=candidates.slice(i,i+8);
      const ds=await Promise.all(chunk.map(x=>dexFor(x.symbol)));
      chunk.forEach((m,j)=>{
        const d=ds[j]; if(!d) return;
        const spread=(m.price/d.dexPrice-1)*100;
        out.push({...m,...d,spread});
      });
    }
    out.sort((a,b)=>b.spread-a.spread);
    cache={at:Date.now(),rows:out};
    res.json(out);
  }catch(e){res.status(500).json({error:e.message});}
});

app.get('/api/health',(req,res)=>res.json({ok:true,time:new Date().toISOString()}));
app.listen(PORT,()=>console.log(`MEXC DEX scanner on ${PORT}`));
