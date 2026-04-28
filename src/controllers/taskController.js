import Task, { TASK_CATEGORIES } from "../models/Task.js";
import User from "../models/User.js";

/* =========================
   POST TASK (FIXED)
========================= */
export const postTask = async (req, res) => {
  try {
    let { category, description, budget, location, deadline } = req.body;
    const userId = req.user.id;

    // ✅ normalize enum mismatch (FIX)
    if (budget?.type) {
      budget.type = budget.type.toLowerCase();
    }

    if (!TASK_CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: "Invalid category",
        validCategories: TASK_CATEGORIES,
      });
    }

    if (!budget?.amount || !budget?.type) {
      return res.status(400).json({
        message: "Budget amount and type are required",
      });
    }

    const task = await Task.create({
      poster: userId,
      category,
      description,
      budget,
      location,
      deadline,
    });

    await task.populate("poster", "name avatar");

    return res.status(201).json({
      message: "Task posted successfully",
      task,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* =========================
   GET ALL TASKS (FIXED POPULATE SAFETY)
========================= */
export const getAllTasks = async (req, res) => {
  try {
    const { category, status } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const tasks = await Task.find(filter)
      .populate("poster", "name avatar")
      .populate("assignedTo", "name avatar") // ✅ FIX instead of acceptedBy
      .sort({ createdAt: -1 });

    return res.json({ tasks });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* =========================
   APPLY FOR TASK (FIXED FLOW)
========================= */
export const applyForTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status !== "open") {
      return res.status(400).json({ message: "Task is no longer open" });
    }

    const userId = req.user.id;

    const alreadyApplied = task.applicants.some(
      (id) => id.toString() === userId
    );

    // ✅ treat as success (important UX fix)
    if (alreadyApplied) {
      return res.status(200).json({
        message: "Already applied",
        hasApplied: true,
        taskId: task._id,
      });
    }

    task.applicants.push(userId);
    await task.save();

    return res.status(200).json({
      message: "Applied successfully",
      hasApplied: true,
      taskId: task._id,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* =========================
   ASSIGN TASK (FIXED FLOW)
========================= */
export const assignTask = async (req, res) => {
  try {
    const { applicantId } = req.body;

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.poster.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    task.status = "assigned";
    task.assignedTo = applicantId;

    await task.save();

    return res.json({
      message: "Task assigned successfully",
      task,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};