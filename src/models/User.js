import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Password is optional because users who sign up via Google OAuth never set one.
    password: { type: String, minlength: 6, select: false },
    googleId: { type: String, unique: true, sparse: true },
    authProvider: { type: String, enum: ["LOCAL", "GOOGLE"], default: "LOCAL" },
    phone: { type: String, default: "" },
    profileImage: { type: String, default: "https://api.dicebear.com/7.x/initials/svg?seed=User" },
    role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    browsingHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    preferredVoiceLanguage: { type: String, default: "en-US" },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false; // Google-only account, no local password set
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
