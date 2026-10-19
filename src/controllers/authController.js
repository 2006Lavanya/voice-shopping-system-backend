import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import asyncHandler from "../middleware/asyncHandler.js";
import User from "../models/User.js";
import Cart from "../models/Cart.js";
import Wishlist from "../models/Wishlist.js";

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

const sanitize = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  profileImage: user.profileImage,
  role: user.role,
  authProvider: user.authProvider,
  preferredVoiceLanguage: user.preferredVoiceLanguage,
});

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

// @route POST /api/auth/register
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email and password are required");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400);
    throw new Error("An account with this email already exists");
  }

  const user = await User.create({ name, email, password, phone });

  // create empty cart & wishlist for the new user
  await Cart.create({ user: user._id, items: [] });
  await Wishlist.create({ user: user._id, products: [] });

  res.status(201).json({
    success: true,
    token: generateToken(user._id),
    user: sanitize(user),
  });
});

// @route POST /api/auth/login
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.json({
    success: true,
    token: generateToken(user._id),
    user: sanitize(user),
  });
});

// @route POST /api/auth/google
// Real OAuth 2.0 sign-in: the frontend uses Google Identity Services to get an ID token
// from Google directly (the user authenticates on accounts.google.com, never with us),
// then sends that token here. We verify it with Google's own library - we never see or
// store the user's Google password, which is the whole point of OAuth.
export const googleLogin = asyncHandler(async (req, res) => {
  if (!googleClient) {
    res.status(503);
    throw new Error(
      "Google sign-in is not configured on this server. Set GOOGLE_CLIENT_ID in backend/.env to enable it."
    );
  }

  const { credential } = req.body;
  if (!credential) {
    res.status(400);
    throw new Error("Missing Google credential token");
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    res.status(401);
    throw new Error("Google sign-in verification failed. Please try again.");
  }

  const { sub: googleId, email, name, picture } = payload;

  let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

  if (!user) {
    user = await User.create({
      name: name || email.split("@")[0],
      email,
      googleId,
      authProvider: "GOOGLE",
      profileImage: picture || undefined,
    });
    await Cart.create({ user: user._id, items: [] });
    await Wishlist.create({ user: user._id, products: [] });
  } else if (!user.googleId) {
    // An account with this email already existed via normal signup - link it to Google.
    user.googleId = googleId;
    user.authProvider = "GOOGLE";
    await user.save();
  }

  res.json({
    success: true,
    token: generateToken(user._id),
    user: sanitize(user),
  });
});

// @route GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: sanitize(req.user) });
});

// @route POST /api/auth/forgot-password
// Simplified flow suitable for a demo/college project: generates a reset token
// and returns it directly in the response instead of requiring a live email server.
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });
  if (!user) {
    res.status(404);
    throw new Error("No account found with that email");
  }

  const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
  await user.save();

  res.json({
    success: true,
    message: "Password reset token generated. In production this would be emailed to the user.",
    resetToken, // exposed here only so the demo app can complete the flow without an email server
  });
});

// @route POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    res.status(400);
    throw new Error("Token and new password are required");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(400);
    throw new Error("Reset token is invalid or has expired");
  }

  const user = await User.findOne({
    _id: decoded.id,
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Reset token is invalid or has expired");
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ success: true, message: "Password has been reset successfully" });
});
