const express = require('express');
const PuppeteerService = require('./src/services/puppeteer');
const JobScraperService = require('./src/services/jobscraper');
const basicAuth = require("express-basic-auth");

const app = express();
const port = 1338;

app.use(express.json());

// Endpoint: Process Puppeteer task
app.get('/', (req, res) => {
  res.send('Web fetcher service is running');
});

app.post('/process', basicAuth({ challenge: true, users: { ["portolabs-admin"]: process.env.KEY ?? "admin" } }), async (req, res) => {
  const { url, portokuAssetId } = req.body;

  if (!url || !portokuAssetId) return res.status(400).json({ error: 'Missing "url" or "portokuAssetId" in request body' });

  try {
    await PuppeteerService.pushToQueue(url, portokuAssetId);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing Puppeteer request:', error);
    res.status(500).json({ sucess: false, error: 'Internal server error' });
  }
});

app.post('/job-scraper', basicAuth({ challenge: true, users: { ["portolabs-admin"]: process.env.KEY ?? "admin" } }), async (req, res) => {
  try {
    await JobScraperService.processTask();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing Puppeteer request:', error);
    res.status(500).json({ sucess: false, error: 'Internal server error' });
  }
});

app.post('/screenshot-thumbnail', basicAuth({ challenge: true, users: { ["portolabs-admin"]: process.env.KEY ?? "admin" } }), async (req, res) => {
  const { url, documentId, jwt, apiUrl } = req.body;

  if (!url || !documentId || !jwt) return res.status(400).json({ error: 'Missing "url", "documentId", or "jwt" in request body' });

  try {
    const dataUrl = await PuppeteerService.screenshotToDataUrl(url);

    const baseUrl = apiUrl || process.env.BASE_API;
    const response = await fetch(`${baseUrl}/api/ai-widget/${documentId}/thumbnail`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ thumbnail: dataUrl }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ success: false, error: errorText });
    }

    const data = await response.json();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error processing screenshot-thumbnail:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => { console.log(`Puppeteer service running at http://localhost:${port}`) });
