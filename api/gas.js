export default async function handler(req, res) {
  // Hanya izinkan POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GAS_URL =
    'https://script.google.com/macros/s/AKfycbxuke6RREg2p3IWN7AUV9Eqz3Wwa1yZU8rASGKJlrBmAtYz5Sy2oyRx8jvDolb5lLsxBg/exec';

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(req.body),
      redirect: 'follow',
    });

    const text = await response.text();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    return res.status(200).send(text);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
