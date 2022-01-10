const questionModel = require("../models/questionModel");
const answerModel = require("../models/answerModel");
const userModel = require('../models/userModel')
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const isValid = function (value) {
  if (typeof value === "undefined" || value === null) return false;
  if (typeof value === "string" && value.trim().length === 0) return false;
  return true;
};


const writeAnswer = async function (req, res) {

  try {

    const requestBody = req.body
    // Extract parameters
    const { questionId, userId, text } = requestBody

    if (!Object.keys(requestBody).length > 0) {
      return res.status(400).send({
        status: false,
        message: "Invalid request parameters. Please provide answer details",
      });
    }

    if (!userId) {
      return res.status(400).send({
        status: false,
        message: "userId is required ,please provide userId",
      });
    }

    if (!ObjectId.isValid(userId)) {
      return res.status(400).send({
        status: false,
        message: `${userId} is not a valid user id`,
      });
    }

    const userDetails = await userModel.findById(userId)

    if (!userDetails) {
      return res.status(404).send({ status: false, message: `No user exist by userId ${userId}` })
    }

    if (!questionId) {
      return res.status(400).send({
        status: false,
        message: "questionId is required ,please provide questionId",
      });
    }

    if (!ObjectId.isValid(questionId)) {
      return res.status(400).send({
        status: false,
        message: `${questionId} is not a valid question id`,
      });
    }

    const question = await questionModel.findOne({_id : questionId, isDeleted: false})

    if (!question) {
      return res
        .status(404)
        .send({ status: false, message: "question not found" });
    }

    if (!isValid(text)) {
      return res.status(400).send({ status: false, message: 'Text is required' })
    }


    const tokenUserId = req.userId;

    if (tokenUserId !== userId) {
      return res
        .status(403)
        .send({ status: false, message: `Unauthorized accesss.` });
    }
  
    if(userId == question.askedBy.toString()) {
      return res.status(400).send({status : false, message : "You can't answer a question, posted by yourself"})
    }
    const answerDetails = {
      answeredBy: userId,
      questionId,
      text
    }

    const answer = await answerModel.create(answerDetails)

    userDetails['creditScore'] = userDetails['creditScore'] + 200

    await userDetails.save()

    return res.status(201).send({ status: true, data: answer })


  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
}

const getAnswer = async function (req, res) {
  try {

    const questionId = req.params.questionId

    if (!ObjectId.isValid(questionId)) {
      return res.status(400).send({
        status: false,
        message: `${questionId} is not a valid question id`,
      });
    }

    let questionDetails = await questionModel.findOne({ _id: questionId, isDeleted: false }).lean()

    if (!questionDetails) {
      return res
        .status(404)
        .send({ status: false, message: "question not found" });
    }

    let answers = await answerModel.find({ questionId })

    if (answers.length < 1) {
      return res.status(404).send({ status: false, message: 'No answer found' })
    }

    answers = answers.sort((a, b) => {
     return Date.parse(b["createdAt"]) - Date.parse(a["createdAt"])
    });

    return res.status(200).send({ status: true, data: answers })



  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
}

const updateAnswer = async function (req, res) {

  try {

    const text = req.body.text;
    const answerId = req.params.answerId;

    if (!Object.keys(req.body).length > 0) {
      return res.status(400).send({
        status: false,
        message: "Invalid request parameters. Please provide update details",
      });
    }

    if (!ObjectId.isValid(answerId)) {
      return res.status(400).send({
        status: false,
        message: `${answerId} is not a valid answerId Id`,
      });
    }

    const answer = await answerModel.findOne({
      _id: answerId,
      isDeleted: false,
    })
    if (!answer) {
      return res
        .status(404)
        .send({ status: false, message: "answer not found" });
    }
    
    answer['text'] = text

    const tokenUserId = req.userId;

    if (tokenUserId !== answer.answeredBy.toString()) {
      return res
        .status(403)
        .send({ status: false, message: `Unauthorized accesss.` });
    }
 
    const updatedAnswer = await answer.save()
   
    return res.status(200).send({status : true, data : updatedAnswer})

  } catch (error) {
    
    return res.status(500).send({ status: false, message: error.message });

  }

}

const deleteAnswer = async function (req, res) {

  try {

    const answerId = req.params.answerId
    

  if (!ObjectId.isValid(answerId)) {
    return res.status(400).send({
      status: false,
      message: `${answerId} is not a valid answer Id`,
    });
  }

  const answer = await answerModel.findOne({
    _id: answerId,
    isDeleted: false,
  });

  if (!answer) {
    return res
      .status(404)
      .send({ status: false, message: "answer not found" });
  }

  const tokenUserId = req.userId;

  if (tokenUserId !== answer.answeredBy.toString()) {
    return res
      .status(403)
      .send({ status: false, message: `Unauthorized accesss.` });
  }

  answer["isDeleted"] = true;

  await answer.save();

  return res
    .status(200)
    .send({ status: true, message: "answer deleted successfully" });
    
  } catch (error) {
    
    return res.status(500).send({ status: false, message: error.message });

  }

}

module.exports = { writeAnswer, getAnswer, updateAnswer, deleteAnswer }