import express from 'express';
import { createBranch, createUser, GetAllUser, GetBranch, loginUser } from '../controllers/CreateUser.js';
import { createDesignation, getAllDesignation, } from '../controllers/DestinationController.js';
import { MiddilWare } from '../lib/middilWare.js';

const router = express.Router();

// Route to create a user
/**
 * @swagger
 * /api/usercreate/create-user:
 *   post:
 *     tags: [User Management]
 *     summary: Create a new user
 *     description: Registers a new user in the system.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: The desired username
 *               email:
 *                 type: string
 *                 description: The user's email address
 *               password:
 *                 type: string
 *                 description: The user's password
 *             required:
 *               - username
 *               - email
 *               - password
 *     responses:
 *       201:
 *         description: User created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   description: ID of the created user
 *                 message:
 *                   type: string
 *                   description: Success message
 *       400:
 *         description: Invalid or missing user data.
 *       409:
 *         description: Conflict - user already exists.
 *       500:
 *         description: Internal server error.
 */
router.post('/create-user', createUser);

/**
 * @swagger
 * /api/usercreate/user-login:
 *   post:
 *     tags: [User Management]
 *     summary: User login
 *     description: Authenticates a user with a username/email and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailOrUsername:
 *                 type: string
 *                 description: Email or username of the user
 *               password:
 *                 type: string
 *                 description: Password of the user
 *             required:
 *               - emailOrUsername
 *               - password
 *     responses:
 *       200:
 *         description: Login successful, returning a token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token
 *       401:
 *         description: Unauthorized, invalid credentials.
 *       400:
 *         description: Missing or invalid parameters.
 *       500:
 *         description: Internal server error.
 */
router.post('/user-login', loginUser);

/**
 * @swagger
 * /api/usercreate/getAllUser:
 *   get:
 *     tags: [User Management]
 *     summary: Retrieve all users
 *     description: Fetches a list of all registered users.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: An array of user objects.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                   username:
 *                     type: string
 *                   email:
 *                     type: string
 *       401:
 *         description: Unauthorized, token is missing or invalid.
 *       500:
 *         description: Internal server error.
 */
router.get('/getAllUser', MiddilWare, GetAllUser);

/**
 * @swagger
 * /api/usercreate/create/branch:
 *   post:
 *     summary: Create a new branch
 *     description: Creates a new branch in the system.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               branchName:
 *                 type: string
 *                 description: The name of the branch
 *               location:
 *                 type: string
 *                 description: The location of the branch
 *             required:
 *               - branchName
 *     responses:
 *       201:
 *         description: Branch created successfully.
 *       400:
 *         description: Invalid or missing branch data.
 *       500:
 *         description: Internal server error.
 */
router.post('/create/branch', createBranch);

/**
 * @swagger
 * /api/usercreate/getBranch:
 *   get:
 *     summary: Retrieve all branches
 *     description: Fetches a list of all branches in the system.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: An array of branch objects.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   branchId:
 *                     type: string
 *                   branchName:
 *                     type: string
 *                   location:
 *                     type: string
 *       401:
 *         description: Unauthorized, token is missing or invalid.
 *       500:
 *         description: Internal server error.
 */
router.get('/getBranch', MiddilWare, GetBranch);

/**
 * @swagger
 * /api/usercreate/create/designation:
 *   post:
 *     summary: Create a new designation
 *     description: Creates a new designation (job title/role) in the system.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               designationName:
 *                 type: string
 *                 description: The name of the designation
 *             required:
 *               - designationName
 *     responses:
 *       201:
 *         description: Designation created successfully.
 *       400:
 *         description: Invalid or missing designation data.
 *       500:
 *         description: Internal server error.
 */
router.post('/create/designation', createDesignation);

/**
 * @swagger
 * /api/usercreate/getAll/designation:
 *   get:
 *     summary: Retrieve all designations
 *     description: Fetches a list of all designations in the system.
 *     responses:
 *       200:
 *         description: An array of designation objects.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   designationId:
 *                     type: string
 *                   designationName:
 *                     type: string
 *       500:
 *         description: Internal server error.
 */
router.get('/getAll/designation', getAllDesignation);

export default router;
