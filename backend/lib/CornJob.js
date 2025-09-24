import nodemailer from 'nodemailer'
import mongoose from "mongoose";
import Escalation from "../model/Escalation.js"; // Import your Escalation model
import User from "../model/User.js"; // Import your User model
import Admin from "../model/Admin.js"; // Import your Admin model
import EscalationLevel from '../model/EscalationLevel.js';
import { sendWhatsAppMessage } from './WhatsAppMessage.js';

// Get today's date normalized to midnight
// const now = new Date();
// const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

// // Utility function to compare dates by day, month, and year
// const isSameDate = (date1, date2) => {
//     return (
//         date1.getFullYear() === date2.getFullYear() &&
//         date1.getMonth() === date2.getMonth() &&
//         date1.getDate() === date2.getDate()
//     );
// };

// Helper function to extract valid ObjectIds from admin lists
// const getValidObjectIds = (admins) =>
//     admins.map((admin) => admin._id).filter((id) => mongoose.Types.ObjectId.isValid(id));

// export const AlertNotification = async () => {
//     try {
//         // Fetch all required data
//         const users = await User.find();
//         const storeManagers = await Admin.find({ role: "store_admin" }).populate("branches");
//         const clusterManagers = await Admin.find({ role: "cluster_admin" }).populate("branches");
//         const TrManagers = await Admin.find({ subRole: "TR" });
//         const HRManagers = await Admin.find({ subRole: "HR" });
//         const MgmtManagers = await Admin.find({ subRole: "Mgmt" });

//         for (const user of users) {
//             const training = user.training;

//             for (const item of training) {
//                 if (!item.deadline || !(item.deadline instanceof Date)) {
//                     console.error("Invalid deadline in training item:", item);
//                     continue;
//                 }

//                 const userLocCode = user.locCode;

//                 // Filter matching admins
//                 const matchingStoreManagers = storeManagers.filter((storeManager) =>
//                     storeManager.branches.some((branch) => branch.locCode === userLocCode)
//                 );
//                 const matchingClusterManagers = clusterManagers.filter((clusterManager) =>
//                     clusterManager.branches.some((branch) => branch.locCode === userLocCode)
//                 );

//                 if (matchingStoreManagers.length === 0) {
//                     console.warn(`No store managers found for user location code: ${userLocCode}`);
//                     continue;
//                 }

//                 const storeManager = matchingStoreManagers[0]; // Select the first store manager
//                 const clusterManager = matchingClusterManagers[0]; // Select the first cluster manager

//                 // Normalize the deadline
//                 const deadlineDate = new Date(item.deadline.getFullYear(), item.deadline.getMonth(), item.deadline.getDate());
//                 const oneDayBefore = new Date(deadlineDate.getTime() - 24 * 60 * 60 * 1000);
//                 const oneDayAfter = new Date(deadlineDate.getTime() + 24 * 60 * 60 * 1000);
//                 const threeDaysAfter = new Date(deadlineDate.getTime() + 3 * 24 * 60 * 60 * 1000);
//                 const fiveDaysAfter = new Date(deadlineDate.getTime() + 5 * 24 * 60 * 60 * 1000);

//                 // Escalation logic
//                 if (isSameDate(today, oneDayBefore)) {
//                     const toAdminIds = getValidObjectIds([storeManager]);
//                     await Escalation.create({
//                         email: user.email,
//                         toUser: user._id,
//                         deadline: item.deadline,
//                         toAdmin: toAdminIds,
//                         context: `Deadline notification: Training due on ${item.deadline}. Store Manager: ${storeManager.name}.`,
//                         level: 1,
//                     });
//                 }

//                 if (isSameDate(today, deadlineDate)) {
//                     const toAdminIds = getValidObjectIds([storeManager]);
//                     await Escalation.create({
//                         email: user.email,
//                         toUser: user._id,
//                         deadline: item.deadline,
//                         toAdmin: toAdminIds,
//                         context: `On-the-day deadline alert: Training due on ${item.deadline}. Store Manager: ${storeManager.name}.`,
//                         level: 1,
//                     });
//                 }

//                 if (isSameDate(today, oneDayAfter)) {
//                     const toAdminIds = getValidObjectIds([storeManager]);
//                     await Escalation.create({
//                         email: user.email,
//                         deadline: item.deadline,
//                         toUser: user._id,
//                         toAdmin: toAdminIds,
//                         context: `Post-deadline alert: Training due on ${item.deadline}. Store Manager: ${storeManager.name}.`,
//                         level: 1,
//                     });
//                 }

//                 if (isSameDate(today, threeDaysAfter)) {
//                     const toAdminIds = getValidObjectIds([storeManager, ...matchingClusterManagers, ...TrManagers]);
//                     await Escalation.create({
//                         email: user.email,
//                         deadline: item.deadline,
//                         toUser: user._id,
//                         toAdmin: toAdminIds,
//                         context: `Escalation Level 2: Training overdue. Store Manager: ${storeManager.name}. Cluster Manager(s): ${matchingClusterManagers
//                             .map((cm) => cm.name)
//                             .join(", ")}. TR Managers: ${TrManagers.map((tr) => tr.name).join(", ")}.`,
//                         level: 2,
//                     });
//                 }

//                 if (isSameDate(today, fiveDaysAfter)) {
//                     const toAdminIds = getValidObjectIds([
//                         storeManager,
//                         ...matchingClusterManagers,
//                         ...TrManagers,
//                         ...HRManagers,
//                     ]);
//                     await Escalation.create({
//                         email: user.email,
//                         deadline: item.deadline,
//                         toUser: user._id,
//                         toAdmin: toAdminIds,
//                         context: `Escalation Level 3: Training overdue by 5 days. Store Manager: ${storeManager.name}. Cluster Manager(s): ${matchingClusterManagers
//                             .map((cm) => cm.name)
//                             .join(", ")}. TR Managers: ${TrManagers.map((tr) => tr.name).join(", ")}. HR Managers: ${HRManagers.map((hr) => hr.name).join(", ")}.`,
//                         level: 3,
//                     });
//                 }

//                 if (
//                     today.getTime() > fiveDaysAfter.getTime() &&
//                     (today.getTime() - fiveDaysAfter.getTime()) % (2 * 24 * 60 * 60 * 1000) === 0
//                 ) {
//                     const toAdminIds = getValidObjectIds([
//                         storeManager,
//                         ...matchingClusterManagers,
//                         ...TrManagers,
//                         ...HRManagers,
//                         ...MgmtManagers,
//                     ]);
//                     await Escalation.create({
//                         email: user.email,
//                         deadline: item.deadline,
//                         toUser: user._id,
//                         toAdmin: toAdminIds,
//                         context: `Recurring escalation: Training overdue by more than 5 days. Store Manager: ${storeManager.name}. Cluster Manager(s): ${matchingClusterManagers
//                             .map((cm) => cm.name)
//                             .join(", ")}. TR Managers: ${TrManagers.map((tr) => tr.name).join(", ")}. HR Managers: ${HRManagers.map((hr) => hr.name).join(", ")}. Mgmt Managers: ${MgmtManagers.map((mgmt) => mgmt.name).join(", ")}.`,
//                         level: 4,
//                     });
//                 }
//             }
//         }
//     } catch (error) {
//         console.error("Error in AlertNotification:", error);
//     }
// };





const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

const isSameDate = (date1, date2) => {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
};

const getValidObjectIds = (admins) =>
    admins.map((admin) => admin?._id).filter((id) => mongoose.Types.ObjectId.isValid(id));

const processDeadlines = async (user, items, escalationContext) => {
    try {
        const storeManagers = await Admin.find({ role: "store_admin" }).populate("branches");
        const clusterManagers = await Admin.find({ role: "cluster_admin" }).populate("branches");
        const TrManagers = await Admin.find({ subRole: "Level 1" });
        const HRManagers = await Admin.find({ subRole: "Level 2" });
        const MgmtManagers = await Admin.find({ subRole: "Level 3" });
        const escalation = await EscalationLevel.find();

        // Store name to location code mapping - needed to match user locCodes with branch locCodes
        const storeNameToLocCode = {
            'ZORUCCI PERINTHALMANNA': '7',
            'ZORUCCI EDAPPALLY': '1',
            'SUITOR GUY TRIVANDRUM': '5',
            'SUITOR GUY PALAKKAD': '19',
            'SUITOR GUY EDAPPALLY': '3',
            'SUITOR GUY KOTTAYAM': '9',
            'SUITOR GUY PERUMBAVOOR': '10',
            'SUITOR GUY THRISSUR': '11',
            'SUITOR GUY CHAVAKKAD': '12',
            'SUITOR GUY EDAPPAL': '15',
            'SUITOR GUY VATAKARA': '14',
            'SUITOR GUY PERINTHALMANNA': '16',
            'SUITOR GUY MANJERI': '18',
            'SUITOR GUY KOTTAKKAL': '17',
            'SUITOR GUY CALICUT': '13',
            'SUITOR GUY KALPETTA': '20',
            'SUITOR GUY KANNUR': '21'
        };

        const BFoneDay = escalation.find((item) => item.id === 1);
        const AFoneDay = escalation.find((item) => item.id === 3);
        const leveltwo = escalation.find((item) => item.id === 4);
        const levelthree = escalation.find((item) => item.id === 5);

        for (const item of items) {
            if (!item?.deadline || !(item.deadline instanceof Date)) {
                console.error("Invalid deadline in item:", item);
                continue;
            }

            const name = item?.trainingId?.trainingName || item?.assessmentId?.title || "Unknown";
            const userLocCode = user?.locCode;
            
            // Convert store name to numeric location code for branch matching
            const numericLocCode = storeNameToLocCode[userLocCode] || userLocCode;
            console.log(`Converting user locCode "${userLocCode}" to numeric "${numericLocCode}"`);

            const matchingStoreManagers = storeManagers.filter((storeManager) =>
                storeManager.branches.some((branch) => branch.locCode === numericLocCode)
            );
            const matchingClusterManagers = clusterManagers.filter((clusterManager) =>
                clusterManager.branches.some((branch) => branch.locCode === numericLocCode)
            );

            if (!matchingStoreManagers.length) {
                console.warn(`No store managers found for user location code: ${userLocCode} (mapped to: ${numericLocCode})`);
                continue;
            }

            const storeManager = matchingStoreManagers[0];
            const clusterManager = matchingClusterManagers[0];

            const deadlineDate = new Date(item.deadline.getFullYear(), item.deadline.getMonth(), item.deadline.getDate());
            const oneDayBefore = new Date(deadlineDate.getTime() - (BFoneDay?.numberOfDays || 1) * (24 * 60 * 60 * 1000));
            const oneDayAfter = new Date(deadlineDate.getTime() + (AFoneDay?.numberOfDays || 1) * (24 * 60 * 60 * 1000));
            const threeDaysAfter = new Date(deadlineDate.getTime() + (leveltwo?.numberOfDays || 3) * (24 * 60 * 60 * 1000));
            const fiveDaysAfter = new Date(deadlineDate.getTime() + (levelthree?.numberOfDays || 5) * (24 * 60 * 60 * 1000));

            const escalationLevels = [
                { date: oneDayBefore, level: 1, admins: [storeManager] },
                { date: deadlineDate, level: 1, admins: [storeManager] },
                { date: oneDayAfter, level: 1, admins: [storeManager] },
                { date: threeDaysAfter, level: 2, admins: [storeManager, ...matchingClusterManagers, ...TrManagers] },
                { date: fiveDaysAfter, level: 3, admins: [storeManager, ...matchingClusterManagers, ...TrManagers, ...HRManagers] },
            ];

            for (const escalationLevel of escalationLevels) {
                if (isSameDate(today, escalationLevel.date)) {
                    const toAdminIds = getValidObjectIds(escalationLevel.admins);
                    await Escalation.create({
                        email: user.email,
                        deadline: item.deadline,
                        toUser: user._id,
                        toAdmin: toAdminIds,
                        context: `${escalationContext} ${name}. Level ${escalationLevel.level} alert.`,
                        level: escalationLevel.level,
                    });
                    await sendWhatsAppMessage(`91${user.phoneNumber}`, `${escalationContext} ${name}. Level ${escalationLevel.level} alert.`);
                }
            }
        }
    } catch (error) {
        console.error("Error processing deadlines:", error);
    }
};

export const AlertNotification = async () => {
    try {
        const users = await User.find()
            .populate("training.trainingId")
            .populate("assignedAssessments.assessmentId");

        for (const user of users) {
            const trainingToProcess = user.training?.filter((item) => item?.pass === false) || [];
            const assessmentsToProcess = user.assignedAssessments?.filter((item) => item?.pass === false) || [];

            await processDeadlines(user, trainingToProcess, "Training Notification: Training name is");
            await processDeadlines(user, assessmentsToProcess, "Assessment Notification: Assessment name is");
        }
    } catch (error) {
        console.error("Error in AlertNotification:", error);
    }
};















// Email Configuration
// const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//         user: "your_email@gmail.com",
//         pass: "your_email_password",
//     },
// });

// // Function to send emails
// const sendEmail = async (email, subject, text) => {
//     try {
//         await transporter.sendMail({
//             from: '"Notification System" <your_email@gmail.com>',
//             to: email,
//             subject,
//             text,
//         });
//         console.log(`Email sent to ${email}`);
//     } catch (err) {
//         console.error(`Failed to send email to ${email}:`, err);
//     }
// };



