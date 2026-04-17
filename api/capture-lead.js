export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

    const { email, source, timestamp } = req.body || {};
    if (!email || !email.includes('@')) {
        res.status(400).json({ error: 'Valid email required' });
        return;
    }

    // Log the lead (visible in Vercel function logs)
    console.log(`NEW LEAD | ${email} | ${source} | ${timestamp}`);

    res.status(200).json({ success: true, email });
}
