import twilio from "twilio";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
// 1. Twilio Credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

let client = null;
if (accountSid && accountSid.startsWith("AC") && authToken) {
  try {
    client = twilio(accountSid, authToken);
  } catch (err) {
    console.error("Failed to initialize Twilio client:", err.message);
  }
} else {
  console.warn("Twilio credentials (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN) not set or invalid. Twilio WhatsApp integration will be disabled.");
}


const TWILIO_WHATSAPP_FROM = "whatsapp:+14155238886";

export const WhatsAppZoho = async (req, res) => {
    try {
        // (A) Parse Zoho invoice data
        const payload = req.body;
        console.log("Zoho Books Invoice Webhook Data:", payload);

        // (B) Extract invoice ID (Zoho might send it as 'invoice_id' or nested in payload.data)
        const invoiceId = payload.invoice_id || payload.data?.invoice_id;
        const InvoiceUrl = payload.Invoice_Url || payload.data?.Invoice_Url

        const name = payload.name || payload.data?.name
        if (!invoiceId) {
            console.error("No invoice ID found in payload");
            return res.status(400).send("No invoice ID found");
        }

        // (C) Retrieve the customer phone number
        // Make sure it's in E.164 format with a '+', then prefix with "whatsapp:" for Twilio
        let customerPhone = "91" + payload.contact_mobile_phone || "1234567890";
        // Example: if payload.customer_phone is "1234567890", we make it "whatsapp:+1234567890"
        customerPhone = `whatsapp:${customerPhone.startsWith("+") ? customerPhone : `+${customerPhone}`}`;

        // (D) Send a Text Message via Twilio WhatsApp
        if (!client) {
            console.error("Cannot send Twilio message: Twilio client is not initialized.");
            return res.status(500).send("Twilio is not configured on this server");
        }

        const textMessage = await client.messages.create({

            body: `hello ${name}\nYour invoice ${invoiceId} has been created in Zoho Books! this i your url ${InvoiceUrl}`,
            from: TWILIO_WHATSAPP_FROM,
            to: customerPhone
        });
        console.log("Twilio WhatsApp Text SID:", textMessage.sid);

        // (E) Return success response
        return res.status(200).send("OK: Invoice received, Twilio WhatsApp text message sent");
    } catch (error) {
        console.error("Error handling invoice webhook:", error?.message);
        return res.status(500).send("Error processing invoice webhook");
    }
};
