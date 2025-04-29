const mongoose = require('mongoose');

const depressionFormSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  responses: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
      answer: { type: String, enum: ['Yes', 'No'] }
    }
  ],
  submittedAt: { type: Date, default: Date.now },
  latest: { type: Boolean, default: true }
});

module.exports = mongoose.model('DepressionForm', depressionFormSchema);
