import { Router } from "express";
import { createTag, deleteTag, getTags } from "../controllers/tagController";
import { requireAuth } from "../middleware/authMiddleware";

const tagRouter = Router();

tagRouter.use(requireAuth);
tagRouter.get("/getAllTags", getTags);
tagRouter.post("/createTag", createTag);
tagRouter.delete("/deleteTag/:tag_id", deleteTag);

export default tagRouter;
