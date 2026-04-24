import express from "express";
import { changePassword, editProfile, getMe } from "../controllers/userController.js";
import authMiddleware from "../middleswares/authMiddleware.js";
import upload from "../config/multer.js"; // ← updated import

const router = express.Router();

router.put("/edit-profile", authMiddleware, upload.single("avatar"), editProfile);
router.put("/change-password", authMiddleware, changePassword);
router.get("/me", authMiddleware, getMe);
export default router;