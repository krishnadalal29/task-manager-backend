import { Router } from "express";
import { createTask, getTasks, deleteTask, updateTask } from "../controllers/taskController";
import { requireAuth } from "../middleware/authMiddleware";

const taskRouter = Router();

taskRouter.use(requireAuth);
taskRouter.get("/getAllTasks", getTasks);
taskRouter.post("/createTask", createTask);
taskRouter.delete("/deleteTask/:task_id", deleteTask);
taskRouter.put("/updateTask/:task_id", updateTask);


export default taskRouter;
