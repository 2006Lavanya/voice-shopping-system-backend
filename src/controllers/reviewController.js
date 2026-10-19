import asyncHandler from "../middleware/asyncHandler.js";
import Review from "../models/Review.js";
import Product from "../models/Product.js";

const recalcProductRating = async (productId) => {
  const reviews = await Review.find({ product: productId });
  const reviewCount = reviews.length;
  const rating = reviewCount ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0;
  await Product.findByIdAndUpdate(productId, { rating: Math.round(rating * 10) / 10, reviewCount });
};

export const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId }).sort({ createdAt: -1 });
  res.json({ success: true, reviews });
});

export const addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const { productId } = req.params;

  const existing = await Review.findOne({ product: productId, user: req.user._id });
  if (existing) {
    res.status(400);
    throw new Error("You have already reviewed this product");
  }

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    userName: req.user.name,
    rating,
    comment,
  });

  await recalcProductRating(productId);
  res.status(201).json({ success: true, review });
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }
  await recalcProductRating(review.product);
  res.json({ success: true, message: "Review deleted" });
});
