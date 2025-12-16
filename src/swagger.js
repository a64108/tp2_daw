import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "TP2 IPMA API",
      version: "1.0.0",
      description: "API local que armazena e expõe previsões do IPMA (SQLite + Prisma).",
    },
    servers: [{ url: "http://localhost:3000" }],
  },
  apis: ["./src/app.js"],
});
