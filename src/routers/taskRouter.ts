import { Router } from "express";
import { createTask, getTasks, deleteTask, updateTask } from "../controllers/taskController";
import { requireAuth } from "../middleware/authMiddleware";

const taskRouter = Router();

taskRouter.use(requireAuth);

/**
 * @swagger
 * /api/tasks/getAllTasks:
 *   get:
 *     summary: Get all tasks for the authenticated user
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   taskName:
 *                     type: string
 *                   description:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         tagName:
 *                           type: string
 *                         userId:
 *                           type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tasks not found
 *       500:
 *         description: Internal server error
 */
taskRouter.get("/getAllTasks", getTasks);

/**
 * @swagger
 * /api/tasks/createTask:
 *   post:
 *     summary: Create a new task
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskName
 *             properties:
 *               taskName:
 *                 type: string
 *                 example: Buy groceries
 *               description:
 *                 type: string
 *                 example: Milk, bread, eggs
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["507f1f77bcf86cd799439011"]
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 *       500:
 *         description: Internal server error
 */
taskRouter.post("/createTask", createTask);

/**
 * @swagger
 * /api/tasks/deleteTask/{task_id}:
 *   delete:
 *     summary: Delete a task by ID
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: task_id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The task ID to delete
 *     responses:
 *       201:
 *         description: Task deleted successfully
 *       400:
 *         description: Invalid task ID
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
taskRouter.delete("/deleteTask/:task_id", deleteTask);

/**
 * @swagger
 * /api/tasks/updateTask/{task_id}:
 *   put:
 *     summary: Update a task
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: task_id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The task ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskName:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
taskRouter.put("/updateTask/:task_id", updateTask);


export default taskRouter;
