import 'dotenv/config';
import { companyService } from '../lib/business-register/services/company';
import { searchService } from '../lib/business-register/services/search';

async function main() {
  console.log('=== Integration Test ===\n');

  // Test search
  console.log('1. Search: "Latvenergo"');
  const searchResults = await searchService.searchCompanies('Latvenergo');
  console.log(`   Found: ${searchResults.length} results`);
  for (const r of searchResults.slice(0, 3)) {
    console.log(`   - ${r.registrationNumber}: ${r.name} (${r.status})`);
  }

  // Test get company
  console.log('\n2. Get Company: 40003032949 (Latvenergo)');
  const company = await companyService.getCompany('40003032949');
  if (company) {
    console.log(`   Name: ${company.name}`);
    console.log(`   RegNr: ${company.registrationNumber}`);
    console.log(`   Status: ${company.status}`);
    console.log(`   Address: ${company.address}`);
    console.log(`   Form: ${company.legalForm}`);
    console.log(`   Registered: ${company.registrationDate}`);
    console.log(`   SEPA: ${company.sepaId}`);
  } else {
    console.log('   NOT FOUND');
  }

  // Test board members
  console.log('\n3. Board Members: 40003032949');
  const members = await companyService.getBoardMembers('40003032949');
  console.log(`   Found: ${members.length} members`);
  for (const m of members.slice(0, 5)) {
    console.log(`   - ${m.name}: ${m.position} (from ${m.appointedDate?.toISOString().split('T')[0]})`);
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
