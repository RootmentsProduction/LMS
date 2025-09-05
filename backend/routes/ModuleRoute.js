import express from 'express'
const router = express.Router();
import { createModule, getModules } from '../controllers/moduleController.js'; // Adjust the path to your controller
import { calculateProgress, createAssessment, createMandatoryTraining, createTraining, getAssessments, GetTrainingById } from '../controllers/AssessmentController.js';
import { GetAllFullTrainingWithCompletion, GetAllTrainingWithCompletion, MandatoryGetAllTrainingWithCompletion } from '../controllers/AssessmentAndModule.js';
import { MiddilWare } from '../lib/middilWare.js';

/**
 * @swagger
 * /api/modules:
 *   post:
 *     tags: [Modules]
 *     summary: Create a new module
 *     description: Creates a new training module in the system.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               moduleName:
 *                 type: string
 *                 description: The name of the module
 *               description:
 *                 type: string
 *                 description: Details or purpose of the module
 *               duration:
 *                 type: number
 *                 description: Duration in hours or minutes
 *             required:
 *               - moduleName
 *     responses:
 *       201:
 *         description: Module created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 moduleId:
 *                   type: string
 *                   description: Unique ID of the created module
 *                 message:
 *                   type: string
 *                   description: Confirmation message
 *       400:
 *         description: Invalid data provided
 *       500:
 *         description: Internal server error
 */
router.post('/modules', createModule);

/**
 * @swagger
 * /api/assessments:
 *   post:
 *     tags: [Assessments]
 *     summary: Create a new assessment
 *     description: Creates a new assessment in the system.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assessmentName:
 *                 type: string
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionText:
 *                       type: string
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *                     correctAnswer:
 *                       type: string
 *             required:
 *               - assessmentName
 *               - questions
 *     responses:
 *       201:
 *         description: Assessment created successfully.
 *       400:
 *         description: Invalid data provided
 *       500:
 *         description: Internal server error
 */
router.post('/assessments', MiddilWare, createAssessment);

/**
 * @swagger
 * /api/modules/{id}:
 *   get:
 *     tags: [Modules]
 *     summary: Get modules
 *     description: Retrieves one or all modules. If an `id` is provided, returns a single module; otherwise, returns all modules.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: false
 *         schema:
 *           type: string
 *         description: Module ID
 *     responses:
 *       200:
 *         description: List of modules or a single module.
 *       404:
 *         description: Module not found (if an ID is provided).
 *       500:
 *         description: Internal server error
 */
router.get('/modules/:id?', getModules);

/**
 * @swagger
 * /api/assessments/{id}:
 *   get:
 *     summary: Get assessments
 *     description: Retrieves one or all assessments. If an `id` is provided, returns a single assessment; otherwise, returns all assessments.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: false
 *         schema:
 *           type: string
 *         description: Assessment ID
 *     responses:
 *       200:
 *         description: List of assessments or a single assessment.
 *       404:
 *         description: Assessment not found (if an ID is provided).
 *       500:
 *         description: Internal server error
 */
router.get('/assessments/:id?', getAssessments);

/**
 * @swagger
 * /api/trainings:
 *   post:
 *     tags: [Training]
 *     summary: Create a new training
 *     description: Creates a new training session, linking modules or assessments if necessary.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trainingName:
 *                 type: string
 *               moduleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               assessmentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *             required:
 *               - trainingName
 *     responses:
 *       201:
 *         description: Training created successfully.
 *       400:
 *         description: Invalid data provided
 *       500:
 *         description: Internal server error
 */
router.post('/trainings', MiddilWare, createTraining);

/**
 * @swagger
 * /api/trainings/{id}:
 *   get:
 *     tags: [Training]
 *     summary: Get training by ID or list all
 *     description: Retrieves a specific training if an `id` is provided; otherwise, returns all trainings.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: false
 *         schema:
 *           type: string
 *         description: Training ID
 *     responses:
 *       200:
 *         description: Training details or list of trainings.
 *       404:
 *         description: Training not found (if an ID is provided).
 *       500:
 *         description: Internal server error
 */
router.get('/trainings/:id?', GetTrainingById);

/**
 * @swagger
 * /api/get/allusertraining:
 *   get:
 *     summary: Get all user training with completion status
 *     description: Returns a list of all trainings for all users, along with their completion status.
 *     responses:
 *       200:
 *         description: A list of user trainings with completion info.
 *       500:
 *         description: Internal server error
 */
router.get('/get/allusertraining', GetAllTrainingWithCompletion);

/**
 * @swagger
 * /api/get/mandatory/allusertraining:
 *   get:
 *     summary: Get all mandatory user training with completion status
 *     description: Returns a list of mandatory trainings for all users, along with their completion status.
 *     responses:
 *       200:
 *         description: A list of mandatory user trainings with completion info.
 *       500:
 *         description: Internal server error
 */
router.get('/get/mandatory/allusertraining', MandatoryGetAllTrainingWithCompletion);

/**
 * @swagger
 * /api/get/Full/allusertraining:
 *   get:
 *     summary: Get all user training (full) with completion status
 *     description: Returns a list of all user trainings, whether mandatory or optional, with completion info.
 *     responses:
 *       200:
 *         description: A list of all user trainings with completion info.
 *       500:
 *         description: Internal server error
 */
router.get('/get/Full/allusertraining', GetAllFullTrainingWithCompletion);

/**
 * @swagger
 * /api/get/progress:
 *   get:
 *     summary: Calculate user training progress
 *     description: Calculates and returns the training progress for the authenticated user or all users.
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: (Optional) Calculate progress for a specific user
 *     responses:
 *       200:
 *         description: Progress calculation result.
 *       401:
 *         description: Unauthorized if user authentication fails
 *       500:
 *         description: Internal server error
 */
router.get('/get/progress', MiddilWare, calculateProgress);

/**
 * @swagger
 * /api/mandatorytrainings:
 *   post:
 *     summary: Create or assign mandatory training
 *     description: Creates a new mandatory training or assigns an existing training as mandatory.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trainingId:
 *                 type: string
 *               mandatoryForRoles:
 *                 type: array
 *                 items:
 *                   type: string
 *               mandatoryForDepartments:
 *                 type: array
 *                 items:
 *                   type: string
 *               startDate:
 *                 type: string
 *               endDate:
 *                 type: string
 *     responses:
 *       201:
 *         description: Mandatory training created or updated successfully.
 *       400:
 *         description: Invalid data provided
 *       500:
 *         description: Internal server error
 */
router.post('/mandatorytrainings', MiddilWare, createMandatoryTraining);

export default router
