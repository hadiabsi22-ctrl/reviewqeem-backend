import express from "express";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { authAdmin } from "../middleware/authAdmin.js";

const router = express.Router();

/**
 * 🟦 GET /api/settings
 * جلب الإعدادات (محمية)
 */
router.get("/", authAdmin, getSettings);

/**
 * 🟩 PUT /api/settings
 * تحديث الإعدادات (محمية)
 */
router.put("/", authAdmin, updateSettings);

export default router;
