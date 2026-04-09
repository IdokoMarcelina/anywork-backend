import express from "express";
import {
  postTask,
  getAllTasks,
  getMyPostedTasks,
  getMyAcceptedTasks,
  acceptTask,
  getCategories,
  completeTask,
  rateWorker,
} from "../controllers/taskController.js";
import authMiddleware from "../middleswares/authMiddleware.js";

const router = express.Router();

router.get("/categories", getCategories);                         
router.get("/", getAllTasks);                                      
router.post("/", authMiddleware, postTask);                       
router.get("/my-posted", authMiddleware, getMyPostedTasks);       
router.get("/my-tasks", authMiddleware, getMyAcceptedTasks);      
router.put("/:id/accept", authMiddleware, acceptTask);     
router.put("/:id/complete", authMiddleware, completeTask);         
router.post("/:id/rate", authMiddleware, rateWorker);         

export default router;