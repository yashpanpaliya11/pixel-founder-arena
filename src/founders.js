const rows = [
  ['elon', 'Elon Musk', 'Tesla', 'Scale & ambition', 'rocket', '#ff684e'],
  ['jensen', 'Jensen Huang', 'NVIDIA', 'AI & performance', 'gpu', '#b9ec52'],
  ['zuck', 'Mark Zuckerberg', 'Meta', 'Growth & distribution', 'growth', '#6ea4ff'],
  ['bezos', 'Jeff Bezos', 'Amazon', 'Customers & pricing', 'customer', '#ffbd69'],
  ['gates', 'Bill Gates', 'Microsoft', 'Software & strategy', 'software', '#84cfff'],
  ['jobs', 'Steve Jobs', 'Apple', 'Design & simplicity', 'design', '#d7cfff'],
  ['sam', 'Sam Altman', 'OpenAI', 'AI & scale', 'ai', '#a7e3cb'],
  ['rauch', 'Guillermo Rauch', 'Vercel', 'Shipping & developer experience', 'shipping', '#e6e7ed'],
  ['levels', 'Pieter Levels', 'Nomad List', 'MRR & bootstrapping', 'revenue', '#f58d91'],
  ['benioff', 'Marc Benioff', 'Salesforce', 'Enterprise & sales', 'sales', '#65caff'],
  ['larry', 'Larry Page', 'Google', 'Search & ambitious ideas', 'search', '#f3d271'],
  ['sergey', 'Sergey Brin', 'Google', 'Experiments & research', 'research', '#8bcaa6'],
  ['jack', 'Jack Dorsey', 'Twitter', 'Simplicity & networks', 'network', '#74c9f4'],
  ['brian', 'Brian Chesky', 'Airbnb', 'Trust & experience', 'experience', '#ff8799'],
  ['melanie', 'Melanie Perkins', 'Canva', 'Accessible design', 'accessibility', '#84dcdd'],
  ['dario', 'Dario Amodei', 'Anthropic', 'AI & reliability', 'reliability', '#d7ab91'],
  ['demis', 'Demis Hassabis', 'DeepMind', 'Research & reasoning', 'research', '#8e9fff'],
  ['aravind', 'Aravind Srinivas', 'Perplexity', 'Search & evidence', 'evidence', '#75cecc'],
  ['michael', 'Michael Truell', 'Cursor', 'Coding & developer tools', 'developer', '#c2c5d8'],
  ['sundar', 'Sundar Pichai', 'Google', 'Useful products at scale', 'scale', '#8ab5ff'],
  ['satya', 'Satya Nadella', 'Microsoft', 'Platforms & collaboration', 'platform', '#9cd5f0'],
  ['lisa', 'Lisa Su', 'AMD', 'Hardware & efficiency', 'efficiency', '#ff9689'],
  ['ilya', 'Ilya Sutskever', 'SSI', 'Deep learning & safety', 'learning', '#ddd1ef'],
  ['dylan', 'Dylan Field', 'Figma', 'Design & collaboration', 'collaboration', '#c6a8ff'],
  ['patrick', 'Patrick Collison', 'Stripe', 'Payments & infrastructure', 'payments', '#afa0ff'],
];

/** Fictional game personalities; company badges indicate association, not current roles. */
export const founders = rows.map(([id, name, company, specialty, archetype, color], i) => ({
  id, name, company, specialty, archetype, color,
  sheet: i < 15 ? 'founders' : 'tech',
  column: i % 5,
  row: i < 15 ? Math.floor(i / 5) : Math.floor((i - 15) / 5),
  rows: i < 15 ? 3 : 2,
}));

export function validateCustomFounders(input) {
  if (!Array.isArray(input) || input.length > 50) throw new Error('A character pack must be an array of at most 50 characters.');
  const ids = new Set(founders.map(f => f.id));
  return input.map(f => {
    if (!f || !/^[a-z][a-z0-9-]{0,39}$/.test(f.id) || ids.has(f.id)) throw new Error('Each custom character needs a unique lowercase id.');
    ids.add(f.id);
    for (const field of ['name', 'company', 'specialty']) {
      if (typeof f[field] !== 'string' || !f[field].trim() || f[field].length > 100) throw new Error(`Invalid custom character ${field}.`);
    }
    const roasts = {};
    for (const language of ['en', 'hinglish']) {
      const lines = f.roasts?.[language] ?? [];
      if (!Array.isArray(lines) || lines.length > 100 || lines.some(x => typeof x !== 'string' || !x.trim() || x.length > 300)) throw new Error('Roasts must be nonempty strings of at most 300 characters.');
      roasts[language] = lines;
    }
    return { id: f.id, name: f.name.trim(), company: f.company.trim(), specialty: f.specialty.trim(), archetype: 'custom', color: /^#[a-f\d]{6}$/i.test(f.color) ? f.color : '#b9ec52', custom: true, roasts };
  });
}
