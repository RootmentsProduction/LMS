import Notification from '../model/Notification.js';

/**
 * Utility to save a notification to the database.
 * 
 * @param {Object} params
 * @param {string} params.title - Title of the notification
 * @param {string} params.body - Detailed message body of the notification
 * @param {string[]} [params.userIds] - Targeted user/employee ObjectIds
 * @param {string[]} [params.roles] - Targeted designation/role strings
 * @param {string[]} [params.branches] - Targeted store/location codes
 * @param {string} [params.senderName] - Name of the admin performing the action (saved in useradmin field)
 * @param {string} [params.category] - Category of notification (e.g. 'Task', 'Training', 'General')
 */
export const sendNotification = async ({
  title,
  body,
  userIds = [],
  roles = [],
  branches = [],
  senderName = 'System',
  category = 'General'
}) => {
  try {
    const notification = await Notification.create({
      title,
      body,
      user: userIds,
      Role: roles,
      branch: branches,
      useradmin: senderName,
      category
    });
    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
  }
};
