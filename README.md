# Etiqueta GRU3 — SP-RR-002

Sistema de etiquetas **GRU3 (SP-RR-002)** para Anjun Express — base de dados na planilha Google Sheets [Base Etiquetas GRU3](https://docs.google.com/spreadsheets/d/1-K5l5D0K3MhRto6dHfaVEvkXP-WFOalkgNjSSRQ2kE4/).

**Repositório:** [github.com/lgpguga/Etiquta_GRU3](https://github.com/lgpguga/Etiquta_GRU3)

## Funcionamento

- **IATA/HUB**: lista de códigos carregada da aba **IATA** da planilha (coluna A).
- O usuário escolhe um código em uma lista suspensa e informa a quantidade de etiquetas.
- Cada etiqueta mostra o código do HUB — sem QR Code, serial ou controle de banco de dados.

## Planilha Google Sheets

**Link:** [Base Etiquetas GRU3](https://docs.google.com/spreadsheets/d/1-K5l5D0K3MhRto6dHfaVEvkXP-WFOalkgNjSSRQ2kE4/edit?gid=0#gid=0)

### Aba necessária

| Aba  | Colunas (linha 1 = cabeçalho) | Uso                           |
|------|-------------------------------|-------------------------------|
| IATA | IATA (coluna A)                | Lista de códigos HUB para o dropdown. |

## Google Apps Script

O site chama um **Google Apps Script** vinculado à planilha para ler a lista de IATA.

### Como configurar o script

1. Abra a planilha [Base Etiquetas GRU3](https://docs.google.com/spreadsheets/d/1-K5l5D0K3MhRto6dHfaVEvkXP-WFOalkgNjSSRQ2kE4/).
2. Menu **Extensões** → **Apps Script**.
3. Apague o conteúdo do arquivo `Code.gs` e cole o conteúdo da pasta `google-apps-script/Code.gs` deste projeto.
4. Na **primeira vez**, clique em **Executar** (ícone ▶) em `getIataList` para autorizar o script.
5. Salve (Ctrl+S).
6. **Implantar** → **Nova implantação** → tipo **Aplicativo da Web**:
   - **Executar como:** Eu.
   - **Quem tem acesso:** Qualquer pessoa.
7. Copie a **URL da implantação** (termina em `/exec`).

## Variável de ambiente

No projeto Next.js, crie o arquivo `.env.local` na raiz:

```env
APP_SCRIPT_URL=https://script.google.com/macros/s/SUA_ID_IMPLANTACAO/exec
```

Substitua `SUA_ID_IMPLANTACAO` pela URL completa do seu Apps Script.

## Executar localmente

```bash
npm install
cp .env.example .env.local   # edite .env.local e coloque a URL do Apps Script
npm run dev
```

Acesse `http://localhost:3000`.

## Tamanho da etiqueta

- **100mm x 150mm** — adequado para impressora Zebra térmica
- Etiqueta com espelhamento: linha no meio, mesmos dados em cima e embaixo (para dobrar na saca)
