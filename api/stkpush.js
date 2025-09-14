import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { phone, amount, name } = req.body;

    // ✅ Access token
    const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString("base64");
    const { data: tokenRes } = await axios.get(
      "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${auth}` } }
    );
    const token = tokenRes.access_token;

    // ✅ STK Password
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
    const password = Buffer.from(process.env.BUSINESS_SHORTCODE + process.env.PASSKEY + timestamp).toString("base64");

    // ✅ Payload
    const payload = {
      BusinessShortCode: process.env.BUSINESS_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: process.env.TILL_NUMBER,
      PhoneNumber: phone,
      CallBackURL: process.env.CALLBACK_URL,
      AccountReference: name || "Innovex Payment",
      TransactionDesc: `Payment by ${name || "Customer"}`
    };

    const { data } = await axios.post(
      "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.status(200).json(data);

  } catch (err) {
    console.error("❌ STK Push Error:", err.response?.data || err.message);
    res.status(500).json({ error: "STK Push failed" });
  }
}
