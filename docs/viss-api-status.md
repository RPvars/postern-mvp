# VISS / Uzņēmumu Reģistra API — Integrācijas statuss

Pēdējo reizi atjaunināts: 2026-03-07

---

## Pašreizējais stāvoklis

| Komponente | Statuss | Piezīme |
|---|---|---|
| mTLS savienojums (pingpong) | ✅ Strādā | `vissapi.viss.gov.lv` atgriež "Healthy" |
| Transaction API | ✅ Strādā | Sertifikāts + eServiceId akceptēts |
| OAuth2 access_token | ❌ Bloķēts | PFAS STS kļūda ID4058 |
| Business Register API dati | ❌ Nav reāli | `BR_USE_MOCK_DATA="true"` |

---

## Galvenais bloķētājs: ID4058

### Kāpēc rodas

No **VDAA vadlīnijām v2.7, §5.2** (officiāla definīcija):

> "Sertifikāts, kurš tiek izmantots izsaukumā ir vai nu **deaktivizēts/nav aktīvs** vai arī tam beidzies termiņš. Otrs variants, ka tiek lietots produkcijas vides sertifikāts testa vides talona iegūšanai vai arī otrādāk."

### Kāpēc tas notiek mums

No **VDAA vadlīnijām v2.7, §3.1** (obligāts solis, kas nav izdarīts):

> "**!!! Iegūto sertifikātu sūtīt uz e-pasta adresi - atbalsts@vdaa.gov.lv**, kā arī pieminēt priekš kuras vides sertifikāts vajadzīgs - testa vai produkcijas."

Sertifikāts `FP_RPAVARS_chain_modern.pfx` nav nosūtīts uz VDAA aktivizēšanai. PFAS STS to nepazīst → ID4058.

### Risinājums

Nosūtīt e-pastu uz **atbalsts@vdaa.gov.lv** (gatavs teksts: `docs/vdaa-support-email.md`).

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

---

## API endpoint karte (jāizlabo pēc auth)

Pašreizējais kods `lib/business-register/client/http.ts` izmanto nepareizus ceļus:

| Kods (nepareizi) | Reālais endpoint |
|---|---|
| `GET /companies/search` | `GET https://apigw.viss.gov.lv/searchlegalentities/search/legal-entities?q=...` |
| `GET /companies/{regcode}` | `GET https://apigw.viss.gov.lv/legalentity/legal-entity/{regcode}` |
| `GET /companies/{regcode}/board-members` | No `UR-API-NaturalPerson` (jāprecizē) |

Katram API ir savs context path — `BR_API_BASE_URL` kā vienots URL nestrādās. `http.ts` ir jāpārraksta ar hardcoded base URLs katram API.

---

## Nākamie soļi (secībā)

### 1. TAGAD — e-pasts VDAA
Nosūtīt `docs/vdaa-support-email.md` saturu uz **atbalsts@vdaa.gov.lv**

### 2. Pēc VDAA atbildes — pārbaudīt
```bash
npx tsx scripts/test-certificate.ts
```
Step 5 "OAuth Token" jāparāda `[PASS]`.

### 3. Pēc veiksmīgas auth — labot API ceļus
Pārtaisīt `lib/business-register/client/http.ts` ar pareizajiem endpoint URL.

### 4. Ieslēgt reālos datus
```env
BR_USE_MOCK_DATA="false"
BR_API_BASE_URL=""   # vairs nav vajadzīgs — katram API savs URL
```

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

---

## Izmēģinātās metodes un rezultāti

| Metode | Rezultāts | Iemesls |
|---|---|---|
| Basic Auth + `client_credentials` | `unsupported_grant_type` | Default key manager disabled portālā |
| Basic Auth + `password` grant | "user failed validation using PFAS" | Portāla lietotāji nav PFAS lietotāji |
| JWT `client_assertion` | `ID4058` | Sertifikāts nav aktivizēts VDAA |
| mTLS bez tokena | 401/403 | API prasa Bearer token |
| Pingpong ar mTLS | `200 Healthy` | Transaction API pieejams bez tokena |
