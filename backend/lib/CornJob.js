import mongoose from "mongoose";
import Escalation from "../model/Escalation.js";
import User from "../model/User.js";
import Admin from "../model/Admin.js";
import EscalationLevel from '../model/EscalationLevel.js';
import { sendWhatsAppMessage } from './WhatsAppMessage.js';
import TrainingProgress from "../model/Trainingprocessschema.js";
import { sendNotification } from "../utils/notificationHelper.js";

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

// Store name to location code mapping
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
  'SUITOR GUY KOZHIKODE': '13',
  'SUITOR GUY KALPETTA': '20',
  'SUITOR GUY KANNUR': '21'
};

/**
 * Process deadline escalations for a single user's training/assessment items.
 * All admin data is passed in — fetched ONCE outside the loop in AlertNotification.
 */
const processDeadlines = async (user, items, escalationContext, adminData) => {
    try {
        const { storeManagers, clusterManagers, TrManagers, HRManagers, escalationLevels } = adminData;

        const BFoneDay    = escalationLevels.find((item) => item.id === 1);
        const AFoneDay    = escalationLevels.find((item) => item.id === 3);
        const leveltwo    = escalationLevels.find((item) => item.id === 4);
        const levelthree  = escalationLevels.find((item) => item.id === 5);

        const userLocCode    = user?.locCode;
        const numericLocCode = storeNameToLocCode[userLocCode] || userLocCode;

        // Skip users with no valid store assignment
        if (!numericLocCode || numericLocCode === 'No Store') return;

        const matchingStoreManagers = storeManagers.filter((sm) =>
            sm.branches.some((branch) => branch.locCode === numericLocCode)
        );
        const matchingClusterManagers = clusterManagers.filter((cm) =>
            cm.branches.some((branch) => branch.locCode === numericLocCode)
        );

        // No manager assigned for this branch — skip silently
        if (!matchingStoreManagers.length) return;

        const storeManager = matchingStoreManagers[0];

        for (const item of items) {
            if (!item?.deadline || !(item.deadline instanceof Date)) continue;

            const name = item?.trainingId?.trainingName || item?.assessmentId?.title || "Unknown";

            const deadlineDate   = new Date(item.deadline.getFullYear(), item.deadline.getMonth(), item.deadline.getDate());
            const oneDayBefore   = new Date(deadlineDate.getTime() - (BFoneDay?.numberOfDays   || 1) * 86400000);
            const oneDayAfter    = new Date(deadlineDate.getTime() + (AFoneDay?.numberOfDays   || 1) * 86400000);
            const threeDaysAfter = new Date(deadlineDate.getTime() + (leveltwo?.numberOfDays   || 3) * 86400000);
            const fiveDaysAfter  = new Date(deadlineDate.getTime() + (levelthree?.numberOfDays || 5) * 86400000);

            const levels = [
                { date: oneDayBefore,   level: 1, admins: [storeManager] },
                { date: deadlineDate,   level: 1, admins: [storeManager] },
                { date: oneDayAfter,    level: 1, admins: [storeManager] },
                { date: threeDaysAfter, level: 2, admins: [storeManager, ...matchingClusterManagers, ...TrManagers] },
                { date: fiveDaysAfter,  level: 3, admins: [storeManager, ...matchingClusterManagers, ...TrManagers, ...HRManagers] },
            ];

            for (const lvl of levels) {
                if (isSameDate(today, lvl.date)) {
                    const toAdminIds = getValidObjectIds(lvl.admins);
                    await Escalation.create({
                        email: user.email,
                        deadline: item.deadline,
                        toUser: user._id,
                        toAdmin: toAdminIds,
                        context: `${escalationContext} ${name}. Level ${lvl.level} alert.`,
                        level: lvl.level,
                    });
                    await sendWhatsAppMessage(`91${user.phoneNumber}`, `${escalationContext} ${name}. Level ${lvl.level} alert.`);
                }
            }
        }
    } catch (error) {
        console.error(`Error processing deadlines for user ${user?.empID}:`, error.message);
    }
};

export const AlertNotification = async () => {
    try {
        // Fetch all admin data ONCE — not inside the per-user loop
        const [storeManagers, clusterManagers, TrManagers, HRManagers, escalationLevels, users] = await Promise.all([
            Admin.find({ role: "store_admin" }).populate("branches"),
            Admin.find({ role: "cluster_admin" }).populate("branches"),
            Admin.find({ subRole: "Level 1" }),
            Admin.find({ subRole: "Level 2" }),
            EscalationLevel.find(),
            User.find()
                .populate("training.trainingId")
                .populate("assignedAssessments.assessmentId"),
        ]);

        const adminData = { storeManagers, clusterManagers, TrManagers, HRManagers, escalationLevels };

        console.log(`🔔 AlertNotification: processing ${users.length} users`);

        for (const user of users) {
            const trainingToProcess    = user.training?.filter((item) => item?.pass === false) || [];
            const assessmentsToProcess = user.assignedAssessments?.filter((item) => item?.pass === false) || [];

            await processDeadlines(user, trainingToProcess,    "Training Notification: Training name is",    adminData);
            await processDeadlines(user, assessmentsToProcess, "Assessment Notification: Assessment name is", adminData);
        }

        // Check overdue trainings and notify HR Admin
        await checkOverdueTrainingsForHR();

        console.log(`✅ AlertNotification complete`);
    } catch (error) {
        console.error("Error in AlertNotification:", error);
    }
};

export const checkOverdueTrainingsForHR = async () => {
    try {
        const currentDate = new Date();
        
        // 1. Get users with overdue assigned trainings (from User.training array)
        const overdueAssignedUsers = await User.find({
            training: {
                $elemMatch: {
                    pass: false,
                    deadline: { $lt: currentDate }
                }
            }
        }).lean();

        // 2. Get overdue mandatory trainings from TrainingProgress collection
        const overdueMandatoryProgress = await TrainingProgress.find({
            pass: false,
            deadline: { $lt: currentDate }
        }).populate('userId').lean();

        // Use a map to collect unique employees with overdue trainings
        const overdueEmployees = new Map();

        // Process assigned trainings from User schema
        overdueAssignedUsers.forEach(user => {
            const overdueTrainings = user.training.filter(
                t => t.pass === false && new Date(t.deadline) < currentDate
            );
            if (overdueTrainings.length > 0) {
                const empId = user.empID;
                if (empId) {
                    overdueEmployees.set(empId, {
                        empID: empId,
                        username: user.username || user.name || "Unknown",
                        count: overdueTrainings.length
                    });
                }
            }
        });

        // Process mandatory trainings from TrainingProgress
        overdueMandatoryProgress.forEach(progress => {
            const user = progress.userId;
            if (user && user.empID) {
                const empId = user.empID;
                const existing = overdueEmployees.get(empId);
                if (existing) {
                    existing.count += 1;
                } else {
                    overdueEmployees.set(empId, {
                        empID: empId,
                        username: user.username || user.name || "Unknown",
                        count: 1
                    });
                }
            }
        });

        const overdueList = Array.from(overdueEmployees.values());
        console.log(`[HR Overdue Check] Found ${overdueList.length} employees with overdue trainings.`);

        if (overdueList.length === 0) {
            return; // No overdue trainings, do nothing
        }

        let title = "Training Overdue Alert";
        let body = "";

        if (overdueList.length === 1) {
            const emp = overdueList[0];
            body = `Training overdue for employee: ${emp.username} (ID: ${emp.empID}).`;
        } else {
            body = `Training overdue for ${overdueList.length} employees.`;
        }

        // Send notification to HR Admin
        await sendNotification({
            title,
            body,
            roles: ['hr_admin'],
            category: 'Training',
            senderName: 'System'
        });

        console.log(`[HR Overdue Check] Notification sent to HR Admin: "${body}"`);
    } catch (error) {
        console.error("Error in checkOverdueTrainingsForHR:", error);
    }
};
