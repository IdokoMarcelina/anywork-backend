import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { createServer } from "http"; // ← add this
import connectDB from "./src/config/connectDb.js";
// import swaggerUi from "swagger-ui-express";
// import swaggerSpec from "./src/config/swagger.js";


import authRoute from "./src/routes/authRoute.js"
import editRoute from "./src/routes/editRoute.js"
import taskRoute from "./src/routes/taskRoute.js";
import chatRoute from "./src/routes/chatRoute.js"; 
import initSocket from "./src/config/socket.js"; 

import { configureCloudinary } from "./src/config/cloudinary.js";

connectDB();
configureCloudinary();

const app = express();
const httpServer = createServer(app); // ← wrap express in http server
initSocket(httpServer);    

app.use(cors());
app.use(express.json({ limit: "10mb" })); // ← increase limit for base64 images

// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


app.use("/api/auth", authRoute);
app.use("/api/edit", editRoute);
app.use("/api/tasks", taskRoute);
app.use("/api/chat", chatRoute);   

const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

httpServer.listen(PORT, () => {                           
  console.log(`Server running on port ${PORT}`);
});