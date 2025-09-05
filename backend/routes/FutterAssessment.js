import express from 'express';
import { GetUserMessage, UserAssessmentGet, userAssessmentUpdate, Usergetquestions } from '../controllers/FutterAssessment.js';
const router = express.Router();



/**
 * @swagger
 * /api/user/assessment/user/get/assessment:
 *   get:
 *     tags: [Assessments]
 *     summary: Retrieve user assessments
 *     description: Fetches all assessments assigned to or created for the user.
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: (Optional) Filter by a specific user ID
 *     responses:
 *       200:
 *         description: A list of assessments related to the user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assessments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       assessmentId:
 *                         type: string
 *                       title:
 *                         type: string
 *                       status:
 *                         type: string
 *       400:
 *         description: Bad request, possibly due to missing or invalid parameters.
 *       500:
 *         description: Internal server error.
 */
router.get('/user/get/assessment', UserAssessmentGet);

/**
 * @swagger
 * /api/user/assessment/user/get/assessment/quesions:
 *   get:
 *     tags: [Assessments]
 *     summary: Get questions for a user assessment
 *     description: Retrieves questions associated with a particular assessment for the user.
 *     parameters:
 *       - in: query
 *         name: assessmentId
 *         required: false
 *         schema:
 *           type: string
 *         description: (Optional) The ID of the specific assessment to fetch questions for.
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *         description: (Optional) The ID of the user if filtering or verifying ownership.
 *     responses:
 *       200:
 *         description: A list of questions for the specified assessment.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 questions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       questionId:
 *                         type: string
 *                       questionText:
 *                         type: string
 *                       options:
 *                         type: array
 *                         items:
 *                           type: string
 *       400:
 *         description: Bad request, possibly due to missing or invalid parameters.
 *       404:
 *         description: Assessment or questions not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/user/get/assessment/quesions', Usergetquestions);

/**
 * @swagger
 * /api/user/assessment/user/update/assessment:
 *   post:
 *     summary: Update user assessment
 *     description: Updates or submits answers for a user's assessment.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user submitting the assessment
 *               assessmentId:
 *                 type: string
 *                 description: The ID of the assessment being updated
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     selectedOption:
 *                       type: string
 *             required:
 *               - userId
 *               - assessmentId
 *     responses:
 *       200:
 *         description: User assessment updated/submitted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request, possibly due to missing or invalid data.
 *       404:
 *         description: Assessment not found for the user.
 *       500:
 *         description: Internal server error.
 */
router.post('/user/update/assessment', userAssessmentUpdate);


router.get('/user/get/message/:email',GetUserMessage)
export default router;