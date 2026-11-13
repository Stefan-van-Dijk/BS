# Publiceren via GitHub Actions

1. Open de repository-instellingen: Settings → Pages.
2. Kies onder Build and deployment bij Source **GitHub Actions**. Dit vervangt de eerdere instructie om vanaf main / root te publiceren.
3. Merge de pull request met deze workflow.
4. Open Actions → Publish GitHub Pages en controleer of build en deploy slagen.
5. Open de URL die de deploy-job bij environment github-pages teruggeeft.

Als de workflow al is gemergd voordat Pages is ingesteld: kies Actions → Publish GitHub Pages → Run workflow → main.

De workflow controleert de JavaScript-syntax en voert de tests uit voordat publicatie mogelijk is. Pull requests testen en verpakken alleen; ze publiceren niet. Alleen index.html, style.css, app.mjs en core.mjs worden gepubliceerd. Persoonlijke CSV-bestanden, back-ups en tests worden niet opgenomen.

De eenmalige Pages-instelling vereist repositorybeheer via GitHub. De workflow bevat geen persoonlijke toegangstokens en gebruikt uitsluitend de ingebouwde GITHUB_TOKEN en OIDC-toestemming. Een geslaagde test is nog geen geslaagde publicatie; controleer ook de deploy-job.
