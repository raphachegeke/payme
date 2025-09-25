// module.exports = function handler(req, res) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method Not Allowed" });
//   }

//   const callbackData = req.body;
//   console.log("✅ M-PESA Callback Received:", JSON.stringify(callbackData, null, 2));

//   if (callbackData.Body.stkCallback.ResultCode === 0) {
//     const metadata = callbackData.Body.stkCallback.CallbackMetadata.Item;
//     const receipt = metadata.find(i => i.Name === "MpesaReceiptNumber")?.Value;
//     const amount = metadata.find(i => i.Name === "Amount")?.Value;
//     const phone = metadata.find(i => i.Name === "PhoneNumber")?.Value;
//     console.log(`💰 Payment Success: ${amount} from ${phone}, Receipt: ${receipt}`);
//     // TODO: Save to DB
//   } else {
//     console.log("⚠️ Payment Failed:", callbackData.Body.stkCallback.ResultDesc);
//   }

//   res.status(200).json({ ResultCode: 0, ResultDesc: "Callback received successfully" });
// };


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
      // ✅ Success
      const items = callback.CallbackMetadata.Item;
      const amount = items.find((i) => i.Name === "Amount")?.Value;
      const phone = items.find((i) => i.Name === "PhoneNumber")?.Value;

      // Send SMS via Africa's Talking
      await sms.send({
        to: phone,
        message: `Thank you! Your sponsorship of KES ${amount} has been received successfully.`,
        // from: "Career Buddy",
      });

      console.log(`✅ SMS sent to ${phone} for KES ${amount}`);
    } else {
      console.log("❌ Payment failed:", callback.ResultDesc);
    }

    res.json({ status: "ok" }); // Always respond to Safaricom
  } catch (err) {
    console.error("❌ Callback Error:", err.message);
    res.status(500).json({ error: "Callback handling failed" });
  }
}
