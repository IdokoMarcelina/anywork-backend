import Task, { TASK_CATEGORIES } from "../models/Task.js";
import User from "../models/User.js";

// POST /api/tasks - post a task
export const postTask = async (req, res) => {
  try {
    const { category, description, budget, location, deadline } = req.body;
    const userId = req.user.id;

    if (!TASK_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category", validCategories: TASK_CATEGORIES });
    }

    if (!budget?.amount || !budget?.type) {
      return res.status(400).json({ message: "Budget amount and type are required" });
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


// GET /api/tasks - get all tasks (all tasks page)
export const getAllTasks = async (req, res) => {
  try {
    const { category, status } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const tasks = await Task.find(filter)
      .populate("poster", "name avatar")
      .populate("acceptedBy", "name avatar")
      .sort({ createdAt: -1 });

    res.json({ tasks });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// GET /api/tasks/my-posted - get all tasks posted by logged in user
export const getMyPostedTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ poster: req.user.id })
      .populate("acceptedBy", "name avatar")
      .sort({ createdAt: -1 });

    if (tasks.length === 0) {
      return res.json({ message: "No tasks found" });
    }

    res.json({ tasks });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// GET /api/tasks/my-tasks - get all tasks accepted by logged in user
export const getMyAcceptedTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ acceptedBy: req.user.id })
      .populate("poster", "name avatar")
      .sort({ createdAt: -1 });

    if (tasks.length === 0) {
      return res.json({ message: "No tasks found" });
    }

    res.json({ tasks });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// PUT /api/tasks/:id/accept - accept a task
export const acceptTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status === "taken" || task.status === "ongoing") {
      return res.status(400).json({ message: "Task has already been taken" });
    }

    if (task.poster.toString() === req.user.id) {
      return res.status(400).json({ message: "You cannot accept your own task" });
    }

    task.status = "ongoing";
    task.acceptedBy = req.user.id;
    await task.save();

    await task.populate("poster", "name avatar");
    await task.populate("acceptedBy", "name avatar");

    res.json({
      message: "Task accepted successfully",
      task,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// GET /api/tasks/categories - get all categories
export const getCategories = async (req, res) => {
  res.json({ categories: TASK_CATEGORIES });
};


// PUT /api/tasks/:id/complete - poster marks task as completed
export const completeTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // only the poster can mark as completed
    if (task.poster.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the task poster can mark it as completed" });
    }

    if (task.status !== "ongoing") {
      return res.status(400).json({ message: "Task must be ongoing to mark as completed" });
    }

    task.status = "completed";
    await task.save();

    res.json({
      message: "Task marked as completed. You can now rate the worker",
      task,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// POST /api/tasks/:id/rate - poster rates the worker
export const rateWorker = async (req, res) => {
  try {
    const { score, review } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // only the poster can rate
    if (task.poster.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the task poster can rate the worker" });
    }

    if (task.status !== "completed") {
      return res.status(400).json({ message: "Task must be completed before rating" });
    }

    if (task.rating.score !== null) {
      return res.status(400).json({ message: "You have already rated this task" });
    }

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ message: "Score must be between 1 and 5" });
    }

    // save rating on task
    task.rating.score = score;
    task.rating.review = review || null;
    task.rating.ratedAt = new Date();
    await task.save();

    // update worker's overall rating
    const worker = await User.findById(task.acceptedBy);
    const currentTotal = worker.rating.average * worker.rating.count;
    const newCount = worker.rating.count + 1;
    const newAverage = (currentTotal + score) / newCount;

    worker.rating.average = Math.round(newAverage * 10) / 10; // 1 decimal e.g 4.5
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


// GET /api/tasks/ongoing - get ongoing tasks for logged in user (acceptedBy)
export const getOngoingTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      acceptedBy: req.user.id,
      status: "ongoing",
    }).populate("poster", "name avatar").sort({ createdAt: -1 });

    if (tasks.length === 0) {
      return res.json({ message: "No ongoing tasks" });
    }

    res.json({ tasks });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// GET /api/tasks/completed - get completed tasks for logged in user with ratings
export const getCompletedTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      acceptedBy: req.user.id,
      status: "completed",
    }).populate("poster", "name avatar").sort({ createdAt: -1 });

    if (tasks.length === 0) {
      return res.json({ message: "No completed tasks" });
    }

    res.json({ tasks });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};