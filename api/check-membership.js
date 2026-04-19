export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const email = req.query.email;
  if (!email) return res.json({ active: false, plan: null });
  try {
    const r = await fetch('https://api.whop.com/api/v2/memberships?email=' + encodeURIComponent(email), {
      headers: {
        'Authorization': 'Bearer apik_Og0xBRSA0lyPs_C4830617_C_56c0622c1c81da943ff1d2481a8d7d7adc34350377cd2b7b8cffc22f9b2043'
      }
    });
    const d = await r.json();
    if (!d.data || !d.data.length) return res.json({ active: false, plan: null });
    
    const active = d.data.find(m => m.status === 'active' || m.status === 'trialing');
    if (!active) return res.json({ active: false, plan: null });
    
    // Determine plan based on product ID
    // the-sharp-0c = $99 Pro plan, the-edge-28 = $39 Starter plan
    const plan = active.product_id === 'the-sharp-0c' ? 'sharp' : 'edge';
    return res.json({ active: true, plan: plan });
  } catch(e) {
    return res.json({ active: true, plan: 'edge' });
  }
}
