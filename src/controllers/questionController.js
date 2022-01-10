const questionModel = require("../models/questionModel");
const answerModel = require("../models/answerModel");
const mongoose = require('mongoose');
const userModel = require("../models/userModel");
const ObjectId = mongoose.Types.ObjectId;
//import { map } from 'modern-async'

const isValid = function (value) {
  if (typeof value === "undefined" || value === null) return false;
  if (typeof value === "string" && value.trim().length === 0) return false;
  return true;
};

const createQuestion = async function (req, res) {
  try {
    const requestBody = req.body;

    if (!Object.keys(requestBody).length > 0) {
      return res.status(400).send({
        status: false,
        message: "Invalid request parameters. Please provide question details",
      });
    }

    // Extract parameters
    const description = requestBody.description;
    const tag = requestBody.tag;

    // Validation starts
    if (
      !description ||
      (typeof description === "string" && description.trim().length === 0)
    ) {
      return res.status(400).send({
        status: false,
        message: "Description is required, please provide question description",
      });
    }

    if (!requestBody.userId) {
      return res.status(400).send({
        status: false,
        message: "userId is required ,please provide userId",
      });
    }

    if (!ObjectId.isValid(requestBody.userId)) {
      return res.status(400).send({
        status: false,
        message: `${requestBody.userId} is not a valid user id`,
      });
    }

    const userDetails = await userModel.findById(requestBody.userId)

    if (!userDetails) {
      return res.status(404).send({ status: false, message: `No user exist by userId ${requestBody.userId}` })
    }

    if (userDetails.creditScore < 100) {
      return res.status(400).send({ status: false, message: ' Not enough credit scrore to post question, Please answer some question to increase credit score' })
    }

    const questionData = {
      description: description,
      askedBy: requestBody.userId,
      deletedAt: null,
    };

    if (tag) {
      questionData["tag"] = tag;
    }

    const tokenUserId = req.userId;

    if (tokenUserId !== requestBody.userId) {
      return res
        .status(403)
        .send({ status: false, message: `Unauthorized accesss.` });
    }


    userDetails['creditScore'] = userDetails['creditScore'] - 100
  
    if (userDetails['creditScore'] < 0) {
      userDetails['creditScore'] = 0
    }

    const a = await userDetails.save()

    const newQuestion = await questionModel.create(questionData);


    return res.status(201).send({
      status: true,
      message: `Question created successfully`,
      data: newQuestion,
    });

  } catch (error) {

    return res.status(500).send({ status: false, message: error.message });
  }
};

const getAllQuestion = async function (req, res) {
  try {
    const tag = req.query.tag;
    const sort = req.query.sort;

    let filterQuery = { isDeleted: false };

    if (isValid(tag)) {
      const tagArr = tag
        .trim()
        .split(",")
        .map((tag) => tag.trim());
      filterQuery["tag"] = { $all: tagArr };
    }

    let questions = await questionModel.find(filterQuery).lean();

    if (questions.length < 1) {
      return res
        .status(404)
        .send({ status: false, message: "No question found" });
    }

    for (let i = 0; i < questions.length; i++) {
      let answers = await answerModel
        .find({ questionId: questions[i]["_id"] })
        .lean();

        answers = answers.sort((a, b) => {
          return Date.parse(b["createdAt"]) - Date.parse(a["createdAt"])
         });
     
      questions[i]["answers"] = answers;
    }

    if (sort) {
      if (sort === "descending") {
        questions = questions.sort((a, b) => { return Date.parse(b["createdAt"]) - Date.parse(a["createdAt"])});
      }

      if (sort === "ascending") {
        questions = questions.sort((a, b) => {
         return Date.parse(a["createdAt"]) - Date.parse(b["createdAt"]);
        })
      }
    }

    return res.status(200).send({ status: true, data: questions });
  } catch (err) {

    return res.status(500).send({ status: false, message: error.message });
  }
};

const getQuestionById = async function (req, res) {
  try {
    const questionId = req.params.questionId;

    if (!ObjectId.isValid(questionId)) {
      return res.status(400).send({
        status: false,
        message: `${questionId} is not a valid Question Id`,
      });
    }

    let questionDetails = await questionModel
      .findOne({ _id: questionId, isDeleted: false })
      .lean();

    if (!questionDetails) {
      return res
        .status(404)
        .send({ status: false, message: "No question found" });
    }
    const answers = await answerModel.find({ questionId }).lean();
    questionDetails["answers"] = answers;

    return res.status(200).send({
      status: true,
      message: `Question details`,
      data: questionDetails,
    });
  } catch (error) {

    return res.status(500).send({ status: false, message: error.message });
  }
};

const updateQuestion = async function (req, res) {
  try {

    const description = req.body.description;
    const tag = req.body.tag;
    const questionId = req.params.questionId;

    if (!Object.keys(req.body).length > 0) {
      return res.status(400).send({
        status: false,
        message: "Invalid request parameters. Please provide update details",
      });
    }

    if (!ObjectId.isValid(questionId)) {
      return res.status(400).send({
        status: false,
        message: `${questionId} is not a valid Question Id`,
      });
    }

    const question = await questionModel.findOne({
      _id: questionId,
      isDeleted: false,
    })

    if (!question) {
      return res
        .status(404)
        .send({ status: false, message: "question not found" });
    }
    let updateData = {}
    if (description) {
      question["description"] = description;
    }

    if (tag) {
      if (!Object.prototype.hasOwnProperty.call(updateData, "$addToSet"))
        updateData["$addToSet"] = {};

      if (Array.isArray(tag)) {
        updateData["$addToSet"]["tag"] = { $each: [...tag] };
      }
      if (typeof tag === "string") {
        updateData["$addToSet"]["tag"] = tag;
      }
    }

    const tokenUserId = req.userId;
    const userId = question['askedBy'].toString()

    if (tokenUserId !== userId) {
      return res
        .status(403)
        .send({ status: false, message: `Unauthorized accesss.`, userId });
    }

    const updatedQuestion = await questionModel.findOneAndUpdate({ _id: questionId }, updateData, { new: true })

    return res.status(200).send({
      status: true,
      message: "Question updated successfully",
      data: updatedQuestion,
    });
  } catch (error) {

    return res.status(500).send({ status: false, message: error.message });
  }
};

const deleteQuestionById = async function (req, res) {

  try {
    const questionId = req.params.questionId;

    if (!ObjectId.isValid(questionId)) {
      return res.status(400).send({
        status: false,
        message: `${questionId} is not a valid Question Id`,
      });
    }

    const question = await questionModel.findOne({
      _id: questionId,
      isDeleted: false,
    });

    if (!question) {
      return res
        .status(404)
        .send({ status: false, message: "question not found" });
    }

    const tokenUserId = req.userId;

    if (tokenUserId !== question.askedBy.toString()) {
      return res
        .status(403)
        .send({ status: false, message: `Unauthorized accesss.` });
    }

    question["isDeleted"] = true;
    question["deletedAt"] = new Date();

    await question.save();

    return res
      .status(200)
      .send({ status: true, message: "question deleted successfully" });
  } catch (error) {

    return res.status(500).send({ status: false, message: error.message });
  }
};
module.exports = {
  createQuestion,
  getAllQuestion,
  getQuestionById,
  updateQuestion,
  deleteQuestionById,
};
