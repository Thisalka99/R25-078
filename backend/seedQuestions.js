const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Question = require('./models/Question');

dotenv.config();

const questions = [
  "Do you do this job willing?",
  "Can you bear the workload here?",
  "Do You feel a headache while working?",
  "Are you bored with life?",
  "Do you feel Hopeless In Your life?",
  "Do you have appetite?",
  "Do you like to isolated?",
  "Do you like to be with your friends?",
  "Do you like to have enjoy with other people?",
  "Do you like to do your daily Activities?",
  "Would you like to discuss your problem with someone else?",
  "Do you think to commit suicide?",
  "Does your family members have mental disorders?",
  "Do you feel Like you have no one?"
];

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Question.deleteMany({});
  await Question.insertMany(questions.map(text => ({ text })));
  console.log('Questions seeded!');
  process.exit();
};

seed();
