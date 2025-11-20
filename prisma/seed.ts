import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clear existing data
  await prisma.financialRatio.deleteMany();
  await prisma.taxPayment.deleteMany();
  await prisma.beneficialOwner.deleteMany();
  await prisma.boardMember.deleteMany();
  await prisma.ownership.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.company.deleteMany();

  // Create owners
  const owners = await Promise.all([
    prisma.owner.create({ data: { name: 'Jānis Bērziņš', personalCode: '010190-12345' } }),
    prisma.owner.create({ data: { name: 'Anna Liepa', personalCode: '150585-67890' } }),
    prisma.owner.create({ data: { name: 'Māris Kalniņš', personalCode: '230278-11111' } }),
    prisma.owner.create({ data: { name: 'Ilze Ozola', personalCode: '050695-22222' } }),
    prisma.owner.create({ data: { name: 'Pēteris Grants', personalCode: '120482-33333' } }),
    prisma.owner.create({ data: { name: 'Kristīne Siliņa', personalCode: '280391-44444' } }),
    prisma.owner.create({ data: { name: 'Roberts Krūmiņš', personalCode: '090188-55555' } }),
    prisma.owner.create({ data: { name: 'Laura Zariņa', personalCode: '170693-66666' } }),
    prisma.owner.create({ data: { name: 'Andris Ozoliņš', personalCode: '040580-77777' } }),
    prisma.owner.create({ data: { name: 'Ieva Liepiņa', personalCode: '190287-88888' } }),
  ]);

  // Define company data
  const companiesData = [
    {
      name: 'Baltijas Tehnoloģijas SIA',
      registrationNumber: '40103123456',
      taxNumber: 'LV40103123456',
      legalAddress: 'Brīvības iela 123, Rīga, LV-1001',
      registrationDate: new Date('2015-03-15'),
      phone: '+371 67123456',
      email: 'info@balttech.lv',
      status: 'Aktīvs',
      legalForm: 'Sabiedrība ar ierobežotu atbildību',
      registryName: 'Komercreģistrs',
      shareCapital: 5000,
      shareCapitalRegisteredDate: new Date('2015-03-15'),
      registeredVehiclesCount: 3,
      ownersData: [
        { owner: owners[0], share: 60, sharesCount: 3000, nominalValue: 1.0, memberSince: new Date('2015-03-15') },
        { owner: owners[1], share: 40, sharesCount: 2000, nominalValue: 1.0, memberSince: new Date('2015-03-15') }
      ],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Latvijas Būvnieks AS',
      registrationNumber: '40003234567',
      taxNumber: 'LV40003234567',
      legalAddress: 'Elizabetes iela 45, Rīga, LV-1010',
      registrationDate: new Date('2010-06-20'),
      phone: '+371 67234567',
      email: 'kontakti@buvnieks.lv',
      ownersData: [{ owner: owners[2], share: 100 }],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Rīgas Tirdzniecības Centrs SIA',
      registrationNumber: '40103345678',
      taxNumber: 'LV40103345678',
      legalAddress: 'Krišjāņa Barona iela 88, Rīga, LV-1001',
      registrationDate: new Date('2018-09-10'),
      phone: '+371 67345678',
      email: 'info@rtc.lv',
      ownersData: [{ owner: owners[3], share: 51 }, { owner: owners[4], share: 49 }],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: true, // Has some payment claims
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Ventspils Logistika SIA',
      registrationNumber: '40103456789',
      taxNumber: 'LV40103456789',
      legalAddress: 'Ostas iela 12, Ventspils, LV-3601',
      registrationDate: new Date('2012-11-05'),
      phone: '+371 63456789',
      email: 'info@vlog.lv',
      ownersData: [{ owner: owners[5], share: 70 }, { owner: owners[6], share: 30 }],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Liepājas Metāls AS',
      registrationNumber: '40003567890',
      taxNumber: 'LV40003567890',
      legalAddress: 'Graudu iela 68, Liepāja, LV-3401',
      registrationDate: new Date('2008-02-14'),
      phone: '+371 63567890',
      email: 'office@liepajasmetals.lv',
      ownersData: [{ owner: owners[7], share: 100 }],
      hasEncumbrances: true, // Has encumbrances
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: true, // Has commercial pledges
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Daugavpils Enerģija SIA',
      registrationNumber: '40103678901',
      taxNumber: 'LV40103678901',
      legalAddress: 'Rīgas iela 22A, Daugavpils, LV-5401',
      registrationDate: new Date('2016-07-22'),
      phone: '+371 65678901',
      email: 'info@daugenergo.lv',
      ownersData: [{ owner: owners[8], share: 55 }, { owner: owners[9], share: 45 }],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Jūrmalas Viesnīcas SIA',
      registrationNumber: '40103789012',
      taxNumber: 'LV40103789012',
      legalAddress: 'Jomas iela 47, Jūrmala, LV-2015',
      registrationDate: new Date('2019-04-30'),
      phone: '+371 67789012',
      email: 'rezervacija@jurmalashotels.lv',
      ownersData: [{ owner: owners[0], share: 80 }, { owner: owners[2], share: 20 }],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Cēsu Alus Darītava SIA',
      registrationNumber: '40103890123',
      taxNumber: 'LV40103890123',
      legalAddress: 'Aldaru iela 5, Cēsis, LV-4101',
      registrationDate: new Date('2013-12-01'),
      phone: '+371 64890123',
      email: 'info@cesudaritava.lv',
      ownersData: [{ owner: owners[1], share: 100 }],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Siguldas Tūrisms AS',
      registrationNumber: '40003901234',
      taxNumber: 'LV40003901234',
      legalAddress: 'Pils iela 16, Sigulda, LV-2150',
      registrationDate: new Date('2011-05-18'),
      phone: '+371 67901234',
      email: 'info@siguldatourism.lv',
      ownersData: [{ owner: owners[3], share: 60 }, { owner: owners[5], share: 40 }],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Jelgavas Graudu Bāze SIA',
      registrationNumber: '40103012345',
      taxNumber: 'LV40103012345',
      legalAddress: 'Dobeles šoseja 32, Jelgava, LV-3007',
      registrationDate: new Date('2014-08-25'),
      phone: '+371 63012345',
      email: 'office@jelgavagrain.lv',
      ownersData: [{ owner: owners[4], share: 75 }, { owner: owners[6], share: 25 }],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: true,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Rēzeknes IT Parks SIA',
      registrationNumber: '40103112233',
      taxNumber: 'LV40103112233',
      legalAddress: 'Atbrīvošanas aleja 155, Rēzekne, LV-4601',
      registrationDate: new Date('2020-01-10'),
      phone: '+371 64612233',
      email: 'info@rezit.lv',
      ownersData: [{ owner: owners[7], share: 50 }, { owner: owners[8], share: 50 }],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Valmiera Glass SIA',
      registrationNumber: '40103223344',
      taxNumber: 'LV40103223344',
      legalAddress: 'Rūpniecības iela 9, Valmiera, LV-4201',
      registrationDate: new Date('2009-10-12'),
      phone: '+371 64223344',
      email: 'sales@valmieraglass.lv',
      ownersData: [{ owner: owners[9], share: 100 }],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Tukuma Piena Produkti AS',
      registrationNumber: '40003334455',
      taxNumber: 'LV40003334455',
      legalAddress: 'Pils iela 14, Tukums, LV-3101',
      registrationDate: new Date('2007-03-20'),
      phone: '+371 63334455',
      email: 'info@tukumsdairy.lv',
      ownersData: [{ owner: owners[0], share: 45 }, { owner: owners[1], share: 35 }, { owner: owners[2], share: 20 }],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Ogres Mežrūpniecība SIA',
      registrationNumber: '40103445566',
      taxNumber: 'LV40103445566',
      legalAddress: 'Meža iela 7, Ogre, LV-5001',
      registrationDate: new Date('2015-11-08'),
      phone: '+371 65045566',
      email: 'info@ogrewood.lv',
      ownersData: [{ owner: owners[3], share: 65 }, { owner: owners[4], share: 35 }],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Kuldīgas Tekstils SIA',
      registrationNumber: '40103556677',
      taxNumber: 'LV40103556677',
      legalAddress: 'Liepājas iela 36, Kuldīga, LV-3301',
      registrationDate: new Date('2017-06-15'),
      phone: '+371 63356677',
      email: 'info@kuldigatextile.lv',
      ownersData: [{ owner: owners[5], share: 90 }, { owner: owners[6], share: 10 }],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Salaspils Biotech AS',
      registrationNumber: '40003667788',
      taxNumber: 'LV40003667788',
      legalAddress: 'Institūta iela 1, Salaspils, LV-2169',
      registrationDate: new Date('2021-02-28'),
      phone: '+371 67967788',
      email: 'research@salaspilsbio.lv',
      ownersData: [{ owner: owners[7], share: 55 }, { owner: owners[9], share: 45 }],
      hasEncumbrances: true,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: true,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Bauska Lauksaimniecība SIA',
      registrationNumber: '40103778899',
      taxNumber: 'LV40103778899',
      legalAddress: 'Uzvaras iela 8, Bauska, LV-3901',
      registrationDate: new Date('2010-09-05'),
      phone: '+371 63978899',
      email: 'info@bauskafarm.lv',
      ownersData: [{ owner: owners[8], share: 100 }],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Aizkraukles Ķīmija SIA',
      registrationNumber: '40103889900',
      taxNumber: 'LV40103889900',
      legalAddress: 'Gaismas iela 19, Aizkraukle, LV-5101',
      registrationDate: new Date('2012-04-17'),
      phone: '+371 65889900',
      email: 'office@aizchem.lv',
      ownersData: [{ owner: owners[0], share: 70 }, { owner: owners[3], share: 30 }],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Talsi Zvejnieki SIA',
      registrationNumber: '40103990011',
      taxNumber: 'LV40103990011',
      legalAddress: 'Ezera iela 11, Talsi, LV-3201',
      registrationDate: new Date('2016-12-20'),
      phone: '+371 63290011',
      email: 'info@talsifish.lv',
      ownersData: [{ owner: owners[1], share: 60 }, { owner: owners[4], share: 40 }],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
    {
      name: 'Madona Furniture Group AS',
      registrationNumber: '40003001122',
      taxNumber: 'LV40003001122',
      legalAddress: 'Saieta laukums 1, Madona, LV-4801',
      registrationDate: new Date('2014-07-11'),
      phone: '+371 64801122',
      email: 'export@madonafurniture.lv',
      ownersData: [{ owner: owners[5], share: 50 }, { owner: owners[7], share: 30 }, { owner: owners[9], share: 20 }],
      hasEncumbrances: false,
      inLiquidation: false,
      inInsolvencyRegister: false,
      hasPaymentClaims: false,
      hasCommercialPledges: false,
      hasSecurities: false,
      hasTaxDebts: false,
      taxDebtsCheckedDate: new Date('2025-10-29'),
    },
  ];

  // Create companies with all related data
  for (const companyData of companiesData) {
    const { ownersData, ...companyInfo } = companyData;

    const company = await prisma.company.create({
      data: companyInfo,
    });

    // Create ownership relationships
    for (const ownerData of ownersData) {
      const sharesCount = (ownerData as any).sharesCount || Math.floor((company.shareCapital || 2844) * (ownerData.share / 100));
      const nominalValue = (ownerData as any).nominalValue || 1.0;
      const totalValue = sharesCount * nominalValue;
      const votingRights = totalValue;

      await prisma.ownership.create({
        data: {
          companyId: company.id,
          ownerId: ownerData.owner.id,
          sharePercentage: ownerData.share,
          sharesCount,
          nominalValue,
          totalValue,
          votingRights,
          memberSince: (ownerData as any).memberSince || company.registrationDate,
          notes: (ownerData as any).notes || null,
          isHistorical: false,
        },
      });
    }

    // Create board members
    const boardMembers = ownersData.slice(0, Math.min(3, ownersData.length)); // Use first 1-3 owners as board members
    for (let i = 0; i < boardMembers.length; i++) {
      const member = boardMembers[i];
      await prisma.boardMember.create({
        data: {
          companyId: company.id,
          name: member.owner.name,
          personalCode: member.owner.personalCode,
          institution: 'Valde',
          position: i === 0 ? 'Valdes priekšsēdētājs' : 'Valdes loceklis',
          appointedDate: (member as any).memberSince || company.registrationDate,
          representationRights: i === 0 ? 'Tiesības pārstāvēt atsevišķi' : 'Kopā ar vismaz 1',
          notes: null,
          isHistorical: false,
        },
      });
    }

    // Create beneficial owner (typically the largest shareholder)
    const mainOwner = ownersData.reduce((prev, current) =>
      (current.share > prev.share) ? current : prev
    );
    if (mainOwner.share >= 25) { // Only if they own 25% or more
      await prisma.beneficialOwner.create({
        data: {
          companyId: company.id,
          name: mainOwner.owner.name,
          personalCode: mainOwner.owner.personalCode,
          dateFrom: (mainOwner as any).memberSince || company.registrationDate,
          residenceCountry: 'Latvijas Republika',
          citizenship: 'Latvijas Republika',
          controlType: 'kā dalībnieks',
        },
      });
    }

    // Create tax payments based on company age (realistic historical data)
    const currentYear = new Date().getFullYear();
    const registrationYear = company.registrationDate.getFullYear();
    const startYear = Math.max(registrationYear, 2015); // Don't go back further than 2015

    // Generate tax payment data from company founding (or 2015) to current year
    for (let year = startYear; year <= currentYear; year++) {
      await prisma.taxPayment.create({
        data: {
          companyId: company.id,
          year,
          amount: Math.random() * 50000 + 10000, // Random amount between 10k and 60k EUR
          date: new Date(`${year}-12-31`),
        },
      });
    }

    // Create financial ratios based on company age (realistic historical data)
    for (let year = startYear; year <= currentYear; year++) {
      await prisma.financialRatio.create({
        data: {
          companyId: company.id,
          year,
          // Profitability Ratios
          returnOnEquity: Math.random() * 0.3 - 0.05, // -5% to 25%
          returnOnAssets: Math.random() * 0.15, // 0% to 15%
          netProfitMargin: Math.random() * 0.2, // 0% to 20%
          grossProfitMargin: Math.random() * 0.4 + 0.1, // 10% to 50%
          operatingProfitMargin: Math.random() * 0.25 + 0.05, // 5% to 30%
          ebitdaMargin: Math.random() * 0.35 + 0.1, // 10% to 45%
          cashFlowMargin: Math.random() * 0.25, // 0% to 25%
          // Liquidity Ratios
          currentRatio: Math.random() * 2 + 0.5, // 0.5 to 2.5
          quickRatio: Math.random() * 1.5 + 0.3, // 0.3 to 1.8
          cashRatio: Math.random() * 0.8 + 0.1, // 0.1 to 0.9
          workingCapitalRatio: Math.random() * 0.4 - 0.1, // -10% to 30%
          // Leverage Ratios
          debtToEquity: Math.random() * 2, // 0 to 2
          debtRatio: Math.random() * 0.7, // 0 to 0.7
          interestCoverageRatio: Math.random() * 8 + 2, // 2 to 10
          equityMultiplier: Math.random() * 2 + 1, // 1 to 3
          // Efficiency Ratios
          assetTurnover: Math.random() * 2 + 0.5, // 0.5 to 2.5
          inventoryTurnover: Math.random() * 8 + 2, // 2 to 10
          receivablesTurnover: Math.random() * 10 + 4, // 4 to 14
          payablesTurnover: Math.random() * 8 + 3, // 3 to 11
          cashConversionCycle: Math.random() * 60 + 20, // 20 to 80 days
        },
      });
    }

    console.log(`Created company: ${company.name}`);
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
