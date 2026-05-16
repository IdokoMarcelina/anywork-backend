import express from "express";
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getUnreadCount,
} from "../controllers/chatController.js";
import authMiddleware from "../middleswares/authMiddleware.js";

const router = express.Router();

router.get("/conversations", authMiddleware, getConversations);
router.post("/conversations/:userId", authMiddleware, getOrCreateConversation);
router.get("/conversations/:conversationId/messages", authMiddleware, getMessages);
router.post("/conversations/:conversationId/messages", authMiddleware, sendMessage);
router.get("/unread", authMiddleware, getUnreadCount);

export default router;