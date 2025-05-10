import subprocess
import requests
from bs4 import BeautifulSoup
import pandas as pd
from pdf2image import convert_from_path
import os
import time
import sys
import pytesseract
from PIL import Image

# 1. Scrape the website
def scrape_table(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    data = []
    table = soup.find('indextable')  # Customize this based on actual HTML
    rows = table.find_all('tr')[1:]  # skip header

    for row in rows:
        cols = row.find_all('td')
        if len(cols) >= 4:
            incident_name = cols[0].get_text(strip=True)
            claim_type = cols[1].get_text(strip=True)
            claim_number = cols[2].get_text(strip=True)
            determination_date = cols[3].get_text(strip=True)
            pdf_link = cols[0].find('a')['href'] if cols[0].find('a') else None
            
            data.append({
                'Incident Name': incident_name,
                'Claim Type': claim_type,
                'Claim Number': claim_number,
                'Determination Date': determination_date,
                'PDF Link': pdf_link
            })

    return data

# 2. Download and extract PDF text
def process_file(file_path):
    text = ''
    doc = convert_from_path(file_path)  
    for page in doc:
        text = pytesseract.image_to_string(page)
        text += text + '\n'
    return text


result =subprocess.run(['node', 'gemini.js', process_file(f)], capture_output=True, text=True)
print(result.stdout)

# 4. Combine and save
def main():
    url = "https://www.uscg.mil/Mariners/National-Pollution-Funds-Center/NRD/#Determinations"
    records = scrape_table(url)

    final_data = []
    for record in records:
        print(f"Processing: {record['Incident Name']}")
        if record['PDF Link']:
            try:
                pdf_text = process_file(record['PDF Link'])
                extra_info = process_file(pdf_text)
                record['Gemini Output'] = extra_info
            except Exception as e:
                record['Gemini Output'] = f"Error: {e}"
        else:
            record['Gemini Output'] = "No PDF link found"
        
        final_data.append(record)
        time.sleep(1)  # Be kind to the server

    # Write to Excel
    df = pd.DataFrame(final_data)
    df.to_excel("claims_data.xlsx", index=False)

if __name__ == "__main__":
    main()
