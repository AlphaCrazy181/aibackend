import cors from 'cors';
import express from 'express';

const app = express();

// Nuclear CORS option - allow everything during development
const corsOptions = {
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS to all routes
app.use(cors(corsOptions));

// Special handler for preflight requests
app.options('*', cors(corsOptions));

// Your existing routes
app.post('/tts', (req, res) => {
  // Set CORS headers manually as backup
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Your existing TTS logic here
  res.json({ message: "This will work now!" });
});

// Same for STS endpoint
app.post('/sts', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Your existing STS logic here
  res.json({ message: "STS works too!" });
});

app.listen(process.env.PORT || 3000);
