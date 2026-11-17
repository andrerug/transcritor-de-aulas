# Transcritor de Aulas

Transcreve aulas e reuniões gravadas ou ao vivo e gera transcrição com tempo, resumo, notas de estudo, glossário, flashcards e quiz. Feito no Google AI Studio e adaptado pelo professor André Viana para o curso IA para o serviço público.

Código aberto e gratuito. Esta é uma cópia pública, sem chaves.

## Como rodar

1. Instale o Node.js.
2. Copie `.env.example` para `.env` e coloque a sua chave do Gemini em `GEMINI_API_KEY`. A chave se cria em aistudio.google.com.
3. Só se for usar a importação do Google Drive, preencha `firebase-applet-config.json` com os dados do seu próprio projeto Firebase.
4. `npm install` e depois `npm run dev`.

## Cuidados

- Nunca coloque a chave dentro do código nem envie o arquivo `.env` para o GitHub.
- Não grave nem transcreva reunião com dado pessoal sensível sem base legal. Siga a LGPD e as normas do seu órgão.
- As aulas de exemplo e os nomes que aparecem nelas são fictícios.
