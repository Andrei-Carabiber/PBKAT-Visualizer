import express from 'express';
import apiRoutes from './routes/index.js';

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

app.use('/api', apiRoutes);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});