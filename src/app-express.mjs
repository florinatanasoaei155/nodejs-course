import express from 'express';
import { join } from 'node:path';

const app = express();

// Serve static files (CSS, images, etc.) from the public folder
app.use(express.static(join(process.cwd(), 'src', 'public')));

function requestCallback(request, response) {
  response.status(200).send('request received');
}

app.get('/', requestCallback);

app.get('/simple-text', (req, res) => {
  console.log('this is some text');
  res
    .status(200)
    .set({ 'Content-Type': 'text/plain' })
    .send('this is some test');
});

app.get('/html-version', (req, res) => {
  res
    .status(200)
    .set({ 'Content-Type': 'text/html' })
    .send('<h1>this is some html</h1>');
});

app.get('/concerts', (req, res) => {
  console.log(process.cwd());
  // const filePath = `${process.cwd()}/src/public/concerts.html`;
  const filePath = join(process.cwd(), 'src', 'public', 'concerts.html');
  res.status(200).sendFile(filePath);
});

app.listen(3000);
