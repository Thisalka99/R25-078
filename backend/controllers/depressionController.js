const Question = require('../models/Question');
const DepressionForm = require('../models/DepressionForm');


exports.getQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.submitAnswers = async (req, res) => {
    const { userId, responses } = req.body;
    try {
      await DepressionForm.updateMany({ userId }, { latest: false }); // mark old as not latest
      const form = new DepressionForm({ userId, responses, latest: true });
      await form.save();
      res.status(201).json({ message: 'Form submitted successfully' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  exports.getLatestAnswers = async (req, res) => {
    const { userId } = req.query;
    try {
      const form = await DepressionForm.findOne({ userId, latest: true }).populate('responses.questionId');
      if (!form) return res.status(404).json({ message: 'No form found' });
  
      const answers = {};
      form.responses.forEach((r, i) => {
        answers[`Q${i + 1}`] = r.answer === 'Yes' ? 1 : 0;
      });
  
      
      answers['Total_Score'] = Object.values(answers).reduce((sum, v) => sum + v, 0);
  
      res.json(answers);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
  
  