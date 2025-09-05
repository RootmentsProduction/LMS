import express from 'express';
import { WhatsAppZoho } from '../controllers/WhatsAppZoho.js';

const router = express.Router();

/**
 * @swagger
 * /zoho/invoice-webhook:
 *   post:
 *     tags: [WhatsApp Integration]
 *     summary: WhatsApp webhook for Zoho integration
 *     description: Webhook endpoint for processing WhatsApp messages and Zoho invoice integration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: WhatsApp message content
 *               from:
 *                 type: string
 *                 description: Sender phone number
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Message timestamp
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/invoice-webhook', WhatsAppZoho);

export default router;
