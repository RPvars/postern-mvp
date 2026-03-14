# Uznemumu Registra API Catalog (Production Portal)

Available APIs at https://api.viss.gov.lv/devportal/apis
Token Endpoint: https://apigw.viss.gov.lv/token

## APIs (subscribable)

### Core - Company Data
| API Name | Context Path | Version | Priority |
|----------|-------------|---------|----------|
| UR-API-SearchLegalEntities | /searchlegalentities | v1.0 | MVP |
| UR-API-LegalEntity | /legalentity | v1.0 | MVP |
| UR-API-LegalEntityChanges | /legalentities | v1.0 | MVP |
| API-TM_UR-SubjectOfLaw | /API-TM_UR-SubjectOfLaw | v1_0 | Later |

### Financial
| API Name | Context Path | Version | Priority |
|----------|-------------|---------|----------|
| UR-API-AnnualReport | /annualreport | v1.0 | MVP |
| UR-API-AnnualReportChanges | /annualreports | v1.0 | Later |

### People
| API Name | Context Path | Version | Priority |
|----------|-------------|---------|----------|
| UR-API-NaturalPerson | /naturalperson | v1.0 | MVP |
| UR-API-NaturalPerson | /naturalperson | v1_2 | MVP (newer) |
| UR-API-NaturalPersonChanges | /naturalpersons | v1.0 | Later |
| API-TM_UR-BORISUserRole | /borisuserrole | v1_0 | Later |
| UR-API-OfficerRightOfRepresentationStatus | /officerrightofrepresentationstatus | v1.0 | Later |

### Beneficial Owners
| API Name | Context Path | Version | Priority |
|----------|-------------|---------|----------|
| API-TM_UR-BeneficialOwner | /beneficialowner | v1_0 | Phase 2 |
| UR-API-BeneficialOwnerChanges | /beneficialowners | v1_0 | Phase 2 |
| API-TM_UR-LegalArrangementsBeneficialOwner | /API-TM_UR-LegalArrangementsBeneficialOwner | v1_0 | Later |
| API-TM_UR-LegalArrangementsBeneficialOwnerChanges | /API-TM_UR-LegalArrangementsBeneficialOwnerChanges | v1_0 | Later |

### Insolvency
| API Name | Context Path | Version | Priority |
|----------|-------------|---------|----------|
| UR-API-InsolvencyProceeding | /insolvencyproceeding | v1.0 | Phase 2 |
| UR-API-InsolvencyChanges | /insolvency | v1.0 | Later |
| UR-API-InsolvencyPractitioner | /insolvencypractitioner | v1.0 | Later |
| UR-API-InsolvencyPractitionerChanges | /insolvencypractitioners | v1.0 | Later |

### Documents
| API Name | Context Path | Version | Priority |
|----------|-------------|---------|----------|
| UR-API-PublicDocument | /publicdocument | v1.0 | Later |
| UR-API-PublicDocumentChanges | /publicdocuments | v1.0 | Later |
| API-TM_UR-RestrictedDocument | /restricteddocument | v1_0 | Later |
| UR-API-RestrictedDocumentChanges | /restricteddocuments | v1.0 | Later |

### Foreign Entities
| API Name | Context Path | Version | Priority |
|----------|-------------|---------|----------|
| UR-API-ForeignEntity | /foreignentity | v1.0 | Later |
| UR-API-ForeignEntityChanges | /foreignentities | v1.0 | Later |

### Commercial Pledges
| API Name | Context Path | Version | Priority |
|----------|-------------|---------|----------|
| UR-API-CommercialPledge | /commercialpledge | v1.0 | Later |
| UR-API-CommercialPledgeChanges | /commercialpledges | v1.0 | Later |

### Mass Media
| API Name | Context Path | Version | Priority |
|----------|-------------|---------|----------|
| UR-API-MassMedium | /massmedium | v1.0 | Later |
| UR-API-MassMediaChanges | /massmedia | v1.0 | Later |

### Spousal Property
| API Name | Context Path | Version | Priority |
|----------|-------------|---------|----------|
| UR-API-SpousalPropertyRelation | /spousalpropertyrelation | v1.0 | Later |
| UR-API-SpousalPropertyRelationChanges | /spousalpropertyrelations | v1.0 | Later |

### Physical Person Check (document only)
| Name | Type |
|------|------|
| LR Uznemumu registra fiziskas personas parbaude vai tiesibas parstavet tiesibu subjektu | DOC |
| LR Uznemumu registra fizisko personu datu izmainu saraksta apraksts | DOC |

## API Base URL Pattern
All APIs are accessed via: `https://apigw.viss.gov.lv{context_path}`
Example: `https://apigw.viss.gov.lv/legalentity`

## MVP Subscribe List
1. UR-API-SearchLegalEntities
2. UR-API-LegalEntity
3. UR-API-AnnualReport
4. UR-API-NaturalPerson (v1_2)
5. UR-API-LegalEntityChanges
