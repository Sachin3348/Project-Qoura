// const aws = require('aws-sdk')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')

const UserModel = require('../models/userModel')
const validEmailFormatRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
const validNumberRegex = /\d+/
const validIndianMobileRegex = /^[0]?[789]\d{9}$/
const saltRounds = 10
const jwtSecretKey = 'someverysensitiveandsecretkey3090@#'
const ObjectId = mongoose.Types.ObjectId
const passMinLen = 8
const passMaxLen = 15


const register = async function (req, res) {
    try {
        const requestBody = req.body;

        if (!Object.keys(requestBody).length > 0) {
            return res.status(400).send({ status: false, message: 'Invalid request parameters. Please provide user details' })
        }

        // Extract parameters
        const fname = requestBody.fname
        const lname = requestBody.lname
        const email = requestBody.email
        const phone = requestBody.phone
        const password = requestBody.password

        // Validation starts
        if (!fname || (typeof fname === 'string' && fname.trim().length === 0)) {
            return res.status(400).send({ status: false, message: "User's first name is required" })
        }

        if (!lname || (typeof lname === 'string' && lname.trim().length === 0)) {
            return res.status(400).send({ status: false, message: "User's Last name is required" })
        }

        if (!email || (typeof email === 'string' && email.trim().length === 0)) {
            return res.status(400).send({ status: false, message: "Email is required" })
        }

        if (!validEmailFormatRegex.test(email)) {
            return res.status(400).send({ status: false, message: email + " is not a valid email address" })
        }

        // if (!phone || ((typeof phone === 'string' && phone.trim().length === 0) || String(phone).trim().length === 0)) {
        //     return res.status(400).send({ status: false, message: 'Phone number is required' })
        // }
        if (phone) {
            if (isNaN(Number(phone)) || !validNumberRegex.test(phone)) {
                return res.status(400).send({ status: false, message: String(phone) + ' should be a valid number' })
            }

            if (!validIndianMobileRegex.test(phone)) {
                return res.status(400).send({ status: false, message: String(phone) + ' should be a valid Indian mobile number' })
            }

        }

        if (!password || (typeof password === 'string' && password.trim().length === 0)) {
            return res.status(400).send({ status: false, message: `Password is required` })
        }

        if (password.length < passMinLen || password.length > passMaxLen) {
            return res.status(400).send({ status: false, message: `Password lenght must be between 8 to 15 char long` })
        }

        if (phone) {
            const isPhoneAlreadyUsed = await UserModel.findOne({ phone: phone });

            if (isPhoneAlreadyUsed) {
                return res.status(400).send({ status: false, message: `${phone} phone number is already registered` })
            }
        }
        const isEmailAlreadyUsed = await UserModel.findOne({ email: email });

        if (isEmailAlreadyUsed) {
            return res.status(400).send({ status: false, message: `${email} email address is already registered` })
        }


        // Validation ends

        const encryptedPassword = await bcrypt.hash(password, saltRounds);

        const userData = {
            fname: fname,
            lname: lname,
            email: email,
            phone: phone ? phone : null,
            password: encryptedPassword,
        }
        const newUser = await UserModel.create(userData);

        return res.status(201).send({ status: true, message: `User created successfully`, data: newUser });
    } catch (error) {
        console.log(`Error while registering the user is ${error.message}`)
        return res.status(500).send({ status: false, message: error.message });
    }
}

const login = async function (req, res) {
    try {
        const requestBody = req.body;
        if (!Object.keys(requestBody).length > 0) {
            return res.status(400).send({ status: false, message: 'Invalid request parameters. Please provide login details' })
        }

        // Extract params
        const email = requestBody.email;
        const password = requestBody.password;

        // Validation starts
        if (!email || (typeof email === 'string' && email.trim().length === 0)) {
            return res.status(400).send({ status: false, message: "Email is required" })
        }

        if (!password || (typeof password === 'string' && password.trim().length === 0)) {
            return res.status(400).send({ status: false, message: `Password is required` })
        }
        // Validation ends

        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).send({ status: false, message: email + " is not a valid register username" });
        }

        const match = await bcrypt.compare(password, user.password)

        if (!match) {
            return res.status(401).send({ status: false, message: 'Invalid login credentials' })
        }

        const token = await jwt.sign({
            userId: user._id,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 10 * 60 * 60
        }, jwtSecretKey)

        return res.status(200).send({ status: true, message: `User login successfull`, data: token });
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

const getUserProfile = async function (req, res) {
    try {
        const userId = req.params.userId

        if (!ObjectId.isValid(userId)) {
            return res.status(400).send({ status: false, message: `${userId} is not a valid user id` })
        }

        const user = await UserModel.findById(userId)    //.lean()

        if (!user) {
            return res.status(404).send({ status: false, message: "User not found" })
        }

        const tokenUserId = req.userId

        if (tokenUserId !== req.params.userId) {
            return res.status(403).send({ status: false, message: `Unauthorized accesss.` })
        }



        return res.status(200).send({ status: true, message: 'User profile details', data: user })
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

const updateUserProfile = async function (req, res) {
    try {
        const userId = req.params.userId
        const requestBody = req.body

        if (!Object.keys(requestBody).length > 0) {
            return res.status(200).send({ status: true, message: 'No param received, user details unmodified' })
        }

        if (!ObjectId.isValid(userId)) {
            return res.status(400).send({ status: false, message: `${userId} is not a valid user id` })
        }

        const user = await UserModel.findById(userId)

        if (!user) {
            return res.status(404).send({ status: false, message: "User not found" })
        }

        // Extract parameters
        const fname = requestBody.fname
        const lname = requestBody.lname
        const email = requestBody.email
        const phone = requestBody.phone

        // Prepare update fields
        if (fname) {
            user['fname'] = fname
        }

        if (lname) {
            user['lname'] = lname
        }

        if (email) {
            if (!validEmailFormatRegex.test(email)) {
                return res.status(400).send({ status: false, message: email + " is not a valid email address" })
            }

            const isEmailAlreadyUsed = await UserModel.findOne({ email: email, _id: { $ne: userId } });

            if (isEmailAlreadyUsed) {
                return res.status(400).send({ status: false, message: `${email} email address is already registered` })
            }

            user['email'] = email
        }

        if (phone) {
            if (isNaN(Number(phone)) || !validNumberRegex.test(phone)) {
                return res.status(400).send({ status: false, message: String(phone) + ' should be a valid number' })
            }

            if (!validIndianMobileRegex.test(phone)) {
                return res.status(400).send({ status: false, message: String(phone) + ' should be a valid Indian mobile number' })
            }

            const isPhoneAlreadyUsed = await UserModel.findOne({ phone: phone, _id: { $ne: userId } });

            if (isPhoneAlreadyUsed) {
                return res.status(400).send({ status: false, message: `${phone} phone number is already registered` })
            }

            user['phone'] = phone
        }

        const tokenUserId = req.userId

        if (tokenUserId !== req.params.userId) {
            return res.status(403).send({ status: false, message: `Unauthorized accesss.` })
        }


        const updatedUser = await user.save()


        return res.status(200).send({ status: true, message: 'User profile updated', data: updatedUser })
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

module.exports.register = register
module.exports.login = login
module.exports.getUserProfile = getUserProfile
module.exports.updateUserProfile = updateUserProfile
