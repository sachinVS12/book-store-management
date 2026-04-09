const express = require("express");
const router = express.Router();
const {
  getAuthors,
  getAuthorById,
  createAuthor,
  updateAuthor,
  deleteAuthor,
} = require("../controllers/authorController");
const { protect, authorize } = require("../middleware/authMiddleware");

router
  .route("/")
  .get(getAuthors)
  .post(protect, authorize("admin", "staff"), createAuthor);

router
  .route("/:id")
  .get(getAuthorById)
  .put(protect, authorize("admin", "staff"), updateAuthor)
  .delete(protect, authorize("admin"), deleteAuthor);

module.exports = router;
