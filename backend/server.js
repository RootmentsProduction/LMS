

import dotenv from 'dotenv';
dotenv.config();

import cron from "node-cron";
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import axios from 'axios';                           // ✅ needed
import mongoose from 'mongoose';

import connectMongoDB from './db/database.js';
import ModuleRouter from './routes/ModuleRoute.js';
import userrouter from './routes/AssessmentAndModule.js';
import UserCreating from './routes/UserRoute.js';
import UserRouters from './routes/UserConRoute.js';
import AdminData from './routes/AdminRoute.js'
import FutterAssessment from './routes/FutterAssessment.js'
import Whatsapprouter from './routes/WhatsappRouteZoho.js'
import EmployeeRouter from './routes/EmployeeRoute.js'
import DebugRouter from './routes/DebugRoute.js'

import { AlertNotification } from './lib/CornJob.js';
import setupSwagger from './swagger.js';

const app = express();
setupSwagger(app);
const port = process.env.PORT || 7000;

// ✅ Hardcode the upstream token EXACTLY as provided
const ROOTMENTS_API_TOKEN = 'RootX-production-9d17d9485eb772e79df8564004d4a4d4';

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Enhanced CORS configuration for better preflight handling
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'https://unicode-mu.vercel.app',
        'https://lms.rootments.live',
        'http://localhost:3000',
        'http://localhost:3001', // lmsweb local dev
        'http://localhost:5173', // dev (Vite)
        'http://localhost:5174', // lmsweb dev (Vite)
        'https://lms-dev-jishnu.vercel.app',
        'https://lms-3w6k.vercel.app',
        'https://lmsrootments.vercel.app',
        'https://lms-testenv-q8co.vercel.app',
        'https://web-lms-fawn.vercel.app',
        'https://trainingweb-gamma.vercel.app',
        'https://learn.rootments.live'
      ];
      
      // Allow Vercel domains
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('🚫 CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma'
    ],
    exposedHeaders: ['Content-Length', 'X-Requested-With'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 200
  })
);

app.get('/', (req, res) => {
  console.log('🌐 Root endpoint accessed from:', req.headers.origin);
  res.send('✅ API is working');
});

// Debug endpoint to check database connection
app.get('/debug/database', async (req, res) => {
  try {
    const currentUri = process.env.MONGODB_URI;
    // const fallbackUri = 'mongodb+srv://abhirambca2021_db_user:Root@cluster0.5rf3i8g.mongodb.net/Rootments?retryWrites=true&w=majority&appName=Cluster0';
    
    const connectionState = mongoose.connection.readyState;
    const connectionStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    const debugInfo = {
      environment: process.env.NODE_ENV || 'development',
      currentMongoUri: currentUri ? currentUri.substring(0, 50) + '...' : 'NOT SET',
      fallbackUri: fallbackUri.substring(0, 50) + '...',
      connectionState: connectionStates[connectionState],
      connectionReadyState: connectionState,
      databaseName: mongoose.connection.db?.databaseName || 'Not connected',
      host: mongoose.connection.host || 'Not connected',
      port: mongoose.connection.port || 'Not connected',
      timestamp: new Date().toISOString()
    };

    console.log('=== DATABASE DEBUG INFO ===');
    console.log(debugInfo);
    console.log('===========================');

    res.status(200).json({
      message: 'Database debug info',
      data: debugInfo
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      message: 'Debug endpoint error',
      error: error.message
    });
  }
});

// Handle preflight OPTIONS requests for all routes
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

/* =================================================
   ✅ INLINE PROXY: POST /api/employee_range
   -> Forwards to https://rootments.in/api/employee_range
   -> Adds Authorization: Bearer <your token>
   Body: { startEmpId, endEmpId }
================================================== */
app.post('/api/employee_range', async (req, res) => {
  try {
    const { startEmpId = 'EMP1', endEmpId = 'EMP9999' } = req.body || {};
    console.log('↗️  /api/employee_range', { startEmpId, endEmpId });

    const upstream = 'https://rootments.in/api/employee_range';
    const { data } = await axios.post(
      upstream,
      { startEmpId, endEmpId },
      {
        timeout: 30000, // Increased timeout to 30 seconds
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${ROOTMENTS_API_TOKEN}`,
        },
      }
    );

    console.log('↘️  /employee_range upstream items:',
      Array.isArray(data?.data) ? data.data.length : 0
    );
    return res.status(200).json(data); // { status: "success", data: [...] }
  } catch (err) {
    const status = err?.response?.status || 500;
    const payload = err?.response?.data || { message: err.message || 'Proxy failed' };
    console.error('❌ /api/employee_range error:', status, payload);
    return res.status(status).json(payload);
  }
});

/* =================================================
   ✅ SINGLE EMPLOYEE DETAIL PROXY
   POST /api/employee_detail
   Body: { empId: "EMP123" }
   -> Uses upstream range API with start=end=empId
================================================== */
app.post('/api/employee_detail', async (req, res) => {
  try {
    const { empId } = req.body || {};
    if (!empId) {
      return res.status(400).json({ status: 'fail', message: 'empId is required' });
    }
    console.log('↗️  /api/employee_detail', { empId });

    const upstream = 'https://rootments.in/api/employee_range';
    const { data } = await axios.post(
      upstream,
      { startEmpId: empId, endEmpId: empId },
      {
        timeout: 30000, // Increased timeout to 30 seconds
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${ROOTMENTS_API_TOKEN}`,
        },
      }
    );

    // Expect { status: 'success', data: [singleOrEmpty] }
    console.log('↘️  /employee_detail upstream items:',
      Array.isArray(data?.data) ? data.data.length : 0
    );
    return res.status(200).json(data);
  } catch (err) {
    const status = err?.response?.status || 500;
    const payload = err?.response?.data || { message: err.message || 'Proxy failed' };
    console.error('❌ /api/employee_detail error:', status, payload);
    return res.status(status).json(payload);
  }
});

/* =================================================
   ✅ EMPLOYEE VERIFICATION PROXY
   POST /api/verify_employee
   Body: { employeeId: "emp257", password: "userpassword" }
   -> Forwards to https://rootments.in/api/verify_employee
   -> Adds Authorization: Bearer <your token>
================================================== */
app.post('/api/verify_employee', async (req, res) => {
  try {
    console.log('🌐 /api/verify_employee accessed from:', req.headers.origin);
    console.log('📝 Request headers:', req.headers);
    
    const { employeeId, password } = req.body || {};
    if (!employeeId || !password) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'employeeId and password are required' 
      });
    }
    console.log('↗️  /api/verify_employee', { employeeId });

    const upstream = 'https://rootments.in/api/verify_employee';
    const { data } = await axios.post(
      upstream,
      { employeeId, password },
      {
        timeout: 30000, // Increased timeout to 30 seconds
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${ROOTMENTS_API_TOKEN}`,
        },
      }
    );

    console.log('↘️  /verify_employee upstream response:', data?.status || 'unknown');
    return res.status(200).json(data);
  } catch (err) {
    const status = err?.response?.status || 500;
    const payload = err?.response?.data || { message: err.message || 'Proxy failed' };
    console.error('❌ /api/verify_employee error:', status, payload);
    return res.status(status).json(payload);
  }
});

/* =================================================
   ✅ VIDEO WATCH PROGRESS TRACKING
   POST /api/video_progress
   Body: { userId, trainingId, moduleId, videoId, watchTime, totalDuration, watchPercentage }
   -> Updates video watch progress in TrainingProgress collection
================================================== */
app.post('/api/video_progress', async (req, res) => {
  try {
    const { userId, trainingId, moduleId, videoId, watchTime, totalDuration, watchPercentage } = req.body || {};
    
    if (!userId || !trainingId || !moduleId || !videoId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId, trainingId, moduleId, and videoId are required' 
      });
    }

    console.log('↗️  /api/video_progress', { userId, trainingId, moduleId, videoId, watchTime, watchPercentage });

    // Import TrainingProgress model
    const { default: TrainingProgress } = await import('./model/Trainingprocessschema.js');

    // Find the training progress
    const trainingProgress = await TrainingProgress.findOne({ 
      userId, 
      trainingId 
    });

    if (!trainingProgress) {
      return res.status(404).json({ 
        success: false,
        message: "Training progress not found for this user and training" 
      });
    }

    // Find the module in the training progress
    const module = trainingProgress.modules.find(mod => 
      mod.moduleId.toString() === moduleId
    );

    if (!module) {
      return res.status(404).json({ 
        success: false,
        message: "Module not found in this training progress" 
      });
    }

    // Find the video in the module
    const video = module.videos.find(v => 
      v.videoId.toString() === videoId
    );

    if (!video) {
      return res.status(404).json({ 
        success: false,
        message: "Video not found in this module" 
      });
    }

    // Update video progress
    video.watchTime = Math.max(video.watchTime || 0, watchTime || 0); // Keep the highest watch time
    video.totalDuration = totalDuration || video.totalDuration || 0;
    video.watchPercentage = watchPercentage || (totalDuration > 0 ? (video.watchTime / totalDuration) * 100 : 0);
    video.lastWatchedAt = new Date();

    // Auto-mark as completed if 90% watched
    if (video.watchPercentage >= 90 && !video.pass) {
      video.pass = true;
      console.log('✅ Video auto-marked as completed (90% watched)');
    }

    // Save updated training progress
    await trainingProgress.save();

    console.log('↘️  /video_progress updated successfully');
    return res.status(200).json({
      success: true,
      message: 'Video progress updated successfully',
      data: {
        watchTime: video.watchTime,
        totalDuration: video.totalDuration,
        watchPercentage: video.watchPercentage,
        completed: video.pass
      }
    });

  } catch (err) {
    console.error('❌ /api/video_progress error:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to update video progress',
      error: err.message 
    });
  }
});

// === your existing routes (unchanged) ===
app.use('/api', ModuleRouter)
app.use('/api/user', userrouter)
app.use('/api/usercreate', UserCreating)
app.use('/api/auth', UserRouters)
app.use('/api/admin', AdminData)
app.use('/api/user/assessment', FutterAssessment)
app.use('/zoho', Whatsapprouter)
app.use('/api/employee', EmployeeRouter)
app.use('/api/debug', DebugRouter)

// User Login Tracking Routes
import UserLoginRouter from './routes/UserLoginRoute.js';
app.use('/api/user-login', UserLoginRouter)

// LMS Website Login Tracking Routes
import LMSLoginRouter from './routes/LMSLoginRoute.js';
app.use('/api/lms-login', LMSLoginRouter)

console.log(new Date());

cron.schedule("30 18 * * *", async () => {
  console.log("Running AlertNotification at 18:30 IST...");
  try {
    await AlertNotification();
    console.log("AlertNotification executed successfully.");
  } catch (error) {
    console.error("Error executing AlertNotification:", error);
  }
}, { timezone: "Asia/Kolkata" });

connectMongoDB().then(() => {
  app.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
  });
}).catch(err => {
  console.error('❌ MongoDB connection failed:', err);





  
});

