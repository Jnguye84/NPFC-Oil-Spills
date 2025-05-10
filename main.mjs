import puppeteer from 'puppeteer';
import fs from 'fs';
import { createObjectCsvWriter } from 'csv-writer';
import { run } from './gemini.js';
import { extractTextFromPDF } from './extracting.js';

const url = 'https://www.uscg.mil/Mariners/National-Pollution-Funds-Center/NRD/#Determinations';

// Set up the CSV writer
const csvWriter = createObjectCsvWriter({
  path: 'claims.csv',
  header: [
    { id: 'incidentName', title: 'Incident Name' },
    { id: 'claimType', title: 'Claim Type' },
    { id: 'claimNumber', title: 'Claim Number' },
    { id: 'pdfLink', title: 'PDF Link' },
    { id: 'determinationDate', title: 'Determination Date' },
    { id: 'responsibleParty', title: 'Responsible Party' },
    { id: 'amountOfOilReleased', title: 'Amount of Oil Released' },
    { id: 'trustees', title: 'Trustees' },
    { id: 'numberOfTrustees', title: 'Number of Trustees' },
    { id: 'descriptionOfEvent', title: 'Description of the Event' },
    { id: 'injuryDetermination', title: 'Description of Injury Determination and Quantification' },
    { id: 'biologicalEffects', title: 'Biological Effects' },
    { id: 'moneyOwed', title: 'Amount of Money Owed by the RP from this claim' },
    { id: 'notes', title: 'Notes' },
  ]
});

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  });

  await page.goto(url, { waitUntil: 'networkidle2' });

  const tableData = await page.evaluate(() => {
    const table = document.querySelector('table#indextable');
    if (!table) return [];

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    return rows.map(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 4) return null;

      const incidentName = cells[0].innerText.trim();
      const claimType = cells[1].innerText.trim();
      const claimLink = cells[2].querySelector('a');
      const claimNumber = claimLink?.innerText.trim() || '';
      const pdfLink = claimLink?.href || '';
      const determinationDate = cells[3].innerText.trim();

      return {
        incidentName,
        claimType,
        claimNumber,
        pdfLink,
        determinationDate
      };
    }).filter(Boolean);
  });

  const allRows = [];

  for (const item of tableData) {
    let fields = {};
    if (item.pdfLink && item.pdfLink.startsWith('http')) {
      try {
        const text = await extractTextFromPDF(item.pdfLink);
        const response = await run(text);
        fields = JSON.parse(response);  // Assumes Gemini returns valid JSON
      } catch (e) {
        console.error(`Error parsing PDF or Gemini output for ${item.pdfLink}:`, e.message);
        fields = { notes: 'Failed to parse or extract data' };
      }
    }

    allRows.push({
      ...item,
      responsibleParty: fields["Responsible Party"] || '',
      amountOfOilReleased: fields["Amount of Oil Released"] || '',
      trustees: fields["The Trustees"] || '',
      numberOfTrustees: fields["The Number of Trustees"] || '',
      descriptionOfEvent: fields["Description of the Event"] || '',
      injuryDetermination: fields["Description of Injury Determination and Quantification"] || '',
      biologicalEffects: fields["Biological Effects"] || '',
      moneyOwed: fields["Amount of Money Owed by the RP from this claim"] || '',
      notes: fields["notes"] || ''
    });
  }

  await csvWriter.writeRecords(allRows);
  console.log('CSV file created: claims.csv');

  await browser.close();
})();
