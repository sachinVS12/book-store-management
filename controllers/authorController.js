const Author = require("../models/Author");
const Book = require("../models/Book");

// @desc    Get all authors
// @route   GET /api/authors
// @access  Public
const getAuthors = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const authors = await Author.find()
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort("name");

    const total = await Author.countDocuments();

    res.status(200).json({
      success: true,
      count: authors.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: authors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single author with their books
// @route   GET /api/authors/:id
// @access  Public
const getAuthorById = async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);

    if (!author) {
      return res
        .status(404)
        .json({ success: false, message: "Author not found" });
    }

    const books = await Book.find({ author: req.params.id }).select(
      "title price quantity",
    );

    res.status(200).json({
      success: true,
      data: author,
      books,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create author
// @route   POST /api/authors
// @access  Private (Admin/Staff)
const createAuthor = async (req, res) => {
  try {
    const author = await Author.create(req.body);
    res.status(201).json({ success: true, data: author });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update author
// @route   PUT /api/authors/:id
// @access  Private (Admin/Staff)
const updateAuthor = async (req, res) => {
  try {
    let author = await Author.findById(req.params.id);

    if (!author) {
      return res
        .status(404)
        .json({ success: false, message: "Author not found" });
    }

    author = await Author.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: author });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete author
// @route   DELETE /api/authors/:id
// @access  Private (Admin only)
const deleteAuthor = async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);

    if (!author) {
      return res
        .status(404)
        .json({ success: false, message: "Author not found" });
    }

    // Check if author has any books
    const booksCount = await Book.countDocuments({ author: req.params.id });
    if (booksCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete author with ${booksCount} book(s). Remove their books first.`,
      });
    }

    await author.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "Author deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAuthors,
  getAuthorById,
  createAuthor,
  updateAuthor,
  deleteAuthor,
};
