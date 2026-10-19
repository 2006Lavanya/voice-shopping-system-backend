import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import Cart from "../models/Cart.js";
import Wishlist from "../models/Wishlist.js";
import Order from "../models/Order.js";

import { categories as baseCategories, products as baseProducts } from "./baseData.js";
import { extraCategories, buildExtraProducts } from "./extraProducts.js";
import { moreCategories, buildMoreProducts } from "./moreProducts.js";
import { productImage, categoryPhotoUrl, ensureUniqueImages } from "./imageGen.js";

// Categories without a photo get a real photo (or an offline drawing if IMAGE_SOURCE=generated) so the Home grid is never blank.
const categories = [...baseCategories, ...extraCategories, ...moreCategories].map((c) => ({
  ...c,
  image: c.image || (String(process.env.IMAGE_SOURCE).toLowerCase() === "generated" ? productImage({ name: c.name, brand: "Shop by category", category: c.name }) : categoryPhotoUrl(c.name)),
}));

const products = ensureUniqueImages([...baseProducts, ...buildExtraProducts(), ...buildMoreProducts()]);

const seed = async () => {
  await connectDB();

  console.log("Clearing existing data...");
  await Promise.all([
    User.deleteMany(),
    Category.deleteMany(),
    Product.deleteMany(),
    Review.deleteMany(),
    Cart.deleteMany(),
    Wishlist.deleteMany(),
    Order.deleteMany(),
  ]);

  console.log("Seeding categories...");
  await Category.insertMany(categories);

  console.log("Seeding products...");
  const insertedProducts = await Product.insertMany(products);

  console.log("Seeding users...");
  const admin = await User.create({
    name: "Admin",
    email: process.env.SEED_ADMIN_EMAIL || "admin@voiceshop.com",
    password: process.env.SEED_ADMIN_PASSWORD || "Admin@12345",
    role: "ADMIN",
    phone: "9999999999",
  });

  const demoUser = await User.create({
    name: "Demo User",
    email: process.env.SEED_USER_EMAIL || "demo@voiceshop.com",
    password: process.env.SEED_USER_PASSWORD || "Demo@12345",
    role: "USER",
    phone: "8888888888",
    browsingHistory: [insertedProducts[1]._id, insertedProducts[6]._id, insertedProducts[10]._id],
  });

  // 4 more distinct customer accounts, so there are at least 5 working user
  // logins in total (demoUser + these 4) to demonstrate multi-user auth.
  const extraCustomers = [
    { name: "Ananya Rajan", email: "ananya@voiceshop.com", password: "Ananya@123", phone: "9000000001" },
    { name: "Karthik Subramanian", email: "karthik@voiceshop.com", password: "Karthik@123", phone: "9000000002" },
    { name: "Priya Menon", email: "priya@voiceshop.com", password: "Priya@123", phone: "9000000003" },
    { name: "Rahul Verma", email: "rahul@voiceshop.com", password: "Rahul@123", phone: "9000000004" },
  ];
  const createdCustomers = [];
  for (const c of extraCustomers) {
    const user = await User.create({ ...c, role: "USER" });
    await Cart.create({ user: user._id, items: [] });
    await Wishlist.create({ user: user._id, products: [] });
    createdCustomers.push(user);
  }

  await Cart.create({ user: admin._id, items: [] });
  await Cart.create({ user: demoUser._id, items: [] });
  await Wishlist.create({ user: admin._id, products: [] });
  await Wishlist.create({ user: demoUser._id, products: [insertedProducts[0]._id, insertedProducts[5]._id] });

  console.log("Seeding reviews...");
  const reviewComments = [
    "Great product, exactly as described. Fast delivery and good quality!",
    "Really happy with this purchase. Works perfectly and looks premium.",
    "Good value for the price. Would recommend to a friend.",
    "Quality is decent but delivery took a bit longer than expected.",
    "Excellent! Exceeded my expectations, will buy again.",
    "Does the job well. Packaging was neat and secure.",
    "Better than I thought it would be for this price range.",
    "Solid build quality. A few minor issues but overall satisfied.",
  ];
  const reviewers = [demoUser, ...createdCustomers];
  const reviewDocs = [];
  insertedProducts.slice(0, 20).forEach((p, idx) => {
    const reviewer = reviewers[idx % reviewers.length];
    reviewDocs.push({
      product: p._id,
      user: reviewer._id,
      userName: reviewer.name,
      rating: 3 + Math.round(Math.random() * 2), // 3-5 stars, never a bland flat rating
      comment: reviewComments[idx % reviewComments.length],
    });
  });
  await Review.insertMany(reviewDocs);
  // Recompute each reviewed product's average rating/reviewCount from the real review data
  for (const p of insertedProducts.slice(0, 20)) {
    const productReviews = reviewDocs.filter((r) => r.product.toString() === p._id.toString());
    if (productReviews.length) {
      const avg = productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length;
      await Product.findByIdAndUpdate(p._id, {
        rating: Math.round((p.rating * 0.6 + avg * 0.4) * 10) / 10,
        reviewCount: p.reviewCount + productReviews.length,
      });
    }
  }

  console.log("\n✅ Seed complete!");
  console.log(`   Admin login   -> ${admin.email} / ${process.env.SEED_ADMIN_PASSWORD || "Admin@12345"}`);
  console.log(`   Customer 1    -> ${demoUser.email} / ${process.env.SEED_USER_PASSWORD || "Demo@12345"}`);
  extraCustomers.forEach((c, i) => console.log(`   Customer ${i + 2}    -> ${c.email} / ${c.password}`));
  console.log(`   Categories    -> ${categories.length}`);
  console.log(`   Products      -> ${insertedProducts.length}`);

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
