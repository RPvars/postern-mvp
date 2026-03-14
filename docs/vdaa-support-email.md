# E-pasts VDAA — produkcijas sertifikāta pieprasījums

**Kam:** atbalsts@vdaa.gov.lv
**Temats:** PFAS sertifikāta pieprasījums - FP_RPAVARS (produkcijas vide)

---

Labdien,

Lūdzu sagatavot PFAS sertifikātu API piekļuvei **produkcijas vidē**.

Iestādes identifikators: FP_RPAVARS
Lietotājvārds: API_RPAVARS
eServiceId: URN:IVIS:100001:EP.DA-DA616-V1-0
Mērķis: Uzņēmumu Reģistrs API integrācija produkcijas vidē

Pievienots sertifikāta pieprasījums failā FP_RPAVARS.req.

(Piezīme: 2026. gada janvārī tika sagatavots testa vides sertifikāts. Tagad nepieciešams ekvivalents produkcijas videi.)

Paldies,
Ralfs Pāvārs
ralfs.pavars@gmail.com
+371 29997132

---

## Piezīmes

- Jāpievieno **FP_RPAVARS.req** fails (tāds pats `.req` fails kā janvārī, vai jāizveido jauns — jautāt VDAA)
- Lietotājvārds produkcijas videi: `API_RPAVARS` (testa vidē bija `APITV_RPAVARS`)
- Pēc sertifikāta saņemšanas atjaunināt `.env`: `BR_CERTIFICATE_PATH` un `BR_CERTIFICATE_PASSWORD`
