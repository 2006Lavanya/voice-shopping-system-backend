import express from "express";
import {
  getProfile,
  updateProfile,
  getAllUsers,
  deleteUser,
  getAdminStats,
  getRecentlyViewed,
} from "../controllers/userController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.get("/recently-viewed", getRecentlyViewed);
router.get("/admin/stats", admin, getAdminStats);
router.get("/", admin, getAllUsers);
router.delete("/:id", admin, deleteUser);

export default router;
