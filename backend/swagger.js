import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "LMS API",
            version: "1.0.0",
        },
        servers: [
            {
                url: "https://lms-testenv.onrender.com/", // Change this to your actual API URL
                description: "Live Development Server",
            },
            {
                url: "http://localhost:7000/",
                description: "local Host"
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ["./routes/*.js"], // or wherever your route files are
};



const swaggerSpec = swaggerJsdoc(options);

const setupSwagger = (app) => {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

export default setupSwagger; // ✅ Use ES module export
