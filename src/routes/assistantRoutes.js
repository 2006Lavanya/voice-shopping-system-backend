import express from "express";
import { handleAssistantMessage } from "../controllers/assistantController.js";
import { transcribe, getCapabilities } from "../controllers/assistantStt.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Works for guests too (search / FAQ), but attaches req.user when a valid token
// is sent so cart/wishlist actions can be carried out for logged-in users.
const optionalAuth = async (req, res, next) => {
  if (req.headers.authorization) return protect(req, res, next);
  next();
};

router.post("/message", optionalAuth, handleAssistantMessage);

// Optional server-side speech-to-text (auto language detection). Disabled until STT_API_KEY is set.
router.get("/capabilities", getCapabilities);
router.post("/transcribe", express.raw({ type: () => true, limit: "10mb" }), transcribe);

export default router;
