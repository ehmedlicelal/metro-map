const fs = require('fs');
const path = require('path');

/**
 * Parse coordinate from raw format (e.g. "40421760" → 40.421760)
 */
function parseCoord(raw) {
  const s = String(raw).replace(/\s/g, '');
  return parseFloat(s.slice(0, 2) + '.' + s.slice(2));
}

/**
 * Parse the CSV file and return raw rows
 */
function parseCSV() {
  const csvPath = path.join(__dirname, '..', '..', 'pathways.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // Skip header
  const header = lines[0];
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse semicolon-delimited, handle quoted fields
    const fields = parseSemicolonLine(line);
    if (fields.length < 6) continue;

    const stationAz = fields[0].replace(/"/g, '').trim();
    const stationEn = fields[1].replace(/"/g, '').trim();
    const latRaw = fields[2].replace(/"/g, '').trim();
    const lngRaw = fields[3].replace(/"/g, '').trim();
    const address = fields[4].replace(/"/g, '').trim();
    const exitLabel = fields[5].replace(/"/g, '').trim();

    // Handle the "28 May" station which appears as date in CSV
    let normalizedAz = stationAz;
    if (stationAz.match(/^\d{2}\.\d{2}\.\d{4}/)) {
      normalizedAz = '28 May';
    }

    rows.push({
      station_az: normalizedAz,
      station_en: stationEn,
      lat: parseCoord(latRaw),
      lng: parseCoord(lngRaw),
      address: address,
      exit_label: exitLabel
    });
  }

  return rows;
}

/**
 * Parse a semicolon-delimited line respecting quoted fields
 */
function parseSemicolonLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === ';' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

module.exports = { parseCSV, parseCoord };
