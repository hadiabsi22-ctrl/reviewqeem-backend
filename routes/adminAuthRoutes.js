import express from "express";
import {
    loginAdmin,
    verifyToken,
    logout,
    getAdminProfile
} from "../controllers/adminAuthController.js";

const router = express.Router();

router.post("/auth/login", loginAdmin);

router.get("/auth/verify", verifyToken);

router.post("/auth/logout", logout);

router.get("/auth/profile", verifyToken, getAdminProfile);

export default router;
