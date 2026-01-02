import { prisma } from '@/lib/prisma';

// Normalize string by removing Latvian diacritics for better search matching
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/[āĀ]/g, 'a')
    .replace(/[čČ]/g, 'c')
    .replace(/[ēĒ]/g, 'e')
    .replace(/[ģĢ]/g, 'g')
    .replace(/[īĪ]/g, 'i')
    .replace(/[ķĶ]/g, 'k')
    .replace(/[ļĻ]/g, 'l')
    .replace(/[ņŅ]/g, 'n')
    .replace(/[šŠ]/g, 's')
    .replace(/[ūŪ]/g, 'u')
    .replace(/[žŽ]/g, 'z');
}

async function populateNormalizedFields() {
  console.log('Starting to populate normalized fields...');

  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      registrationNumber: true,
      taxNumber: true,
    },
  });

  console.log(`Found ${companies.length} companies to update`);

  let updated = 0;
  for (const company of companies) {
    await prisma.company.update({
      where: { id: company.id },
      data: {
        nameNormalized: normalizeString(company.name),
        registrationNumberNormalized: normalizeString(company.registrationNumber),
        taxNumberNormalized: normalizeString(company.taxNumber),
      },
    });
    updated++;
    if (updated % 100 === 0) {
      console.log(`Updated ${updated}/${companies.length} companies...`);
    }
  }

  console.log(`Successfully updated ${updated} companies`);
}

populateNormalizedFields()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
