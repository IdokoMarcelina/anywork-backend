import swaggerJsDoc from "swagger-jsdoc";

const PORT = process.env.PORT || 3000;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Anywork API",
      version: "1.0.0",
      description: "API documentation for Anywork (urgent 2k platform)",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
      },
    ],
  },
  apis: ["./src/routes/**/*.js"],
};

const swaggerSpec = swaggerJsDoc(options);

export default swaggerSpec;