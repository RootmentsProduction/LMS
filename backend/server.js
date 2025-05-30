import dotenv from 'dotenv';
dotenv.config();
import cron from "node-cron";
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import connectMongoDB from './db/database.js';
import ModuleRouter from './routes/ModuleRoute.js';
import userrouter from './routes/AssessmentAndModule.js';
import UserCreating from './routes/UserRoute.js';
import UserRouters from './routes/UserConRoute.js';
import AdminData from './routes/AdminRoute.js'
import FutterAssessment from './routes/FutterAssessment.js'
import Whatsapprouter from './routes/WhatsappRouteZoho.js'

import { AlertNotification } from './lib/CornJob.js';
// import { sendWhatsAppMessage } from './lib/WhatsAppMessage.js';
import setupSwagger from './swagger.js';
// import { sendWhatsAppMessage } from './lib/WhatsAppMessage.js';
const app = express();
setupSwagger(app);
const port = process.env.PORT || 7000;



//http://localhost:3000

app.use(express.json());

app.use(cookieParser());

app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ['https://unicode-mu.vercel.app', 'https://lms.rootments.live', 'http://localhost:3000', 'https://lms-dev-jishnu.vercel.app', 'https://lms-3w6k.vercel.app', 'https://lmsrootments.vercel.app'],
    credentials: true,
  })
);

app.get('/', (req, res) => {
  res.send('✅ API is working');
});


app.use('/api', ModuleRouter)
app.use('/api/user', userrouter)
app.use('/api/usercreate', UserCreating)
app.use('/api/auth', UserRouters)
app.use('/api/admin', AdminData)
app.use('/api/user/assessment', FutterAssessment)
app.use('/zoho', Whatsapprouter)


console.log(new Date());




cron.schedule("30 18 * * *", async () => {
  console.log("Running AlertNotification at 18:30 IST...");
  try {
    await AlertNotification();
    console.log("AlertNotification executed successfully.");
  } catch (error) {
    console.error("Error executing AlertNotification:", error);
  }
}, {
  timezone: "Asia/Kolkata"  // ✅ Set timezone explicitly
});

// sendWhatsAppMessage("919846871894", "Hello! This is a test message from WhatsApp Cloud API")

// cron.schedule("* * * * *", async () => {
//   console.log("Running AlertNotification every minute for testing...");
//   try {
//     await AlertNotification();
//   } catch (error) {
//     console.error("Error executing AlertNotification:", error);
//   }
// });



// AlertNotification();

// sendWhatsAppMessage('917736724727', 'Running AlertNotification every minute for testing...')




  connectMongoDB().then(() => {
  app.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
  });
}).catch(err => {
  console.error('❌ MongoDB connection failed:', err);
});



