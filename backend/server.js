const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');


dotenv.config();


const app = express();
app.use(cors());
app.use(express.json());


const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const depressionRoutes = require('./routes/depressionRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/task', taskRoutes);
app.use('/api/depression', depressionRoutes);


mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(` Server running at http://localhost:${process.env.PORT}`);
    });
  })
  .catch(err => console.error(' MongoDB Error:', err));
