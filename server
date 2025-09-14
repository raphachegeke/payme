require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Use a router to prefix all routes with /api
const router = express.Router();

// 🟢 /api/stkpush
router.post("/stkpush", async (req, res) => {
  try {
    const { phone, amount, name } = req.body;

    // ✅ Generate access token
    const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString("base64");
    const { data: tokenRes } = await axios.get(
      "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${auth}` } }
    );
    const token = tokenRes.access_token;

    // ✅ Generate STK Password
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
    const password = Buffer.from(process.env.BUSINESS_SHORTCODE + process.env.PASSKEY + timestamp).toString("base64");

    // ✅ Build payload
    const payload = {
      BusinessShortCode: process.env.BUSINESS_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline", // Till transaction
      Amount: amount,
      PartyA: phone,
      PartyB: process.env.TILL_NUMBER,
      PhoneNumber: phone,
      CallBackURL: process.env.CALLBACK_URL,
      AccountReference: name || "Innovex Payment",
      TransactionDesc: `Payment by ${name || "Customer"}`
    };

    // ✅ Send STK Push
    const { data } = await axios.post(
      "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json(data);

  } catch (err) {
    console.error("❌ STK Push Error:", err.response?.data || err.message);
    res.status(500).json({ error: "STK Push failed" });
  }
});

// 🟢 /api/callback
router.post("/callback", (req, res) => {
  const callbackData = req.body;
  console.log("✅ M-PESA Callback Received:", JSON.stringify(callbackData, null, 2));

  if (callbackData.Body.stkCallback.ResultCode === 0) {
    const metadata = callbackData.Body.stkCallback.CallbackMetadata.Item;
    const receipt = metadata.find(i => i.Name === "MpesaReceiptNumber").Value;
    const amount = metadata.find(i => i.Name === "Amount").Value;
    const phone = metadata.find(i => i.Name === "PhoneNumber").Value;
    console.log(`💰 Payment Success: ${amount} from ${phone}, Receipt: ${receipt}`);
    // TODO: Save to DB if needed
  } else {
    console.log("⚠️ Payment Failed:", callbackData.Body.stkCallback.ResultDesc);
  }

  res.json({ ResultCode: 0, ResultDesc: "Callback received successfully" });
});

// 🔹 Prefix all routes with /api
app.use("/api", router);

// 🔹 Export for Vercel
module.exports = app;
