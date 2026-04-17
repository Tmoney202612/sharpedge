export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

    const { email, tag } = req.body || {};
    if (!email || !email.includes('@')) {
        res.status(400).json({ error: 'Valid email required' });
        return;
    }

    const API_KEY = process.env.MANYCHAT_API_KEY;
    if (!API_KEY) {
        console.log('ManyChat API key not set, logging lead:', email);
        res.status(200).json({ success: true, fallback: true, email });
        return;
    }

    try {
        // Create or find subscriber by email
        const createRes = await fetch('https://api.manychat.com/fb/subscriber/createSubscriber', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                has_opt_in_email: true,
                consent_phrase: 'Subscribed via primeedgepicks.com for +EV Betting Playbook'
            })
        });
        const createData = await createRes.json();

        // Tag the subscriber if tag provided
        if (tag && createData.data && createData.data.id) {
            await fetch('https://api.manychat.com/fb/subscriber/addTagByName', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subscriber_id: createData.data.id,
                    tag_name: tag
                })
            });
        }

        res.status(200).json({ success: true, subscriber: createData.data?.id || null });
    } catch (e) {
        console.error('ManyChat error:', e.message);
        // Still show success to user - log the lead
        console.log('Lead captured (ManyChat failed):', email);
        res.status(200).json({ success: true, fallback: true, email });
    }
}
