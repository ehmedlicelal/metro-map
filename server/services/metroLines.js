/**
 * Baku Metro line definitions — hardcoded station sequences.
 * Station IDs match normalized IDs from CSV (lowercase, dash-separated English names).
 *
 * Lines derived from official Baku Metro map:
 *   Red (Qırmızı xətt): 13 stations
 *   Green (Yaşıl xətt): 11 stations
 *   Purple (Bənövşəyi xətt): 4 stations
 */

const METRO_LINES = {
  red: {
    id: 'red',
    name_az: 'Qırmızı xətt',
    name_en: 'Red Line',
    color: '#e94560',
    stations: [
      'icherisheher',
      'sahil',
      '28-may',
      'ganjlik',
      'nariman-narimanov',
      'bakmil',
      'ulduz',
      'koroglu',
      'gara-garayev',
      'neftchilar',
      'khalglar-dostlughu',
      'akhmedli',
      'hazi-aslanov'
    ]
  },
  green: {
    id: 'green',
    name_az: 'Yaşıl xətt',
    name_en: 'Green Line',
    color: '#4ecca3',
    stations: [
      'shah-ismail-khatai',
      'jafar-jabbarly',
      '28-may',
      'nizami',
      'elmler-akademiyasi',
      'insahatchilar',
      '20-yanvar',
      'memar-ajami',
      'nasimi',
      'azadliq-prospekti',
      'darnagul'
    ]
  },
  purple: {
    id: 'purple',
    name_az: 'Bənövşəyi xətt',
    name_en: 'Purple Line',
    color: '#a855f7',
    stations: [
      '8-novabr',
      'memar-ajami',
      'avtovaghzal',
      'khojasan'
    ]
  }
};

/**
 * Transfer stations — stations shared between multiple lines.
 */
const TRANSFERS = {
  '28-may': ['red', 'green'],
  'memar-ajami': ['green', 'purple']
};

module.exports = { METRO_LINES, TRANSFERS };
