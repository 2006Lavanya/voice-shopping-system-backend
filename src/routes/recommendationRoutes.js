import express from "express";
import {
  getRecommendations,
  trackView,
  getFrequentlyBoughtTogether,
  getSimilarProducts,
  getTrendingProducts,
  getPersonalizedProducts,
} from "../controllers/recommendationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const optionalAuth = async (req, res, next) => {
  if (req.headers.authorization) return protect(req, res, next);
  next();
};

router.get("/", optionalAuth, getRecommendations);
router.post("/track", optionalAuth, trackView);
router.get("/frequently-bought/:productId", getFrequentlyBoughtTogether);
router.get("/similar/:productId", getSimilarProducts);
router.get("/trending", getTrendingProducts);
router.get("/for-you", optionalAuth, getPersonalizedProducts);

export default router;
