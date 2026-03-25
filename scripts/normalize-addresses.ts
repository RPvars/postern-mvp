import { prisma } from '@/lib/prisma';
import { normalizeAddress } from '@/lib/text-utils';

const BATCH_SIZE = 1000;

async function main() {
  console.log('=== Address Normalization ===\n');

  const total = await prisma.company.count();
  console.log(`Total companies: ${total}`);

  let processed = 0;
  let cursor: string | undefined;

  while (true) {
    const companies = await prisma.company.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, legalAddress: true },
      orderBy: { id: 'asc' },
    });

    if (companies.length === 0) break;

    await prisma.$transaction(
      companies.map((c) =>
        prisma.company.update({
          where: { id: c.id },
          data: { legalAddressNormalized: normalizeAddress(c.legalAddress) },
        })
      )
    );

    processed += companies.length;
    cursor = companies[companies.length - 1].id;

    if (processed % 10000 === 0 || processed === total) {
      console.log(`  ${processed}/${total} normalized`);
    }
  }

  console.log(`\nDone! ${processed} addresses normalized.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Normalization failed:', e);
  process.exit(1);
});
