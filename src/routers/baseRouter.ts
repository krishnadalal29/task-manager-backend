import { Router } from "express";
import tagRouter from "./tagRouter";
import taskRouter from "./taskRouter";
import authRouter from "./authRouter";

const router = Router();

router.use("/auth", authRouter);
router.use("/tags", tagRouter);
router.use("/tasks", taskRouter);

export default router;
