# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web Screenshooter is a Node.js service that uses Puppeteer to capture screenshots of web pages and uploads them to an external API. The service runs as an Express server with a Redis-backed queue for processing screenshot tasks asynchronously.

## Architecture

### Service Layer (src/services/)

- **PuppeteerService** (`puppeteer.js`): Core service for web screenshot capture
  - Manages a singleton browser instance with auto-shutdown after 5 minutes of inactivity
  - Implements a Redis queue consumer (`startConsumer()`) that processes tasks from the `scrapeQueue` list
  - Tasks pushed via `pushToQueue(url, id)` are processed asynchronously
  - Browser executable path defaults to `/usr/bin/chromium` (Docker environment) or `process.env.PUPPETEER_EXECUTABLE_PATH`
  - Screenshots are saved to `public/` directory temporarily, uploaded via multipart/form-data, then deleted
  - On error, posts `fsStatus: 'ERROR'` to the API; on success, posts `fsStatus: 'DONE'` with metadata

- **JobScraperService** (`jobscraper.js`): LinkedIn job listing scraper
  - Hardcoded to scrape LinkedIn job search results for "backend" positions
  - Extracts job count from `.results-context-header__job-count` selector
  - Uses separate browser instance from PuppeteerService

### API Endpoints (server.js:port 1338)

- `GET /` - Health check endpoint
- `POST /process` - Submit screenshot task (basic auth required)
  - Body: `{ url, portokuAssetId }`
  - Pushes to Redis queue, returns immediately
  - Auth: `portolabs-admin` with password from `process.env.KEY` (defaults to "admin")
- `POST /job-scraper` - Trigger job scraping (basic auth required)
  - Calls `JobScraperService.processTask()` synchronously

### External Dependencies

- **Upstash Redis**: Queue backend configured via `process.env.REDIS_URL`
- **External API**: Base URL via `process.env.BASE_API`, auth via `process.env.BEARER_TOKEN`
  - Upload endpoint: `{BASE_API}/upload` (multipart/form-data)
  - Asset update endpoint: `{BASE_API}/post/asset` (JSON)

## Development

### Running the Service

```bash
npm install
npm start
```

The service starts on port 1338 and automatically begins consuming from the Redis queue.

### Environment Variables

Required (see `.env.example`):
- `REDIS_URL` - Upstash Redis connection string
- `BASE_API` - External API base URL
- `BEARER_TOKEN` - Authorization token for API calls
- `KEY` - Password for basic auth (optional, defaults to "admin")
- `PUPPETEER_EXECUTABLE_PATH` - Chromium executable path (optional, defaults to `/usr/bin/chromium`)

### Docker Deployment

The project includes a Dockerfile and GitHub Actions workflow for automated building and deployment to a DigitalOcean droplet. The container runs with Chromium installed in a slim Node.js 18 image.

The workflow:
1. Builds Docker image and pushes to Docker Hub on push to `main`
2. Deploys via SSH to DigitalOcean droplet, replacing the running container

Key Docker runtime flags:
- `--network n8n_redis_net` - Connects to Redis network
- `--add-host host.docker.internal:host-gateway` - Allows container to access host services
