export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const callbackData = req.body;
  console.log("✅ M-PESA Callback Received:", JSON.stringify(callbackData, null, 2));

  if (callbackData.Body.stkCallback.ResultCode === 0) {
    const metadata = callbackData.Body.stkCallback.CallbackMetadata.Item;
    const receipt = metadata.find(i => i.Name === "MpesaReceiptNumber")?.Value;
    const amount = metadata.find(i => i.Name === "Amount")?.Value;
    const phone = metadata.find(i => i.Name === "PhoneNumber")?.Value;
    console.log(`💰 Payment Success: ${amount} from ${phone}, Receipt: ${receipt}`);
    // TODO: Save to DB
  } else {
    console.log("⚠️ Payment Failed:", callbackData.Body.stkCallback.ResultDesc);
  }

  res.status(200).json({ ResultCode: 0, ResultDesc: "Callback received successfully" });
}
