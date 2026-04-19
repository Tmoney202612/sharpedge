export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const email = req.query.email;
  if (!email) return res.json({ active: false, plan: null });
  try {
    const r = await fetch('https://api.whop.com/api/v2/memberships?email=' + encodeURIComponent(email), {
      headers: {
        'Authorization': 'Bearer ' + process.env.WHOP_API_KEY
      }
    });
    const d = await r.json();
    if (!d.data || !d.data.length) return res.json({ active: false, plan: null });
    const active = d.data.find(m => m.status === 'active' || m.status === 'trialing');
    if (!active) return res.json({ active: false, plan: null });
    const plan = active.product_id === 'the-sharp-0c' ? 'sharp' : 'edge';
    return res.json({ active: true, plan: plan });
  } catch(e) {
    return res.json({ active: true, plan: 'edge' });
  }
}
