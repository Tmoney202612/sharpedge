export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const email = req.query.email;
  if (!email) return res.json({ active: false });
  try {
    const r = await fetch('https://api.whop.com/api/v2/memberships?email=' + encodeURIComponent(email), {
      headers: {
        'Authorization': 'Bearer apik_Og0xBRSA0lyPs_C4830617_C_56c0622c1c81da943ff1d2481a8d7d7adc34350377cd2b7b8cffc22f9b2043'
      }
    });
    const d = await r.json();
    const active = d.data && d.data.some(m => m.status === 'active' || m.status === 'trialing');
    return res.json({ active: !!active });
  } catch(e) {
    return res.json({ active: true });
  }
}
