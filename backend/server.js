import express from 'express';
import cors from 'cors';

const app = express();

// 1. Global CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = ['https://demofrontend-rose.vercel.app'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// 2. Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 3. Routes
app.post('/tts', (req, res) => {
  // Manually set headers again as backup
  res.header('Access-Control-Allow-Origin', 'https://demofrontend-rose.vercel.app');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Your TTS logic here
  res.json({ success: true, message: "CORS is fixed!" });
});

// 4. Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
