import express from "express";
import { getProductReviews, addReview, deleteReview } from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:productId", getProductReviews);
router.post("/:productId", protect, addReview);
router.delete("/:id", protect, deleteReview);

export default router;
