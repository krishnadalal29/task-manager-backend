import { Router } from "express";
import { createTag, deleteTag, getTags } from "../controllers/tagController";
import { requireAuth } from "../middleware/authMiddleware";

const tagRouter = Router();

tagRouter.use(requireAuth);

/**
 * @swagger
 * /api/tags/getAllTags:
 *   get:
 *     summary: Get all tags for the authenticated user
 *     tags:
 *       - Tags
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's tags
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   tagName:
 *                     type: string
 *                   userId:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tags not found
 *       500:
 *         description: Internal server error
 */
tagRouter.get("/getAllTags", getTags);

/**
 * @swagger
 * /api/tags/createTag:
 *   post:
 *     summary: Create a new tag
 *     tags:
 *       - Tags
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tagName
 *             properties:
 *               tagName:
 *                 type: string
 *                 example: Work
 *     responses:
 *       201:
 *         description: Tag created successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Tag already exists
 *       404:
 *         description: Resource not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
tagRouter.post("/createTag", createTag);

/**
 * @swagger
 * /api/tags/deleteTag/{tag_id}:
 *   delete:
 *     summary: Delete a tag by ID
 *     tags:
 *       - Tags
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: tag_id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The tag ID to delete
 *     responses:
 *       201:
 *         description: Tag deleted successfully
 *       400:
 *         description: Invalid tag ID
 *       404:
 *         description: Tag not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
tagRouter.delete("/deleteTag/:tag_id", deleteTag);

export default tagRouter;
