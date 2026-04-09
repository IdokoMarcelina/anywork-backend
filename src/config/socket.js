import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/Message.js";
import Conversation from "../models/conversation.js";
import cloudinary from "./cloudinary.js";

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // auth middleware for socket
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.token ||
      socket.handshake.query?.token;

    if (!token) return next(new Error("No token"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.id}`);

    // join user to their own room
    socket.join(socket.user.id);

    // join a conversation room
    socket.on("join_conversation", (conversationId) => {
      socket.join(conversationId);
    });

    // leave a conversation room
    socket.on("leave_conversation", (conversationId) => {
      socket.leave(conversationId);
    });

    // send a message
    socket.on("send_message", async (data) => {
      try {
        const { conversationId, text, imageBase64 } = data;

        // verify sender is part of conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.user.id,
        });

        if (!conversation) {
          socket.emit("error", { message: "Unauthorized" });
          return;
        }

        let imageUrl = null;

        // upload image to cloudinary if provided
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

        if (!text && !imageUrl) {
          socket.emit("error", { message: "Message cannot be empty" });
          return;
        }

        // save message to db
        const message = await Message.create({
          conversation: conversationId,
          sender: socket.user.id,
          text: text || null,
          image: imageUrl,
          readBy: [socket.user.id],
        });

        await message.populate("sender", "name avatar");

        // update conversation lastMessage
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          lastMessageAt: new Date(),
        });

        // emit to everyone in the conversation room
        io.to(conversationId).emit("new_message", message);

        // notify the other participant
        conversation.participants.forEach((participantId) => {
          if (participantId.toString() !== socket.user.id) {
            io.to(participantId.toString()).emit("message_notification", {
              conversationId,
              message,
            });
          }
        });

      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // typing indicator
    socket.on("typing", ({ conversationId }) => {
      socket.to(conversationId).emit("user_typing", {
        userId: socket.user.id,
        conversationId,
      });
    });

    socket.on("stop_typing", ({ conversationId }) => {
      socket.to(conversationId).emit("user_stop_typing", {
        userId: socket.user.id,
        conversationId,
      });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });

  return io;
};

export default initSocket;