import express from 'express';
import { assignModuleToUser, assignAssessmentToUser, ReassignTraining, deleteTrainingController, GetAssessment, getVideoAssessment, submitVideoAssessment, getUserTrainingProgress, assignMissingMandatoryTrainingsByDesignation, assignMissingMandatoryTrainingsToAllUsers } from '../controllers/AssessmentAndModule.js';
import { GetuserTraining, GetuserTrainingprocess, GetuserTrainingprocessmodule, UpdateuserTrainingprocess, GetUserAllTrainings } from '../controllers/CreateUser.js';
import { AssessmentAssign, TrainingDetails, GetTrainingDetailsSimple } from '../controllers/AssessmentReassign.js';
import { GetAssessmentDetails } from '../controllers/moduleController.js';
import { UserAssessmentGet } from '../controllers/FutterAssessment.js';
import { MiddilWare } from '../lib/middilWare.js';
import User from '../model/User.js';

const router = express.Router();


/**
 * @swagger
 * /api/user/assign-module:
 *   post:
 *     tags: [Modules]
 *     summary: Assign a module to a user
 *     description: Assigns a training or learning module to a specific user with an optional deadline.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user.
 *               moduleId:
 *                 type: string
 *                 description: The ID of the module to assign.
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 description: Optional deadline for module completion (ISO 8601 format).
 *             required:
 *               - userId
 *               - moduleId
 *     responses:
 *       200:
 *         description: Module successfully assigned.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request, missing or invalid data.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */

router.post('/assign-module', assignModuleToUser);



/**
 * @swagger
 * /api/user/assign-assessment:
 *   post:
 *     tags: [Assessments]
 *     summary: Assign an assessment to a user
 *     description: Assigns an assessment to a specific user with an optional deadline.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user.
 *               assessmentId:
 *                 type: string
 *                 description: The ID of the assessment to assign.
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 description: Optional deadline for assessment completion (ISO 8601 format).
 *             required:
 *               - userId
 *               - assessmentId
 *     responses:
 *       200:
 *         description: Assessment successfully assigned.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request, missing or invalid data.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */

router.post('/assign-assessment', assignAssessmentToUser);




/**
 * @swagger
 * /api/user/getAll/training:
 *   get:
 *     tags: [Training]
 *     summary: Retrieve all user training
 *     description: Fetches a list of all trainings assigned to a user, including their progress and overall completion percentage.
 *     parameters:
 *       - in: query
 *         name: empID
 *         schema:
 *           type: string
 *         required: true
 *         description: Employee ID of the user to fetch training progress for.
 *     responses:
 *       200:
 *         description: Successfully retrieved training data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Data found
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       description: User data including training references.
 *                     trainingProgress:
 *                       type: array
 *                       description: List of trainings with completion status.
 *                       items:
 *                         type: object
 *                         properties:
 *                           trainingId:
 *                             type: string
 *                             example: 65fa0c23a943f80017bba812
 *                           name:
 *                             type: string
 *                             example: Fire Safety Training
 *                           completionPercentage:
 *                             type: string
 *                             example: "75.00"
 *                     userOverallCompletionPercentage:
 *                       type: string
 *                       example: "80.25"
 *       400:
 *         description: Bad request, invalid parameters.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /api/user/getAll/trainings:
 *   get:
 *     tags: [Training]
 *     summary: Retrieve all user trainings (assigned and mandatory)
 *     description: Fetches a unified list of all trainings assigned to a user, including both assigned and mandatory trainings with their progress.
 *     parameters:
 *       - in: query
 *         name: empID
 *         schema:
 *           type: string
 *         required: true
 *         description: Employee ID of the user to fetch all trainings for.
 *     responses:
 *       200:
 *         description: Successfully retrieved all training data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: All trainings data found
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       description: User data including ID and role.
 *                     assignedTrainings:
 *                       type: array
 *                       description: List of assigned trainings with completion status.
 *                     mandatoryTrainings:
 *                       type: array
 *                       description: List of mandatory trainings assigned to user's role.
 *                     allTrainings:
 *                       type: array
 *                       description: Combined list of all trainings.
 *                     userOverallCompletionPercentage:
 *                       type: string
 *                       example: "75.50"
 *                     userRole:
 *                       type: string
 *                       example: "Manager"
 *       400:
 *         description: Bad request, invalid parameters.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */

router.get('/getAll/trainings', GetUserAllTrainings);




/**
 * @swagger
 * /api/user/getAll/trainingprocess:
 *   get:
 *     summary: Retrieve specific user training process
 *     description: Fetches the detailed training progress including modules and videos for a specific user and training.
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the user.
 *       - in: query
 *         name: trainingId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the training.
 *     responses:
 *       200:
 *         description: Successfully retrieved training process.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Data found
 *                 data:
 *                   type: object
 *                   description: TrainingProgress document including populated training, modules, and videos.
 *                 completionPercentage:
 *                   type: string
 *                   example: "85.00"
 *       400:
 *         description: Bad request, invalid parameters.
 *       404:
 *         description: No data found.
 *       500:
 *         description: Internal server error.
 */
router.get('/getAll/trainingprocess', GetuserTrainingprocess);






/**
 * @swagger
 * /api/user/getAll/trainingprocess/module:
 *   get:
 *     summary: Retrieve a specific module in the training process
 *     description: Fetches a module's details along with its videos and completion percentage for a specific user and training.
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the user.
 *       - in: query
 *         name: trainingId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the training.
 *       - in: query
 *         name: moduleId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the module to retrieve.
 *     responses:
 *       200:
 *         description: Successfully retrieved module information.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Module data found
 *                 data:
 *                   type: object
 *                   description: Populated module with videos and pass status
 *                 moduledata:
 *                   type: object
 *                   description: Raw module data from Module collection
 *                 completionPercentage:
 *                   type: string
 *                   example: "72.50"
 *       400:
 *         description: Bad request, invalid parameters.
 *       404:
 *         description: Module not found.
 *       500:
 *         description: Internal server error.
 */

router.get('/getAll/trainingprocess/module', GetuserTrainingprocessmodule);








/**
 * @swagger
 * /api/user/update/trainingprocess:
 *   patch:
 *     summary: Update user training process
 *     description: Updates the pass status of a video, the associated module, and the overall training process.
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the user.
 *       - in: query
 *         name: trainingId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the training.
 *       - in: query
 *         name: moduleId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the module.
 *       - in: query
 *         name: videoId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the video to mark as completed.
 *     responses:
 *       200:
 *         description: Training process and user status updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Training progress and user status updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     trainingProgress:
 *                       type: object
 *                     user:
 *                       type: object
 *       400:
 *         description: Missing required query parameters.
 *       404:
 *         description: User, training, module, or video not found.
 *       500:
 *         description: Internal server error.
 */

router.patch('/update/trainingprocess', UpdateuserTrainingprocess);








/**
 * @swagger
 * /api/user/reassign/training:
 *   post:
 *     tags: [Training]
 *     summary: Reassign training to users
 *     description: Reassigns a training program to one or more users by removing existing progress and reinitializing the training state.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignedTo
 *               - trainingId
 *             properties:
 *               assignedTo:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs to reassign the training to.
 *               trainingId:
 *                 type: string
 *                 description: ID of the training to be reassigned.
 *     responses:
 *       200:
 *         description: Training successfully reassigned to users.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Training successfully reassigned to users
 *       400:
 *         description: Bad request, missing or invalid data.
 *       404:
 *         description: Training or users not found.
 *       500:
 *         description: Internal server error.
 */

router.post('/reassign/training', ReassignTraining);





/**
 * @swagger
 * /api/user/delete/training/{id}:
 *   delete:
 *     summary: Delete a training and associated records
 *     description: Deletes a training by its ID. Also removes related training progress records and user assignments.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the training to delete
 *     responses:
 *       200:
 *         description: Training deleted successfully along with related user assignments and progress.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Training deleted successfully
 *       400:
 *         description: Invalid request or training ID.
 *       404:
 *         description: Training not found.
 *       500:
 *         description: Internal server error.
 */

router.delete('/delete/training/:id', deleteTrainingController);








/**
 * @swagger
 * /api/user/get/AllAssessment:
 *   get:
 *     summary: Retrieve all assessments with user progress
 *     description: Returns all assessments in the system, along with statistics on how many users were assigned and how many passed each assessment.
 *     responses:
 *       200:
 *         description: Successfully retrieved all assessments with statistics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Assessments retrieved successfully.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       assessmentId:
 *                         type: string
 *                         example: "60f8a6b5f83e4c42f87e7d90"
 *                       assessmentName:
 *                         type: string
 *                         example: "JavaScript Basics"
 *                       assessment:
 *                         type: integer
 *                         example: 10
 *                       assessmentdeadline:
 *                         type: string
 *                         format: date
 *                         example: "2025-06-01"
 *                       assessmentduration:
 *                         type: integer
 *                         example: 30
 *                       totalAssigned:
 *                         type: integer
 *                         example: 5
 *                       totalPassed:
 *                         type: integer
 *                         example: 3
 *                       completionPercentage:
 *                         type: string
 *                         example: "60.00"
 *       400:
 *         description: Bad request, invalid query parameters.
 *       500:
 *         description: Internal server error.
 */

router.get('/get/AllAssessment', GetAssessment);






/**
 * @swagger
 * /api/user/get/Training/details/{id}:
 *   get:
 *     summary: Get training details with user progress
 *     description: Retrieves detailed information about a specific training, including user progress, module completion, and assigned branches/designations.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The training ID
 *     responses:
 *       200:
 *         description: Successfully retrieved training details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 training:
 *                   type: object
 *                   description: The training document
 *                 progressDetails:
 *                   type: array
 *                   description: List of user progress data
 *                   items:
 *                     type: object
 *                     properties:
 *                       user:
 *                         type: object
 *                         description: Detailed user data
 *                       userEmail:
 *                         type: string
 *                         example: "john.doe@example.com"
 *                       progress:
 *                         type: integer
 *                         example: 75
 *                         description: Percentage of video progress
 *                       moduleCompletion:
 *                         type: integer
 *                         example: 60
 *                         description: Percentage of module completion
 *                 uniqueBranches:
 *                   type: array
 *                   description: Distinct working branches of assigned users
 *                   items:
 *                     type: string
 *                     example: "Kottayam Branch"
 *                 uniquedesignation:
 *                   type: array
 *                   description: Distinct designations of assigned users
 *                   items:
 *                     type: string
 *                     example: "Sales Executive"
 *       404:
 *         description: Training not found.
 *       500:
 *         description: Internal server error.
 */

router.get('/get/Training/details/:id', TrainingDetails);

// Simple training details for frontend
router.get('/get/Training/details/simple/:id', GetTrainingDetailsSimple);

// Get user training progress (mandatory trainings)
router.get('/user/training-progress/:userId', getUserTrainingProgress);

// Assign missing mandatory trainings to users by designation
router.post('/assign-missing-mandatory-trainings', MiddilWare, assignMissingMandatoryTrainingsByDesignation);

// Assign missing mandatory trainings to ALL users
router.post('/assign-missing-mandatory-trainings-all', MiddilWare, assignMissingMandatoryTrainingsToAllUsers);





/**
 * @swagger
 * /api/user/post/createAssessment:
 *   post:
 *     summary: Create or assign a new assessment
 *     description: Creates a new assessment or assigns an existing assessment to a user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assessmentName:
 *                 type: string
 *               userId:
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
 *     responses:
 *       200:
 *         description: Assessment created/assigned successfully.
 *       400:
 *         description: Bad request, missing or invalid data.
 *       500:
 *         description: Internal server error.
 */
router.post('/post/createAssessment', MiddilWare, AssessmentAssign);



/**
 * @swagger
 * /api/user/get/assessment/details/{id}:
 *   get:
 *     summary: Get assessment details
 *     description: Retrieves detailed information about a specific assessment by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The assessment ID
 *     responses:
 *       200:
 *         description: Successfully retrieved assessment details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Assessment details fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: The user's ID.
 *                           username:
 *                             type: string
 *                             description: The user's username.
 *                           email:
 *                             type: string
 *                             description: The user's email.
 *                           empID:
 *                             type: string
 *                             description: The user's employee ID.
 *                           workingBranch:
 *                             type: string
 *                             description: The branch where the user works.
 *                           designation:
 *                             type: string
 *                             description: The user's job title or designation.
 *                           assignedAssessments:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 assessmentId:
 *                                   type: string
 *                                   description: The ID of the assessment assigned.
 *                                 progress:
 *                                   type: string
 *                                   description: The user's progress on the assessment.
 *       404:
 *         description: Assessment not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/get/assessment/details/:id', GetAssessmentDetails);



/**
 * @swagger
 * /api/user/getAll/assessment:
 *   get:
 *     summary: Retrieve all assessments with user progress
 *     description: Returns all assessments in the system, along with statistics on how many users were assigned and how many passed each assessment.
 *     responses:
 *       200:
 *         description: Successfully retrieved all assessments with statistics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Assessments retrieved successfully.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       assessmentId:
 *                         type: string
 *                         example: "60f8a6b5f83e4c42f87e7d90"
 *                       assessmentName:
 *                         type: string
 *                         example: "JavaScript Basics"
 *                       assessment:
 *                         type: integer
 *                         example: 10
 *                       assessmentdeadline:
 *                         type: string
 *                         format: date
 *                         example: "2025-06-01"
 *                       assessmentduration:
 *                         type: integer
 *                         example: 30
 *                       totalAssigned:
 *                         type: integer
 *                         example: 5
 *                       totalPassed:
 *                         type: integer
 *                         example: 3
 *                       completionPercentage:
 *                         type: string
 *                         example: "60.00"
 *       400:
 *         description: Bad request, invalid query parameters.
 *       500:
 *         description: Internal server error.
 */
router.get('/getAll/assessment', UserAssessmentGet);



/**
 * @swagger
 * /api/user/get/user/details:
 *   get:
 *     summary: Get user details by empID
 *     description: Retrieves user details (username, email, empID, workingBranch, designation) based on the provided employee ID.
 *     parameters:
 *       - in: query
 *         name: empID
 *         schema:
 *           type: string
 *         required: true
 *         description: The employee ID of the user to retrieve.
 *     responses:
 *       200:
 *         description: User details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User details found
 *                 data:
 *                   type: object
 *                   properties:
 *                     username:
 *                       type: string
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     empID:
 *                       type: string
 *                       example: "EMP001"
 *                     workingBranch:
 *                       type: string
 *                       example: "Kottayam Branch"
 *                     designation:
 *                       type: string
 *                       example: "Sales Executive"
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/get/user/details', async (req, res) => {
    try {
        const empID = req.query.empID;
        if (!empID) {
            return res.status(400).json({ message: 'Employee ID is required' });
        }

        const user = await User.findOne({ empID: empID });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

                 res.status(200).json({
             message: 'User details found',
             data: {
                 _id: user._id,
                 username: user.username,
                 email: user.email,
                 empID: user.empID,
                 workingBranch: user.workingBranch,
                 designation: user.designation
             }
         });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/user/get/video-assessment/{videoId}:
 *   get:
 *     summary: Get video assessment questions
 *     description: Retrieves assessment questions for a specific video without revealing correct answers.
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: The video ID to get assessment questions for
 *     responses:
 *       200:
 *         description: Video assessment questions retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Video assessment questions retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     videoId:
 *                       type: string
 *                       description: The video ID
 *                     videoTitle:
 *                       type: string
 *                       description: The video title
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: Question ID
 *                           questionText:
 *                             type: string
 *                             description: The question text
 *                           options:
 *                             type: array
 *                             items:
 *                               type: string
 *                             description: Multiple choice options
 *       400:
 *         description: Video ID is required.
 *       404:
 *         description: Video not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/get/video-assessment/:videoId', getVideoAssessment);

/**
 * @swagger
 * /api/user/submit/video-assessment/{videoId}:
 *   post:
 *     summary: Submit video assessment answers
 *     description: Submits answers for a video assessment and calculates the score.
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: The video ID to submit assessment answers for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: string
 *                       description: The question ID
 *                     selectedAnswer:
 *                       type: string
 *                       description: The user's selected answer
 *               userId:
 *                 type: string
 *                 description: The user ID (optional, for progress tracking)
 *               trainingId:
 *                 type: string
 *                 description: The training ID (optional, for progress tracking)
 *               moduleId:
 *                 type: string
 *                 description: The module ID (optional, for progress tracking)
 *     responses:
 *       200:
 *         description: Video assessment submitted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Video assessment submitted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     videoId:
 *                       type: string
 *                       description: The video ID
 *                     score:
 *                       type: number
 *                       description: The assessment score (0-100)
 *                     passed:
 *                       type: boolean
 *                       description: Whether the user passed the assessment
 *                     totalQuestions:
 *                       type: number
 *                       description: Total number of questions
 *                     correctAnswers:
 *                       type: number
 *                       description: Number of correct answers
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           questionId:
 *                             type: string
 *                           selectedAnswer:
 *                             type: string
 *                           correctAnswer:
 *                             type: string
 *                           correct:
 *                             type: boolean
 *       400:
 *         description: Video ID and answers array are required.
 *       404:
 *         description: Video not found.
 *       500:
 *         description: Internal server error.
 */
router.post('/submit/video-assessment/:videoId', submitVideoAssessment);

export default router;
