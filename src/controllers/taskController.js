import Task, { TASK_CATEGORIES } from "../models/Task.js";
import User from "../models/User.js";

/// ================= POST TASK =================
export const postTask = async (req, res) => {
  try {
    const { category, description, budget, location, deadline } = req.body;
    const userId = req.user.id;

    if (!TASK_CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: "Invalid category",
        validCategories: TASK_CATEGORIES,
      });
    }

    if (!budget?.amount || !budget?.type) {
      return res
        .status(400)
        .json({ message: "Budget amount and type are required" });
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

    res.status(201).json({
      message: "Task posted successfully",
      task,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/// ================= GET ALL TASKS =================
export const getAllTasks = async (req, res) => {
  try {
    const { category, status } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const tasks = await Task.find(filter)
      .populate("poster", "name avatar")
      .populate("assignedTo", "name avatar") // ✅ FIXED
      .sort({ createdAt: -1 });

    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/// ================= MY POSTED TASKS =================
export const getMyPostedTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ poster: req.user.id })
      .populate("assignedTo", "name avatar") // ✅ FIXED
      .sort({ createdAt: -1 });

    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/// ================= MY ASSIGNED TASKS =================
export const getMyAcceptedTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.id }) // ✅ FIXED
      .populate("poster", "name avatar")
      .sort({ createdAt: -1 });

    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/// ================= COMPLETE TASK =================
export const completeTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.poster.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only the poster can complete this task" });
    }

    if (task.status !== "ongoing") {
      return res
        .status(400)
        .json({ message: "Task must be ongoing to complete" });
    }

    task.status = "completed";
    await task.save();

    res.json({
      message: "Task marked as completed",
      task,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/// ================= RATE WORKER =================
export const rateWorker = async (req, res) => {
  try {
    const { score, review } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.poster.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (task.status !== "completed") {
      return res
        .status(400)
        .json({ message: "Task must be completed before rating" });
    }

    if (!task.assignedTo) {
      return res.status(400).json({ message: "No worker assigned" });
    }

    // save rating
    task.rating.score = score;
    task.rating.review = review || null;
    task.rating.ratedAt = new Date();
    await task.save();

    // update worker rating
    const worker = await User.findById(task.assignedTo); // ✅ FIXED

    const total = worker.rating.average * worker.rating.count;
    const newCount = worker.rating.count + 1;
    const newAverage = (total + score) / newCount;

    worker.rating.average = Math.round(newAverage * 10) / 10;
    worker.rating.count = newCount;

    await worker.save();

    res.json({
      message: "Worker rated successfully",
      rating: task.rating,
      workerOverallRating: worker.rating,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/// ================= APPLY FOR TASK =================
export const applyForTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.status !== "open") {
      return res.status(400).json({ message: "Task is no longer open" });
    }

    const alreadyApplied = task.applicants.some(
      (id) => id.toString() === req.user.id
    );

    if (alreadyApplied) {
      return res.status(400).json({ message: "Already applied" });
    }

    task.applicants.push(req.user.id);
    await task.save();

    res.json({
      message: "Applied successfully",
      hasApplied: true,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/// ================= ASSIGN TASK =================
export const assignTask = async (req, res) => {
  try {
    const { applicantId } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.poster.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    task.status = "assigned";
    task.assignedTo = applicantId;

    await task.save();

    res.json({
      message: "Task assigned successfully",
      task,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/// ================= GET TASK BY ID =================
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("poster", "name avatar")
      .populate("assignedTo", "name avatar");

    if (!task) return res.status(404).json({ message: "Task not found" });

    const hasApplied = task.applicants.some(
      (id) => id.toString() === req.user.id
    );

    res.json({
      ...task.toObject(),
      hasApplied,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/// ================= GET APPLICANTS =================
export const getTaskApplicants = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate(
      "applicants",
      "name email phone"
    );

    if (!task) return res.status(404).json({ message: "Task not found" });

    res.json({ applicants: task.applicants });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/// ================= CATEGORIES =================
export const getCategories = async (req, res) => {
  res.json({ categories: TASK_CATEGORIES });
};