// export default async function handler(req, res) {
//   // ✅ CORS headers
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type");

//   if (req.method === "OPTIONS") {
//     return res.status(200).end();
//   }

//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method Not Allowed" });
//   }

//   try {
//     const { phone, amount, name } = req.body;

//     if (!phone || !amount) {
//       return res.status(400).json({ error: "Phone and amount are required" });
//     }

//     // ✅ Generate access token
//     const auth = Buffer.from(
//       `${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`
//     ).toString("base64");

//     const tokenRes = await fetch(
//       "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
//       {
//         headers: {
//           Authorization: `Basic ${auth}`,
//         },
//       }
//     );

//     const tokenData = await tokenRes.json();
//     const token = tokenData.access_token;

//     // ✅ STK Password
//     const timestamp = new Date()
//       .toISOString()
//       .replace(/[-:T.]/g, "")
//       .slice(0, 14);

//     const password = Buffer.from(
//       process.env.BUSINESS_SHORTCODE + process.env.PASSKEY + timestamp
//     ).toString("base64");

//     // ✅ Build payload
//     const payload = {
//       BusinessShortCode: process.env.BUSINESS_SHORTCODE,
//       Password: password,
//       Timestamp: timestamp,
//       TransactionType: "CustomerBuyGoodsOnline",
//       Amount: amount,
//       PartyA: phone,
//       PartyB: 6444134,
//       PhoneNumber: phone,
//       CallBackURL: process.env.CALLBACK_URL,
//       AccountReference: name || "Innovex Payment",
//       TransactionDesc: `Payment by ${name || "Customer"}`,
//     };

//     // ✅ STK push request
//     const stkRes = await fetch(
//       "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(payload),
//       }
//     );

//     const data = await stkRes.json();
//     return res.status(200).json(data);
//   } catch (err) {
//     console.error("❌ STK Push Error:", err.message);
//     return res.status(500).json({ error: "STK Push failed" });
//   }
// }


// pages/api/callback.js
import Africastalking from "africastalking";

const AT = Africastalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});

const sms = AT.SMS;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    console.log("📩 M-PESA Callback:", JSON.stringify(req.body, null, 2));

    const callback = req.body.Body.stkCallback;

    if (callback.ResultCode === 0) {
      const items = callback.CallbackMetadata.Item;

      const amount = items.find((i) => i.Name === "Amount")?.Value;
      let phone = items.find((i) => i.Name === "PhoneNumber")?.Value;
      const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value;

      // 🔹 Normalize phone number
      phone = String(phone);
      if (phone.startsWith("0")) {
        phone = "+254" + phone.slice(1);
      } else if (phone.startsWith("254")) {
        phone = "+" + phone;
      } else if (!phone.startsWith("+")) {
        phone = "+254" + phone;
      }

      // ✅ Send SMS with receipt number
      await sms.send({
        to: phone,
        message: `✅ Payment received!\nAmount: KES ${amount}\nReceipt: ${receipt}\nThank you for your support.`,
        // from: "Career Buddy",
      });

      console.log(`✅ SMS sent to ${phone} for KES ${amount}, Receipt ${receipt}`);
    } else {
      console.log("❌ Payment failed:", callback.ResultDesc);
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("❌ Callback Error:", err.message);
    res.status(500).json({ error: "Callback handling failed" });
  }
}
