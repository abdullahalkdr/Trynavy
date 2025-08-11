export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  try {
    const mcRes = await fetch("https://us7.api.mailchimp.com/3.0/lists/f9fc94e1a7/members", {
      method: "POST",
      headers: {
        "Authorization": `apikey ${process.env.MAILCHIMP_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email_address: email,
        status: "subscribed"
      })
    });

    const data = await mcRes.json();

    if (mcRes.status < 300) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(mcRes.status).json({ error: data.detail || 'Subscription failed' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}
