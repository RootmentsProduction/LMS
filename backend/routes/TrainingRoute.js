import express from 'express';
import { Training } from '../model/Traning.js';
import { MiddilWare } from '../lib/middilWare.js';

const router = express.Router();

/**
 * @swagger
 * /api/training/details/{id}:
 *   get:
 *     tags: [Training]
 *     summary: Get training details with both deadline formats
 *     description: Retrieves training details showing both original days and calculated deadline date
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Training ID
 *     responses:
 *       200:
 *         description: Training details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trainingName:
 *                   type: string
 *                 deadline:
 *                   type: number
 *                   description: Original deadline in days
 *                 deadlineDate:
 *                   type: string
 *                   format: date-time
 *                   description: Calculated deadline date
 *                 createdDate:
 *                   type: string
 *                   format: date-time
 *                 daysRemaining:
 *                   type: number
 *                   description: Days remaining until deadline
 *       404:
 *         description: Training not found
 *       500:
 *         description: Internal server error
 */
router.get('/details/:id', MiddilWare, async (req, res) => {
  try {
    const { id } = req.params;
    
    const training = await Training.findById(id).populate('modules');
    
    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }
    
    // Calculate days remaining if deadlineDate exists
    let daysRemaining = null;
    if (training.deadlineDate) {
      const now = new Date();
      const deadlineDate = new Date(training.deadlineDate);
      const timeDiff = deadlineDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
    
    // Format response
    const response = {
      success: true,
      message: 'Training details retrieved successfully',
      data: {
        _id: training._id,
        trainingName: training.trainingName,
        description: training.description,
        modules: training.modules,
        numberOfModules: training.numberOfModules,
        
        // Original deadline data
        originalDeadlineDays: training.deadline,
        
        // New calculated deadline data
        deadlineDate: training.deadlineDate || null,
        
        // Metadata
        createdDate: training.createdDate,
        editedDate: training.editedDate,
        Trainingtype: training.Trainingtype,
        Assignedfor: training.Assignedfor,
        
        // Calculated fields
        daysRemaining: daysRemaining,
        isOverdue: daysRemaining !== null ? daysRemaining < 0 : null,
        
        // Summary for debugging
        summary: {
          hasDeadlineDays: typeof training.deadline === 'number',
          hasDeadlineDate: training.deadlineDate !== null && training.deadlineDate !== undefined,
          creationDate: new Date(training.createdDate).toLocaleDateString(),
          calculatedDeadline: training.deadlineDate ? new Date(training.deadlineDate).toLocaleDateString() : null
        }
      }
    };
    
    console.log('📋 Training details:', {
      name: training.trainingName,
      deadlineDays: training.deadline,
      deadlineDate: training.deadlineDate,
      daysRemaining: daysRemaining
    });
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ Error fetching training details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.making
    });
  }
});

/**
 * @swagger
 * /api/training/test-deadline-logic:
 *   get:
 *     tags: [Training]
 *     summary: Test deadline logic with sample data
 *     description: Shows how deadline calculation works with example data
 *     responses:
 *       200:
 *         description: Deadline logic explanation
 */
router.get('/test-deadline-logic', async (req, res) => {
  try {
    const now = new Date();
    const exampleCreatedDate = '2025-10-03T10:30:00Z';
    const exampleDays = 2;
    
    // Calculate deadline date
    const deadlineDateCalculated = new Date(
      new Date(exampleCreatedDate).getTime() + exampleDays * 24 * 60 * 60 * 1000
    );
    
    const response = {
      success: true,
      message: 'Deadline logic demonstration',
      example: {
        scenario: 'Admin creates training on Oct 3, 2025 with 2-day deadline',
        input: {
          createdDate: exampleCreatedDate,
          deadlineInDays: exampleDays
        },
        calculation: {
          createdDateObject: new Date(exampleCreatedDate),
          millisecondsToAdd: exampleDays * 24 * 60 * 60 * 1000,
          calculatedDeadlineDate: deadlineDateCalculated.toISOString()
        },
        results: {
          deadline: exampleDays,
          deadlineDate: deadlineDateCalculated.toISOString(),
          deadlineFormatted: deadlineDateCalculated.toLocaleDateString('en-US'),
          currentDate: now.toISOString(),
          currentDateFormatted: now.toLocaleDateString('en-US'),
          isOverdue: now > deadlineDateCalculated,
          daysRemaining: Math.ceil((deadlineDateCalculated - now) / (1000 * 3600 * 24))
        }
      },
      databaseSchema: {
        trainings: {
          deadline: 'Number - Original days input (kept for compatibility)',
          deadlineDate: 'Date - Calculated deadline date (new field)'
        },
        explanation: 'Both fields are stored so you can see the original input and the calculated result'
      }
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ Error in test endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;
