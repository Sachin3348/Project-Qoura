const mongoose = require("mongoose");

const ObjectId = mongoose.Types.ObjectId;

const questionSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
    },
    tag: [String],
    askedBy: {
      type: ObjectId,
      ref: "User",
    },
    deletedAt: Date,
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", questionSchema);
