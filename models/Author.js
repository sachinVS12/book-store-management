const mongoose = require("mongoose");

const authorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Author name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    bio: {
      type: String,
      maxlength: [1000, "Bio cannot exceed 1000 characters"],
    },
    nationality: {
      type: String,
      required: [true, "Nationality is required"],
    },
    birthYear: {
      type: Number,
      required: [true, "Birth year is required"],
      min: [1000, "Invalid year"],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Author", authorSchema);
