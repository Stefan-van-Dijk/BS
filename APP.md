# BS — boodschappenapp

Zelfstandige Nederlandse webapp zonder dependencies of build. Producten en gerechten beheren, categorieën en submenu's, zoeken, meerdere lijsten, aantallen, notities, afvinken, delen als tekst, barcodekoppeling en JSON-back-ups.

## Publiceren op GitHub Pages

Settings → Pages → Source: GitHub Actions. De verwachte URL na publicatie is https://stefan-van-dijk.github.io/BS/.

## Starten en gegevens

De standaardcatalogus wordt automatisch geladen. Aanvullend kun je het volledige `overzicht-BS.csv` importeren. De kopregel bevat categorienamen; puntkomma's scheiden de kolommen. De meegeleverde catalogus combineert alle 22 aangeleverde bestanden. Het hoofdoverzicht is leidend; ontbrekende productteksten en afwijkende gerechtvarianten worden toegevoegd. De bronbestandsnamen staan per record vermeld. De aangeleverde standaardcatalogus staat op verzoek openbaar in data/catalog.json en wordt automatisch geladen. Eigen lijsten en wijzigingen blijven in localStorage. Er zijn geen externe scripts of analytics. Maak regelmatig een JSON-back-up; wissen van browsergegevens, privémodus of een ander domein/browserprofiel kan lokale data onbereikbaar maken. JSON-herstel vervangt na validatie en bevestiging de volledige staat. CSV-import vervangt de catalogus en is alleen toegestaan bij lege lijsten.

Notatie: `(c)` verwijst naar een submenu; `(a)` naar een gerecht waarvan komma's de ingrediënten scheiden. `(x)` en `(y)` zijn voorlopig geïnterpreteerd als aantal en vrije tekst; beide velden zijn voor ieder product beschikbaar. `..`, `…` en `<` worden overgeslagen. De oorspronkelijke Shortcut is nog niet gecontroleerd.

Producten worden alleen op hoofdletters en witruimte vergeleken. Hoeveelheden en eenheden in namen blijven letterlijk behouden. `250 gr. Kipfilet` en `Kipfilet` zijn verschillende producten. Er is geen automatische eenheidsconversie of spellingcorrectie. Nasi en Tagliatelle hebben geen ingrediënten en kunnen in Beheren aangevuld worden. Ongemarkeerde samengestelde keuzes met komma's blijven één product; maak hiervan zo nodig een gerecht.

## Barcode

Bekende codes voegen een product toe aan de actieve lijst. Onbekende codes kun je aan een product koppelen. Codes kunnen getypt worden of ingevoerd met een scanner die als toetsenbord werkt. Camerascan gebruikt BarcodeDetector indien ondersteund, HTTPS en cameratoestemming. Zonder ondersteuning blijft handmatige invoer beschikbaar. Er is geen externe productdatabase. Camerascan is nog niet op fysieke telefoons geverifieerd.

## Accounts en Sharon

Accounts, cloudsync, gezamenlijk bewerken en een Sharon-koppeling zijn nog niet geïmplementeerd. Het datamodel gebruikt schemaVersion 1, afzonderlijke categories/products/recipes/lists, stabiele UUIDs en productId-verwijzingen. Barcodes zijn productkenmerken. Een adapter kan later UUIDs aan Sharon-identifiers koppelen. Voor echte accounts is een backend nodig met authenticatie, huishoudlidmaatschap en toegangscontrole per lijst; voeg conflictresolutie en versiebeheer toe vóór synchronisatie. Geheimen horen niet in de openbare frontend.

## Ontwikkelen

`node --test core.test.mjs catalog.test.mjs`

Met de volledige bron: `BS_SOURCE=/pad/overzicht-BS.csv node --test core.test.mjs`.

Lokaal starten: `python3 -m http.server 8000`, open http://localhost:8000.

## Dagelijks gebruik (2026-11-13)
Vandaag toont de actieve lijst, favorieten/gekochte producten en herbruikbare gerechten en activiteiten. Activiteiten delen dezelfde product-ID's; ze kunnen worden gemaakt, bewerkt of uit een lijst opgeslagen. Standaardvoorbeelden worden eenmaal toegevoegd. Er wordt geen voorraad afgeleid uit aankopen. Lijsten, favorieten, aankoopindicaties, activiteiten en verpakkingskoppelingen blijven lokaal en zitten in de JSON-back-up.

Barcodeherkenning vraagt bij onbekende codes Open Food Facts API v3 op, met timeout, sessiecache en maximaal tien opvragingen per minuut. Alleen een barcode wordt verstuurd; camerabeelden en lijsten blijven lokaal. De gebruiker controleert een voorstel en kiest een bestaand generiek product of maakt een nieuw product. Merken/verpakkingen blijven afzonderlijke metadata bij dat product. Bronverwijzingen en ODbL-attributie staan bij de scanner en gekoppelde verpakkingen. Onbekende codes, netwerkproblemen en ontbrekende productgegevens ondersteunen handmatige invoer. Voor gebruik op grotere schaal: registreer het app-gebruik bij Open Food Facts; browserrequests kunnen geen eigen User-Agent afdwingen. GS1, accounts, gedeelde live-lijsten en een actieve koppeling met Sharon zijn niet aangesloten.
