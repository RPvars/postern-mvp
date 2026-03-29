# VISS / Uzņēmumu Reģistra API — Integrācijas statuss

Pēdējo reizi atjaunināts: 2026-03-25

---

## Pašreizējais stāvoklis

| Komponente | Statuss | Piezīme |
|---|---|---|
| mTLS savienojums (pingpong) | ✅ Strādā | `vissapi.viss.gov.lv` atgriež "Healthy" |
| Transaction API | ✅ Strādā | Sertifikāts + eServiceId akceptēts |
| OAuth2 access_token | ✅ Strādā | JWT client_assertion flow |
| Business Register API dati | ✅ Strādā | `BR_USE_MOCK_DATA="false"` |

---

## Autentifikācijas flow (JWT client_assertion)

Vienīgā strādājošā metode saskaņā ar VDAA dokumentāciju — Basic auth un password grant **nestrādā** (default key manager disabled portālā).

### JWT struktūra

**Header:**
```json
{
  "typ": "JWT",
  "alg": "RS256",
  "x5c": ["<base64 DER sertifikāts>"]
}
```

**Claims:**
```json
{
  "iss": "<UUID bez urn:oauth2: prefiksa>",
  "sub": "<UUID bez urn:oauth2: prefiksa>",
  "aud": "https://ha.viss.gov.lv/STS/VISS.Pfas.STS/oauth2/token",
  "jti": "<uuid>",
  "iat": <now>,
  "nbf": <now>,
  "exp": <now + 3600>
}
```

### Token pieprasījums

```
POST https://apigw.viss.gov.lv/token
Content-Type: application/x-www-form-urlencoded

client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
client_assertion=<JWT>
grant_type=client_credentials
client_id=<UUID>
client_secret=<Consumer Secret>
```

Kods implementēts: `lib/business-register/client/auth.ts`

---

## Pašreizējā konfigurācija

| Parametrs | Vērtība |
|---|---|
| Aplikācija portālā | `APP-FP_RPAVARS-CLARO` |
| Consumer Key | `urn:oauth2:873bef8c-0121-4ce9-9280-4c750a6be494` |
| Sertifikāts | `/Users/ralfspavars/certificates/FP_RPAVARS_chain_modern.pfx` |
| Token endpoint | `https://apigw.viss.gov.lv/token` |
| Transaction API | `https://vissapi.viss.gov.lv/ApiManagement.TransactionApi/transactions` |
| eServiceId | `URN:IVIS:100001:EP.DA-DA616-V1-0` |

### API abonements (portālā)

- `UR-API-SearchLegalEntities` v1.0 — uzņēmumu meklēšana
- `UR-API-LegalEntity` v1.0 — uzņēmuma detaļas
- `UR-API-AnnualReport` v1.0 — gada pārskati
- `UR-API-NaturalPerson` v1_2 — valdes locekļi

### Vēl nav abonēti

- `UR-API-CommercialPledge` v1.0 — komercķīlu akti
- `UR-API-CommercialPledgeChanges` v1.0 — komercķīlu izmaiņas

---

## Svarīgākās saites

| Resurss | URL |
|---|---|
| VDAA API pārvaldnieks | https://www.vdaa.gov.lv/lv/api-parvaldnieks |
| VISS API dokumentācija | https://viss.gov.lv/lv/Informacijai/Dokumentacija/Koplietosanas_komponentes/API_Parvaldnieks |
| Vadlīnijas v2.7 (PDF) | https://viss.gov.lv/-/media/Files/VRAA/Dokumentacija/Koplietosanas_komponentes/APIparvaldnieks/Administrativie_dokumenti/APIPvadlinijasv27.ashx |
| Datu apmaiņas vadlīnijas v2.23 | https://viss.gov.lv/-/media/Files/VRAA/Dokumentacija/Koplietosanas_komponentes/APIparvaldnieks/Dokumentacija/VISS2016VDLDAPMv223.ashx |
| Postman kolekcija (PFAS-WSO2) | https://api.npoint.io/6eeef13dc97dd42846c3 |
| Developer portāls | https://api.viss.gov.lv/devportal/apis |
| Sertifikāta pieprasījums | https://www.vdaa.gov.lv/lv/api-parvaldnieks#sertifikata-pieprasijums |
| Atbalsts | atbalsts@vdaa.gov.lv |
