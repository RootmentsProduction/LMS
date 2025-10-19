import GoogleFormLink from '../model/GoogleFormLink.js';

// Create or update Google Form link
export const createOrUpdateGoogleFormLink = async (req, res) => {
    try {
        const { title, url, description } = req.body;
        const userId = req.admin.userId;

        // Validate required fields
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'Google Form URL is required'
            });
        }

        // Check if a Google Form link already exists
        let existingLink = await GoogleFormLink.findOne({ isActive: true });

        if (existingLink) {
            // Update existing link
            existingLink.title = title || existingLink.title;
            existingLink.url = url;
            existingLink.description = description || existingLink.description;
            existingLink.lastModifiedBy = userId;
            existingLink.isActive = true;

            await existingLink.save();

            res.status(200).json({
                success: true,
                message: 'Google Form link updated successfully',
                data: existingLink
            });
        } else {
            // Create new link
            const newLink = new GoogleFormLink({
                title: title || 'Google Form Assessment',
                url,
                description: description || 'Complete this assessment form',
                createdBy: userId,
                lastModifiedBy: userId
            });

            await newLink.save();

            res.status(201).json({
                success: true,
                message: 'Google Form link created successfully',
                data: newLink
            });
        }
    } catch (error) {
        console.error('Error creating/updating Google Form link:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create/update Google Form link',
            error: error.message
        });
    }
};

// Get active Google Form link (for admin)
export const getActiveGoogleFormLink = async (req, res) => {
    try {
        const activeLink = await GoogleFormLink.findOne({ isActive: true })
            .populate('createdBy', 'username role')
            .populate('lastModifiedBy', 'username role');

        res.status(200).json({
            success: true,
            data: activeLink
        });
    } catch (error) {
        console.error('Error fetching active Google Form link:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch Google Form link',
            error: error.message
        });
    }
};

// Get active Google Form link (for public LMS website)
export const getPublicGoogleFormLink = async (req, res) => {
    try {
        const activeLink = await GoogleFormLink.findOne({ isActive: true })
            .select('title url description'); // Only return necessary fields for public use

        if (!activeLink) {
            return res.status(404).json({
                success: false,
                message: 'No active Google Form link found'
            });
        }

        res.status(200).json({
            success: true,
            data: activeLink
        });
    } catch (error) {
        console.error('Error fetching public Google Form link:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch Google Form link',
            error: error.message
        });
    }
};

// Deactivate Google Form link
export const deactivateGoogleFormLink = async (req, res) => {
    try {
        const userId = req.admin.userId;
        
        const activeLink = await GoogleFormLink.findOne({ isActive: true });
        
        if (!activeLink) {
            return res.status(404).json({
                success: false,
                message: 'No active Google Form link found'
            });
        }

        activeLink.isActive = false;
        activeLink.lastModifiedBy = userId;
        await activeLink.save();

        res.status(200).json({
            success: true,
            message: 'Google Form link deactivated successfully'
        });
    } catch (error) {
        console.error('Error deactivating Google Form link:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to deactivate Google Form link',
            error: error.message
        });
    }
};

// Get all Google Form links (for admin history)
export const getAllGoogleFormLinks = async (req, res) => {
    try {
        const links = await GoogleFormLink.find()
            .populate('createdBy', 'username role')
            .populate('lastModifiedBy', 'username role')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: links
        });
    } catch (error) {
        console.error('Error fetching all Google Form links:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch Google Form links',
            error: error.message
        });
    }
};
