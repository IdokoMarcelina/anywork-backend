import express from "express";
import {
  postTask,
  getAllTasks,
  getMyPostedTasks,
  getMyAcceptedTasks,
  getCategories,
  completeTask,
  rateWorker,
  getTaskById,
  getTaskApplicants,
  applyForTask,
  assignTask,
} from "../controllers/taskController.js";
import authMiddleware from "../middleswares/authMiddleware.js";

const router = express.Router();

router.get("/categories", getCategories);

router.get("/", authMiddleware, getAllTasks);
router.post("/", authMiddleware, postTask);

router.get("/my-posted", authMiddleware, getMyPostedTasks);
router.get("/my-tasks", authMiddleware, getMyAcceptedTasks);

// ✅ IMPORTANT: specific routes FIRST
router.get("/:id/applicants", authMiddleware, getTaskApplicants);
router.put("/:id/apply", authMiddleware, applyForTask);
router.put("/:id/assign", authMiddleware, assignTask);
router.put("/:id/complete", authMiddleware, completeTask);
router.post("/:id/rate", authMiddleware, rateWorker);

// ❌ LAST: generic route
router.get("/:id", authMiddleware, getTaskById);

export default router;