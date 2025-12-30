const puppeteer = require('puppeteer');
const path = require('path');
const axios = require('axios');
require('dotenv').config();
const fs = require('fs');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const Redis = require("ioredis")

class JobScraperService {
  static browser = null;
  static browserTimeout = null;
  static BROWSER_SHUTDOWN_DELAY = 5 * 60 * 1000; // 5 minutes

  // Initialize browser instance
  static async getBrowserInstance() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
      });
    }

    // Reset the browser shutdown timer
    return this.browser;
  }

  // Process Puppeteer task
  static async processTask() {
    const browser = await this.getBrowserInstance();
    const page = await browser.newPage();
    try {
      const linkedinUrl = 'https://www.linkedin.com/jobs/search/?currentJobId=4225280166&geoId=102478259&keywords=backend&origin=JOB_SEARCH_PAGE_LOCATION_AUTOCOMPLETE&refresh=true';
      await page.setViewport({ width: 1280, height: 800 })  // Simulate a smaller screen
      await page.goto(linkedinUrl, { waitUntil: 'domcontentloaded' })
      // Wait for the jobs count element to be visible
      await page.waitForSelector('.results-context-header__job-count', { timeout: 30000 });

      // Extract the job count
      const jobCountText = await page.$eval('.results-context-header__job-count', element => element.textContent.trim());

      // Convert the text to a number (remove any commas and convert to integer)
      const jobCount = parseInt(jobCountText.replace(/,/g, ''), 10);

      console.log(`Found ${jobCount} jobs on LinkedIn`);
      return {
        count: jobCount,
        url: linkedinUrl
      };

    } catch (error) {
      console.error('Error processing job scraper task:', error);
      await page.close();
      throw error;
    }
  }
}

module.exports = JobScraperService;
