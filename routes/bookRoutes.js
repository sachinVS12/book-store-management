const express = require("express");
const router = express.Router();
const {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  updateInventory,
} = require("../controllers/bookController");
const { protect, authorize } = require("../middleware/authMiddleware");

router
  .route("/")
  .get(getBooks)
  .post(protect, authorize("admin", "staff"), createBook);

router
  .route("/:id")
  .get(getBookById)
  .put(protect, authorize("admin", "staff"), updateBook)
  .delete(protect, authorize("admin"), deleteBook);

router
  .route("/:id/inventory")
  .patch(protect, authorize("admin", "staff"), updateInventory);

module.exports = router;
