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


// POST /api/chat/conversations/:conversationId/messages - send a message
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, imageBase64 } = req.body;
    const myId = req.user.id;

    // verify sender is part of conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: myId,
    });

    if (!conversation) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (!text && !imageBase64) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    let imageUrl = null;
    if (imageBase64) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "anywork/chat" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        stream.end(buffer);
      });
      imageUrl = uploadResult.secure_url;
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: myId,
      text: text || null,
      image: imageUrl,
      readBy: [myId],
    });

    await message.populate("sender", "name avatar");

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
    });

    // broadcast via socket for real-time delivery
    const io = req.app.get("io");
    io.to(conversationId).emit("new_message", message);
    conversation.participants.forEach((participantId) => {
      if (participantId.toString() !== myId) {
        io.to(participantId.toString()).emit("message_notification", {
          conversationId,
          message,
        });
      }
    });

    res.status(201).json({ message });
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