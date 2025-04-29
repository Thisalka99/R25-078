const express = require('express');
const router = express.Router();
const { getQuestions, submitAnswers, getLatestAnswers } = require('../controllers/depressionController');


router.get('/questions', getQuestions);
router.post('/submit', submitAnswers);
router.get('/latest', getLatestAnswers);


module.exports = router;
