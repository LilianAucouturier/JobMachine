import fs from 'fs';

console.log('=== ANALYSE COMPARATIVE SIMPLIFY & TEAL ===\n');

// 1. SIMPLIFY
if (fs.existsSync('scripts/unpacked/simplify/remoteConfig.json')) {
  const simplifyConfig = JSON.parse(fs.readFileSync('scripts/unpacked/simplify/remoteConfig.json', 'utf8'));
  console.log('--- SIMPLIFY ---');
  console.log('ATS supportés:', Object.keys(simplifyConfig.ATS || {}).length, 'plateformes');
  console.log('Resume Keyword clusters:', Object.keys(simplifyConfig.resumeScoreKeywords || {}).length);
  
  // Regardons les règles pour Workday, Greenhouse, Lever, SmartRecruiters
  ['Greenhouse', 'Lever', 'Workday', 'SmartRecruiters'].forEach(ats => {
    if (simplifyConfig.ATS[ats]) {
      console.log(`\nATS: ${ats}`);
      console.log('URLs:', simplifyConfig.ATS[ats].urls);
      if (simplifyConfig.ATS[ats].trackedObjExtractors) {
        console.log('Extractors count:', simplifyConfig.ATS[ats].trackedObjExtractors.length);
        console.log('Sample extractor:', simplifyConfig.ATS[ats].trackedObjExtractors[0]);
      }
    }
  });

  // Catégories de scoring
  if (simplifyConfig.resumeScoreCategories) {
    console.log('\nCatégories de Resume Score:');
    for (const [cat, items] of Object.entries(simplifyConfig.resumeScoreCategories)) {
      console.log(`- ${cat}: ${items.length} groupes`);
    }
  }
}

// 2. TEAL
if (fs.existsSync('scripts/unpacked/teal/content-scripts/content.js')) {
  const tealContent = fs.readFileSync('scripts/unpacked/teal/content-scripts/content.js', 'utf8');
  console.log('\n--- TEAL ---');
  console.log('Taille de content.js:', (tealContent.length / 1024).toFixed(1), 'KB');
  
  // Cherchons les sélecteurs de salary et de job boards
  const salaryMatches = tealContent.match(/salary/gi);
  console.log('Occurrences de "salary":', salaryMatches ? salaryMatches.length : 0);

  // Recherche de patterns de sites détectés
  const sites = ['linkedin', 'indeed', 'glassdoor', 'ziprecruiter', 'dice', 'builtin', 'greenhouse', 'lever', 'workday', 'welcometothejungle'];
  const detectedSites = sites.filter(s => tealContent.toLowerCase().includes(s));
  console.log('Sites reconnus dans le script Teal:', detectedSites);
}
