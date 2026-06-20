import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "LMS API - Learning Management System",
            version: "1.0.0",
            description: "Comprehensive API documentation for the LMS system including user management, assessments, modules, training, walk-in lead management, shoe sales sync, and login analytics.",
            contact: {
                name: "LMS Development Team",
                email: "support@lms.com"
            }
        },
        servers: [
            {
                url: "https://lms-testenv-v0w5.onrender.com/",
                description: "Live Development Server",
            },
            {
                url: "http://localhost:7000/",
                description: "Local Development Server"
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "JWT token for authentication"
                },
            },
            schemas: {
                Error: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            description: "Error message"
                        },
                        status: {
                            type: "string",
                            description: "Error status"
                        }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
        tags: [
            {
                name: "Login Analytics",
                description: "User login tracking and analytics APIs"
            },
            {
                name: "User Management",
                description: "User creation, authentication, and management"
            },
            {
                name: "Assessments",
                description: "Assessment creation, assignment, and management"
            },
            {
                name: "Modules",
                description: "Module creation and management"
            },
            {
                name: "Training",
                description: "Training creation, assignment, and progress tracking"
            },
            {
                name: "Admin",
                description: "Administrative functions and settings"
            },
            {
                name: "Employee",
                description: "Employee management and data"
            },
            {
                name: "WhatsApp Integration",
                description: "WhatsApp webhook and Zoho integration APIs"
            },
            {
                name: "Auto Tasks",
                description: "Auto Task Templates — recurring schedules that generate real Task documents automatically"
            },
            {
                name: "Walkin",
                description: "Walk-in lead management API endpoints for Web Dashboard and Mobile App integrations. Supports rental (Booked/Rentout/Return/Cancelled) and shoe sales (Billed/Bill Returned) status tracking via auto-sync cron."
            },
            {
                name: "Walk-In Sync",
                description: "Cron job history for the Walk-In Auto Status Sync. The cron fetches 6 external APIs (GetBookingList, GetRentoutList, GetReturnList, GetDeleteList, GetBilledList, GetBillReturnedList) per branch every run and updates walk-in statuses independently for Rental flow and Shoe Sales flow. Use GET /api/walkin/cron-logs to view run history."
            }
        ]
    },
    apis: ["./routes/*.js", "./server.js"], // Scan route files and server.js for Swagger documentation
};

const swaggerSpec = swaggerJsdoc(options);

const setupSwagger = (app) => {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: "LMS API Documentation",
        customfavIcon: "/favicon.ico",
        swaggerOptions: {
            docExpansion: 'list',
            filter: true,
            showRequestHeaders: true,
            showCommonExtensions: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha'
        }
    }));
};

export default setupSwagger;
