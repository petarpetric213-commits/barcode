# EAN13 Generator

Modern, profesionalna i potpovo besplatna web aplikacija za generisanje EAN-13 barkoda. Radi potpovo lokalno u pretraživaču — bez servera, bez baze podataka, bez registracije i bez ograničenja.

## Funkcionalnosti

- Generisanje EAN-13 barkoda iz 12 ili 13 cifara
- Automatsko izračunavanje kontrolne (13.) cifre
- Provera ispravnosti unetog broja
- Vizuelni prikaz barkoda u realnom vremenu (JsBarcode)
- Ručni unos kompletnog 13-cifrenog broja sa proverom kontrolne cifre
- Generisanje slučajnog validnog EAN-13 broja
- Generisanje više barkoda odjednom (bulk generator)
- Preuzimanje kao PNG, SVG, PDF i ZIP arhiva
- Podešavanje širine, visine, veličine teksta, margine i rezolucije izvoza
- Istoriju poslednjih 50 barkoda (lokalno u pretraživaču)
- Kopiranje broja, štampanje, uvoz CSV/TXT liste
- Svetla i tamna tema, potpovo prilagođeno mobilnim uređajima
- Stranica *O aplikaciji* sa objašnjenjem EAN-13 standarda i GS1 napomenom

## Tehnički stack

- HTML5, CSS3, Vanilla JavaScript (bez build alata)
- [JsBarcode](https://lindell.me/JsBarcode/) — generisanje barkoda
- [jsPDF](https://github.com/MrRio/jsPDF) — izvoz PDF
- [JSZip](https://stukszip.github.io/jszip/) — ZIP arhive
- Bibliotke su vendorisane u `/lib` — radi bez spoljne mreže nakon prvog učitavanja

## Pokretanje lokalno

Otvori `index.html` direktno u pretraživaču, ili pokreni lokalni server:

```bash
python3 -m http.server 8000
```

Zatim otvori `http://localhost:8000`.

## Distribucija

Spremno za GitHub Pages, Netlify ili Vercel — treba samo kopirati celi direktorijum (staticki hosting).

## Važna napomena

Generisanje matematički validnog EAN-13 broja ne znači da je korisniku dodeljen zvaničan GS1 identifikacioni broj. Za komercijalnu identifikaciju proizvoda potrebno je koristiti GS1 dodeljene brojeve.

## Licenca

Besplatno za korišćenje.
