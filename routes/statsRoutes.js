// backend/routes/statsRoutes.js
import express from "express";
import { getStats } from "../controllers/statsController.js";
import { authAdmin } from "../middleware/authAdmin.js";

const router = express.Router();

// Get comprehensive statistics (admin only)
router.get("/", authAdmin, getStats);

export default router;

