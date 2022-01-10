const express = require('express')
const router = express.Router()

const userController = require('../controllers/userController')
const questionController = require('../controllers/questionController')
const answerController = require('../controllers/answerController')


const authMiddleware = require('../middlewares/authentication')

// User routes
router.post('/register', userController.register)
router.post('/login', userController.login)
router.get('/user/:userId/profile', authMiddleware, userController.getUserProfile)
router.put('/user/:userId/profile', authMiddleware, userController.updateUserProfile)

//Question routes
router.post('/question', authMiddleware, questionController.createQuestion)
router.get('/questions',  questionController.getAllQuestion)
router.get('/questions/:questionId', questionController.getQuestionById)
router.put('/questions/:questionId', authMiddleware, questionController.updateQuestion)
router.delete('/questions/:questionId', authMiddleware, questionController.deleteQuestionById)


//Answer routes
router.post('/answer', authMiddleware, answerController.writeAnswer)
router.get('/questions/:questionId/answer', answerController.getAnswer)
router.put('/answer/:answerId', authMiddleware, answerController.updateAnswer)
router.delete('/answers/:answerId', authMiddleware, answerController.deleteAnswer)


module.exports = router; 