import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import cloudinary from "../config/cloudinary.js";

// GET /api/chat/conversations - get all conversations for logged in user
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id,
    })
      .populate("participants", "name avatar")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1 });

    if (conversations.length === 0) {
      return res.json({ message: "No conversations yet" });
    }

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// POST /api/chat/conversations/:userId - start or get existing conversation with a user
export const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user.id;

    if (userId === myId) {
      return res.status(400).json({ message: "You cannot message yourself" });
    }

    // check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [myId, userId] },
    })
      .populate("participants", "name avatar")
      .populate("lastMessage");

    // create if not exists
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [myId, userId],
      });
      conversation = await conversation.populate("participants", "name avatar");
    }

    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// GET /api/chat/conversations/:conversationId/messages - get messages in a conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const myId = req.user.id;

    // verify user is part of this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: myId,
    });

    if (!conversation) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "name avatar")
      .sort({ createdAt: 1 });

    // mark messages as read
    await Message.updateMany(
      { conversation: conversationId, readBy: { $ne: myId } },
      { $addToSet: { readBy: myId } }
    );

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// GET /api/chat/unread - get unread message count
export const getUnreadCount = async (req, res) => {
  try {
    const myId = req.user.id;

    const count = await Message.countDocuments({
      readBy: { $ne: myId },
      sender: { $ne: myId },
      conversation: {
        $in: await Conversation.find({ participants: myId }).distinct("_id"),
      },
    });

    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};