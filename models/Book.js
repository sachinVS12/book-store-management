const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Book title is required"],
      trim: true,
      index: true,
    },
    isbn: {
      type: String,
      required: [true, "ISBN is required"],
      unique: true,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Author",
      required: [true, "Author is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Fiction",
        "Non-Fiction",
        "Science",
        "Technology",
        "History",
        "Biography",
        "Children",
      ],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    publishedYear: {
      type: Number,
      required: [true, "Published year is required"],
      min: [1000, "Invalid year"],
      max: [new Date().getFullYear(), "Year cannot be in the future"],
    },
  },
  {
    timestamps: true,
  },
);

// Index for search functionality
bookSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Book", bookSchema);
