require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// 🔐 Env variables
const {
  CONSUMER_KEY,
  CONSUMER_SECRET,
  BUSINESS_SHORTCODE, // Till or Paybill shortcode (but we'll use PARTYB for till)
  PARTYB,             // Till number
  PASSKEY,
  CALLBACK_URL,
} = process.env;

// 🌍 Use LIVE endpoint
const DARAJA_BASE_URL = "https://api.safaricom.co.ke";

// 1️⃣ Generate Access Token
async function getAccessToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const res = await axios.get(
    `${DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return res.data.access_token;
}

// 2️⃣ Generate STK Password
function generatePassword() {
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
  const password = Buffer.from(BUSINESS_SHORTCODE + PASSKEY + timestamp).toString("base64");
  return { password, timestamp };
}

// 3️⃣ STK Push Route
app.post("/stkpush", async (req, res) => {
  try {
    const { phone, amount, name } = req.body;
    const token = await getAccessToken();
    const { password, timestamp } = generatePassword();

    const payload = {
      BusinessShortCode: BUSINESS_SHORTCODE, // Used to create password
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline", // ✅ Till transaction
      Amount: amount,
      PartyA: phone, // Customer number (2547XXXXXXXX)
      PartyB: PARTYB, // ✅ Till number from .env
      PhoneNumber: phone,
      CallBackURL: CALLBACK_URL,
      AccountReference: name || "Innovex",
      TransactionDesc: `Payment by ${name || "Customer"}`,
    };

    const response = await axios.post(
      `${DARAJA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json({ success: true, message: "STK Push initiated", data: response.data });
  } catch (err) {
    console.error("❌ STK Push Error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
});

// 4️⃣ Callback Route
app.post("/callback", (req, res) => {
  const callbackData = req.body;
  console.log("✅ M-PESA Callback Received:", JSON.stringify(callbackData, null, 2));

  if (callbackData.Body.stkCallback.ResultCode === 0) {
    const metadata = callbackData.Body.stkCallback.CallbackMetadata.Item;
    const receipt = metadata.find(i => i.Name === "MpesaReceiptNumber").Value;
    const amount = metadata.find(i => i.Name === "Amount").Value;
    const phone = metadata.find(i => i.Name === "PhoneNumber").Value;
    console.log(`💰 Payment Success: ${amount} from ${phone}, Receipt: ${receipt}`);
  } else {
    console.log("⚠️ Payment Failed:", callbackData.Body.stkCallback.ResultDesc);
  }

  // Respond to Safaricom (must be 200)
  res.json({ ResultCode: 0, ResultDesc: "Callback received successfully" });
});

// 🚀 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server live on port ${PORT}`));
