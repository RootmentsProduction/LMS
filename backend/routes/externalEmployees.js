import express from "express";
import axios from "axios";

const router = express.Router();

/**
 * @swagger
 * /api/employee_range:
 *   post:
 *     tags: [Employee]
 *     summary: Get employee range data
 *     description: Proxies to external API to retrieve employee data within a specified range
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startEmpId:
 *                 type: string
 *                 default: "EMP1"
 *                 description: Starting employee ID for the range
 *               endEmpId:
 *                 type: string
 *                 default: "EMP9999"
 *                 description: Ending employee ID for the range
 *             example:
 *               startEmpId: "EMP1"
 *               endEmpId: "EMP100"
 *     responses:
 *       200:
 *         description: Employee data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Employee data from external API
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error or proxy failed
 */
router.post("/employee_range", async (req, res) => {
  try {
    const { startEmpId = "EMP1", endEmpId = "EMP9999" } = req.body || {};
    console.log("➡️  /api/employee_range proxy hit:", { startEmpId, endEmpId });

    const upstream = "https://rootments.in/api/employee_range";
    const { data } = await axios.post(
      upstream,
      { startEmpId, endEmpId },
      { timeout: 15000 }
    );

    // The upstream returns { status: "success", data: [...] }
    return res.status(200).json(data);
  } catch (err) {
    const status = err?.response?.status || 500;
    const payload = err?.response?.data || { message: err.message || "Proxy failed" };
    console.error("❌ /api/employee_range upstream error:", status, payload);
    return res.status(status).json(payload);
  }
});

export default router;
