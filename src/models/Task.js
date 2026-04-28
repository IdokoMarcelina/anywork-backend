import mongoose from "mongoose";

const CATEGORIES = [
  "Cleaning",
  "Delivery",
  "Errands",
  "Handyman",
  "Tutoring",
  "Other"
];

const taskSchema = new mongoose.Schema({
  poster: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  category: { type: String, enum: CATEGORIES, required: true },
  description: { type: String, required: true },
  budget: {
    amount: { type: Number, required: true },
    type: { type: String, enum: ["fixed", "hourly"], default: "fixed" },
  },
  location: { type: String, required: true },
  deadline: { type: Date, required: false },
  status: {
    type: String,
    enum: ["open", "assigned", "ongoing", "completed"],
    default: "open",
  },
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],   // ← new
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // ← new
  rating: {
    score: { type: Number, min: 1, max: 5, default: null },
    review: { type: String, default: null },
    ratedAt: { type: Date, default: null },
  },
}, { timestamps: true });

export const TASK_CATEGORIES = CATEGORIES;
export default mongoose.model("Task", taskSchema);