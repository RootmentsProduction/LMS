import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "LMS API - Learning Management System",
            version: "1.0.0",
            description: "Comprehensive API documentation for the LMS system including user management, assessments, modules, training, and login analytics.",
            contact: {
                name: "LMS Development Team",
                email: "support@lms.com"
            }
        },
        servers: [
            {
                url: "https://lms-testenv-test.onrender.com/",
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
            }
        ]
    },
    apis: ["./routes/*.js"], // Scan all route files for Swagger documentation
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
