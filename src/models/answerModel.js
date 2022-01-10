const mongoose = require("mongoose");

const ObjectId = mongoose.Types.ObjectId;

const answerSchema = new mongoose.Schema(
  {
    answeredBy: {
      type: ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      required: true,
    },
    questionId: {
      type: ObjectId,
      ref: "Question",
      required: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Answer", answerSchema);
