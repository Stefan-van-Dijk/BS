# BS — boodschappenapp

Zelfstandige Nederlandse webapp zonder dependencies of build. Producten en gerechten beheren, categorieën en submenu's, zoeken, meerdere lijsten, aantallen, notities, afvinken, delen als tekst, barcodekoppeling en JSON-back-ups.

## Publiceren op GitHub Pages

Settings → Pages → Deploy from a branch → main → /(root) → Save. De verwachte URL na publicatie is https://stefan-van-dijk.github.io/BS/.

## Starten en gegevens

Importeer het volledige `overzicht-BS.csv`. De kopregel bevat categorienamen; puntkomma's scheiden de kolommen. De losse BS-bestanden en uitsneden worden niet samengevoegd. Persoonlijke gegevens worden niet gepubliceerd in deze openbare repository: import vindt in de browser plaats, opslag in localStorage. Er zijn geen externe scripts of analytics. Maak regelmatig een JSON-back-up; wissen van browsergegevens, privémodus of een ander domein/browserprofiel kan lokale data onbereikbaar maken. JSON-herstel vervangt na validatie en bevestiging de volledige staat. CSV-import vervangt de catalogus en is alleen toegestaan bij lege lijsten.

Notatie: `(c)` verwijst naar een submenu; `(a)` naar een gerecht waarvan komma's de ingrediënten scheiden. `(x)` en `(y)` zijn voorlopig geïnterpreteerd als aantal en vrije tekst; beide velden zijn voor ieder product beschikbaar. `..`, `…` en `<` worden overgeslagen. De oorspronkelijke Shortcut is nog niet gecontroleerd.

Producten worden alleen op hoofdletters en witruimte vergeleken. Hoeveelheden en eenheden in namen blijven letterlijk behouden. `250 gr. Kipfilet` en `Kipfilet` zijn verschillende producten. Er is geen automatische eenheidsconversie of spellingcorrectie. Nasi en Tagliatelle hebben geen ingrediënten en kunnen in Beheren aangevuld worden. Ongemarkeerde samengestelde keuzes met komma's blijven één product; maak hiervan zo nodig een gerecht.

## Barcode

Bekende codes voegen een product toe aan de actieve lijst. Onbekende codes kun je aan een product koppelen. Codes kunnen getypt worden of ingevoerd met een scanner die als toetsenbord werkt. Camerascan gebruikt BarcodeDetector indien ondersteund, HTTPS en cameratoestemming. Zonder ondersteuning blijft handmatige invoer beschikbaar. Er is geen externe productdatabase. Camerascan is nog niet op fysieke telefoons geverifieerd.

## Accounts en Sharon

Accounts, cloudsync, gezamenlijk bewerken en een Sharon-koppeling zijn nog niet geïmplementeerd. Het datamodel gebruikt schemaVersion 1, afzonderlijke categories/products/recipes/lists, stabiele UUIDs en productId-verwijzingen. Barcodes zijn productkenmerken. Een adapter kan later UUIDs aan Sharon-identifiers koppelen. Voor echte accounts is een backend nodig met authenticatie, huishoudlidmaatschap en toegangscontrole per lijst; voeg conflictresolutie en versiebeheer toe vóór synchronisatie. Geheimen horen niet in de openbare frontend.

## Ontwikkelen

`node --test core.test.mjs`

Met de volledige bron: `BS_SOURCE=/pad/overzicht-BS.csv node --test core.test.mjs`.

Lokaal starten: `python3 -m http.server 8000`, open http://localhost:8000.
