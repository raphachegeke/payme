// server.js
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🟢 STK Push Route
app.post("/stkpush", async (req, res) => {
  try {
    const { phone, amount } = req.body;

    // ✅ Generate access token
    const auth = Buffer.from(
      `${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`
    ).toString("base64");

    const { data: tokenRes } = await axios.get(
      "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${auth}` } }
    );
    const token = tokenRes.access_token;

    // ✅ Timestamp + Password
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.]/g, "")
      .slice(0, 14);

    const password = Buffer.from(
      process.env.BUSINESS_SHORTCODE + process.env.PASSKEY + timestamp
    ).toString("base64");

    // ✅ Send STK Push
    const { data } = await axios.post(
      "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: process.env.BUSINESS_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerBuyGoodsOnline", // Till Number
        Amount: amount,
        PartyA: phone, // customer
        PartyB: process.env.TILL_NUMBER, // till number
        PhoneNumber: phone,
        CallBackURL: process.env.CALLBACK_URL,
        AccountReference: "Innovex Payment",
        TransactionDesc: "Payment"
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    res.json(data);
  } catch (err) {
    console.error("❌ STK Error:", err.response?.data || err.message);
    res.status(500).json({ error: "STK Push failed" });
  }
});

// 🟢 Callback route
app.post("/callback", (req, res) => {
  console.log("✅ Callback received:", JSON.stringify(req.body, null, 2));
  res.json({ message: "Callback received" });
});

// 🔑 Export Express app as Vercel serverless function
module.exports = app;
