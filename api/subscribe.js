export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // بارس آمن للـ body
    const raw = req.body ?? {};
    const body = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw;
    const email = (body.email || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const apiKey = process.env.MAILCHIMP_API_KEY;
    const listId = process.env.MAILCHIMP_AUDIENCE_ID;

    if (!apiKey || !listId) {
      return res.status(500).json({ error: 'Server not configured' });
    }

    // استخرج الداتا سنتر من آخر المفتاح (us7, usX...)
    const dc = apiKey.split('-')[1];
    if (!dc) {
      return res.status(500).json({ error: 'Invalid API key format' });
    }

    const url = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`;

    // إرسال للاشتراك
    const mcRes = await fetch(url, {
      method: 'POST',
      headers: {
        // صح: لازم تكون داخل backticks
        'Authorization': `apikey ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed'
      })
    });

    const data = await mcRes.json().catch(() => ({}));

    // حالات النجاح أو العضو موجود مسبقاً
    if (mcRes.status < 300) {
      return res.status(200).json({ success: true, message: 'Subscribed' });
    }
    if (mcRes.status === 400 && typeof data?.title === 'string' && data.title.includes('Member Exists')) {
      return res.status(200).json({ success: true, message: 'Already subscribed' });
    }

    // أي خطأ آخر من Mailchimp نرجّعه بالتفصيل للمساعدة في التشخيص
    return res
      .status(mcRes.status)
      .json({ error: data?.detail || data?.title || 'Subscription failed' });

  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}
