import mongoose from "mongoose";

const CATEGORIES = ["Cleaning", "Delivery", "Errands", "Handy Work", "Shopping", "Moving", "Tutoring", "Other"];

const taskSchema = new mongoose.Schema({
  poster: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  category: { type: String, enum: CATEGORIES, required: true },
  description: { type: String, required: true },
  budget: {
    amount: { type: Number, required: true },
    type: { type: String, enum: ["Fixed", "Hourly"], default: "Fixed" },
  },
  location: { type: String, required: true },
  deadline: { type: Date, required: true },
  status: { type: String, enum: ["open", "taken", "completed"], default: "open" },
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rating: {
    score: { type: Number, min: 1, max: 5, default: null },
    review: { type: String, default: null },
    ratedAt: { type: Date, default: null },
  },
}, { timestamps: true });

export const TASK_CATEGORIES = CATEGORIES;
export default mongoose.model("Task", taskSchema);