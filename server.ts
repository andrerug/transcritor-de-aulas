import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSCRICOES_DIR = path.resolve(__dirname, 'transcricoes');

// Ensure /transcricoes folder exists on startup
fs.mkdir(TRANSCRICOES_DIR, { recursive: true }).catch(() => {});

/**
 * Formats a structured lecture into an AI-ready Markdown (.md) document
 * with YAML frontmatter and complete sections for downstream AI analysis.
 */
function buildAiReadyMarkdown(lecture: any): string {
  const nowIso = new Date().toISOString();
  const title = lecture.title || 'Aula Transcrita';
  const subject = lecture.subject || 'Geral';
  const duration = lecture.estimatedDuration || 'N/A';
  const language = lecture.language || 'pt-BR';
  const partsCount = lecture.partsCount || 1;

  const takeawaysList = Array.isArray(lecture.keyTakeaways)
    ? lecture.keyTakeaways.map((k: string) => `- ${k}`).join('\n')
    : '';

  const timelineList = Array.isArray(lecture.timelineTopics)
    ? lecture.timelineTopics
        .map(
          (t: any) =>
            `- **[${t.timestamp}] ${t.title}**: ${t.description}`
        )
        .join('\n')
    : '';

  const segmentsList = Array.isArray(lecture.segments)
    ? lecture.segments
        .map(
          (s: any) =>
            `### [${s.startTime} - ${s.endTime || ''}] ${s.speaker}${
              s.topic ? ` — *${s.topic}*` : ''
            }\n${s.text}\n`
        )
        .join('\n')
    : '';

  const glossaryList = Array.isArray(lecture.glossary)
    ? lecture.glossary
        .map((g: any) => `- **${g.term}**: ${g.definition}`)
        .join('\n')
    : '';

  const flashcardsList = Array.isArray(lecture.flashcards)
    ? lecture.flashcards
        .map(
          (f: any, idx: number) =>
            `${idx + 1}. **Pergunta:** ${f.front}\n   **Resposta:** ${f.back}`
        )
        .join('\n\n')
    : '';

  const quizList = Array.isArray(lecture.quiz)
    ? lecture.quiz
        .map(
          (q: any, idx: number) =>
            `### Questão ${idx + 1}: ${q.question}\n` +
            (Array.isArray(q.options)
              ? q.options
                  .map(
                    (opt: string, optIdx: number) =>
                      `- (${String.fromCharCode(65 + optIdx)}) ${opt}`
                  )
                  .join('\n')
              : '') +
            `\n- **Gabarito:** Alternativa ${String.fromCharCode(
              65 + (q.correctIndex || 0)
            )}\n- **Justificativa:** ${q.explanation || ''}\n`
        )
        .join('\n')
    : '';

  const practicalList = Array.isArray(lecture.practicalApplications)
    ? lecture.practicalApplications.map((p: string) => `- ${p}`).join('\n')
    : '';

  return `---
title: "${title.replace(/"/g, '\\"')}"
subject: "${subject.replace(/"/g, '\\"')}"
estimated_duration: "${duration}"
language: "${language}"
parts_merged: ${partsCount}
created_at: "${nowIso}"
format: "ai-ready-lecture-transcript"
---

# ${title}

- **Disciplina / Área:** ${subject}
- **Duração Estimada:** ${duration}
- **Idioma:** ${language}
- **Partes Unificadas:** ${partsCount}
- **Data da Transcrição:** ${nowIso}

---

## 1. Resumo Executivo (Síntese para IA)
${lecture.summary || ''}

---

## 2. Principais Pontos-Chave (Key Takeaways)
${takeawaysList}

---

## 3. Linha do Tempo e Estrutura de Tópicos
${timelineList}

---

## 4. Transcrição Estruturada por Segmentos e Oradores
${segmentsList}

${
  lecture.rawTranscript
    ? `---\n\n## 5. Transcrição Bruta Integral (Texto Corrido Original)\n${lecture.rawTranscript}\n`
    : ''
}
---

## 6. Caderno de Notas Didáticas
${lecture.studyNotesMarkdown || ''}

---

## 7. Glossário Técnico da Aula
${glossaryList}

---

## 8. Aplicações Práticas
${practicalList}

---

## 9. Flashcards de Memorização
${flashcardsList}

---

## 10. Quiz de Verificação e Gabarito Comentado
${quizList}
`;
}

/**
 * Automatically saves the lecture as a .md file inside /transcricoes/
 */
async function saveLectureToMarkdownFolder(
  lecture: any
): Promise<{ savedMdPath: string; savedMdFilename: string }> {
  await fs.mkdir(TRANSCRICOES_DIR, { recursive: true });
  const slug = (lecture.title || 'aula_transcrita')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);

  const dateStamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  const filename = `${slug || 'aula'}_${dateStamp}.md`;
  const fullPath = path.join(TRANSCRICOES_DIR, filename);

  const mdContent = buildAiReadyMarkdown(lecture);
  await fs.writeFile(fullPath, mdContent, 'utf-8');

  return {
    savedMdPath: `transcricoes/${filename}`,
    savedMdFilename: filename,
  };
}

const app = express();
const httpServer = createServer(app);
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Shared Gemini client utility on the server with required User-Agent header and v1beta API version
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.');
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Resilient audio transcription helper that tries gemini-3.5-transcribe on v1beta first and falls back to gemini-3.8-flash / gemini-flash-latest if 404
async function transcribeAudioResilient(
  ai: GoogleGenAI,
  audioPart: { inlineData: { mimeType: string; data: string } },
  promptText: string
): Promise<{ text: string; usedModel: string }> {
  const candidateModels = [
    'gemini-3.5-transcribe',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ];

  let lastError: any = null;
  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [audioPart, { text: promptText }],
        },
      });
      const text = (response.text || '').trim();
      return { text, usedModel: modelName };
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err || '');
      console.warn(
        `Aviso: Modelo ${modelName} indisponível (${msg.slice(0, 120)}). Tentando próximo modelo...`
      );
      // Continue to fallback model on 404 / NOT_FOUND / unsupported method
    }
  }
  throw lastError || new Error('Não foi possível transcrever o áudio com os modelos disponíveis.');
}

// Resilient structured content helper with fallback between gemini-3.8-flash and gemini-flash-latest
async function generateStructuredContentResilient(
  ai: GoogleGenAI,
  contents: any,
  config: any
): Promise<string> {
  const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config,
      });
      return response.text || '';
    } catch (err: any) {
      lastError = err;
      console.warn(
        `Aviso: Modelo ${modelName} indisponível para estruturação. Tentando fallback...`
      );
    }
  }
  throw lastError || new Error('Falha ao gerar conteúdo estruturado da aula.');
}

// Endpoint 0: Direct Microphone Audio Transcription using gemini-3.5-transcribe (with automatic fallback)
app.post('/api/transcribe-mic', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm', prompt } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Nenhum áudio fornecido para transcrição.' });
    }

    const ai = getGeminiClient();

    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: audioBase64,
      },
    };

    const { text: transcript, usedModel } = await transcribeAudioResilient(
      ai,
      audioPart,
      prompt ||
        'Transcreva este áudio fielmente em português (pt-BR), preservando pontuação e termos técnicos.'
    );

    return res.json({
      success: true,
      transcript,
      model: usedModel,
    });
  } catch (error: any) {
    console.error('Erro na transcrição de microfone:', error);
    return res.status(500).json({
      error:
        error?.message ||
        'Falha ao transcrever o áudio do microfone.',
    });
  }
});

// Endpoint 1A: Transcribe a single split chunk of a large audio file
app.post('/api/transcribe-chunk', async (req, res) => {
  try {
    const {
      audioBase64,
      mimeType = 'audio/wav',
      partIndex = 1,
      totalParts = 1,
      startTimeFormatted = '00:00',
      endTimeFormatted = '',
      lectureTitle,
    } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Parte de áudio vazia.' });
    }

    const ai = getGeminiClient();

    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/wav',
        data: audioBase64,
      },
    };

    const promptText = `Transcreva integralmente esta Parte ${partIndex} de ${totalParts} da aula${
      lectureTitle ? ` "${lectureTitle}"` : ''
    } (intervalo de tempo aproximado: ${startTimeFormatted}${
      endTimeFormatted ? ` até ${endTimeFormatted}` : ''
    }). Preserve todos os detalhes, explicações e termos técnicos em português.`;

    const { text: transcript, usedModel } = await transcribeAudioResilient(
      ai,
      audioPart,
      promptText
    );

    return res.json({
      success: true,
      partIndex,
      totalParts,
      startTimeFormatted,
      endTimeFormatted,
      transcript,
      model: usedModel,
    });
  } catch (error: any) {
    console.error(`Erro ao transcrever parte ${req.body?.partIndex}:`, error);
    return res.status(500).json({
      error:
        error?.message ||
        `Falha ao transcrever a parte ${req.body?.partIndex || ''} do áudio.`,
    });
  }
});

// Endpoint 1B: Transcribe Single Audio File or Mic Recording + structure lecture
app.post('/api/transcribe-audio', async (req, res) => {
  try {
    const {
      audioBase64,
      mimeType = 'audio/mp3',
      lectureTitle,
      lectureSubject,
      targetLanguage = 'pt-BR',
    } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Nenhum áudio fornecido para transcrição.' });
    }

    const ai = getGeminiClient();

    // Step 1: High-accuracy verbatim audio transcription (tries gemini-3.5-transcribe on v1beta first, with fallback)
    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/mp3',
        data: audioBase64,
      },
    };

    const { text: rawTranscript } = await transcribeAudioResilient(
      ai,
      audioPart,
      'Transcreva este áudio integralmente e com alta fidelidade em português.'
    );

    // Step 2: Structure the transcribed audio into full pedagogical study material
    const systemPrompt = `Você é um especialista em educação universitária, pedagogia e transcrição fonética e didática em Português (${targetLanguage}).
Sua tarefa é analisar a transcrição do áudio de uma aula ou palestra e produzir um material de estudo rico, didático e estruturado.

Instruções fundamentais:
1. Organize a transcrição integral do áudio em segmentos cronológicos com carimbo de tempo (ex: "00:00", "00:35"), identificando os oradores (ex: "Professor", "Aluno 1").
2. Remova vícios de linguagem excessivos (gaguejos, "hãã", "né"), mantendo a fidelidade ao texto transcrito e a precisão técnica.
3. Estruture a resposta OBRIGATORIAMENTE em formato JSON válido contendo exatamente as seguintes propriedades:
{
  "title": "Título claro e atrativo da aula",
  "subject": "Área ou disciplina (ex: História, Biologia, IA, Direito, etc.)",
  "estimatedDuration": "Duração estimada da aula (ex: 12 min)",
  "language": "pt-BR",
  "rawTranscript": "Transcrição corrida original",
  "summary": "Resumo executivo da aula em 2 a 3 parágrafos bem articulados",
  "keyTakeaways": ["Ponto chave 1", "Ponto chave 2", "Ponto chave 3", "Ponto chave 4", "Ponto chave 5"],
  "segments": [
    {
      "id": 1,
      "startTime": "00:00",
      "endTime": "00:35",
      "speaker": "Professor",
      "text": "Conteúdo falado...",
      "topic": "Título do tópico correspondente"
    }
  ],
  "timelineTopics": [
    {
      "timestamp": "00:00",
      "title": "Introdução ao conceito",
      "description": "Breve síntese do que foi abordado nesta seção"
    }
  ],
  "glossary": [
    {
      "term": "Termo Técnico ou Conceito",
      "definition": "Explicação simplificada e direta no contexto da aula"
    }
  ],
  "studyNotesMarkdown": "# Notas da Aula\\n\\n### 1. Conceito Central\\n...",
  "flashcards": [
    {
      "front": "Pergunta ou conceito para memorização",
      "back": "Resposta didática e concisa"
    }
  ],
  "quiz": [
    {
      "id": 1,
      "question": "Pergunta de fixação baseada no conteúdo ensinado",
      "options": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
      "correctIndex": 0,
      "explanation": "Explicação pedagógica do porquê essa é a alternativa correta."
    }
  ],
  "practicalApplications": ["Aplicação prática 1", "Aplicação prática 2"]
}
IMPORTANTE: Retorne APENAS o JSON puro, sem marcações markdown como \`\`\`json ou texto introdutório.`;

    const structureContents = rawTranscript
      ? `Transcrição obtida do áudio da aula:\n"""\n${rawTranscript}\n"""\n\nAnalise detalhadamente esta aula.${
          lectureTitle ? ` Título sugerido: "${lectureTitle}".` : ''
        }${
          lectureSubject ? ` Disciplina: "${lectureSubject}".` : ''
        } Extraia todo o conteúdo ensinado, timestamps, glossário, flashcards e quiz.`
      : {
          parts: [
            audioPart,
            {
              text: `Analise detalhadamente esta aula.${
                lectureTitle ? ` Título sugerido: "${lectureTitle}".` : ''
              }${
                lectureSubject ? ` Disciplina: "${lectureSubject}".` : ''
              } Extraia todo o conteúdo ensinado, timestamps, glossário, flashcards e quiz.`,
            },
          ],
        };

    const responseText = await generateStructuredContentResilient(
      ai,
      structureContents,
      {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      }
    );

    let parsedData;
    try {
      parsedData = JSON.parse(responseText.trim());
    } catch {
      const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    parsedData.rawTranscript = rawTranscript || parsedData.rawTranscript;
    parsedData.partsCount = 1;

    try {
      const savedInfo = await saveLectureToMarkdownFolder(parsedData);
      parsedData.savedMdPath = savedInfo.savedMdPath;
      parsedData.savedMdFilename = savedInfo.savedMdFilename;
    } catch (saveErr) {
      console.error('Aviso ao salvar .md na pasta transcricoes:', saveErr);
    }

    return res.json({ success: true, data: parsedData, rawTranscript });
  } catch (error: any) {
    console.error('Erro na transcrição de áudio:', error);
    return res.status(500).json({
      error: error?.message || 'Falha ao processar o áudio com a inteligência artificial.',
    });
  }
});

// Endpoint 2: Process text transcript, merged multi-part transcripts, or lecture notes
app.post('/api/process-lesson-text', async (req, res) => {
  try {
    const {
      rawText,
      lectureTitle,
      lectureSubject,
      targetLanguage = 'pt-BR',
      partsCount = 1,
      totalDurationFormatted = '',
    } = req.body;

    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ error: 'Texto ou anotação da aula não fornecida.' });
    }

    const ai = getGeminiClient();

    const systemPrompt = `Você é um professor e pesquisador acadêmico sênior especialista em estruturação pedagógica de aulas.
O usuário vai fornecer o texto bruto ou a transcrição unificada de uma aula (podendo ser a junção organizada de múltiplas partes de áudio transcritas, ou anotações de aula).
Sua missão é organizar, unificar perfeitamente todas as partes sem perder conteúdo e transformar esse material em uma aula estruturada de altíssimo nível acadêmico e pedagógico.

Instruções para múltiplas partes:
- Se o texto contiver marcações de partes (ex: [PARTE 1: 00:00 - 06:00], [PARTE 2: 06:00 - 12:00]), junte tudo em uma sequência cronológica contínua e coesa de segmentos, respeitando os horários de início e fim de cada parte.
- Crie vários segmentos detalhados cobrindo desde o início (Parte 1) até o final da última parte da aula.

Estruture a resposta OBRIGATORIAMENTE em formato JSON válido contendo exatamente as seguintes propriedades:
{
  "title": "Título didático e formal da aula",
  "subject": "Disciplina / Tema",
  "estimatedDuration": "${totalDurationFormatted || 'Duração estimada da aula'}",
  "language": "${targetLanguage}",
  "summary": "Resumo executivo completo da aula unificando todas as partes (2 a 4 parágrafos explicativos)",
  "keyTakeaways": ["Ponto chave 1", "Ponto chave 2", "Ponto chave 3", "Ponto chave 4", "Ponto chave 5"],
  "segments": [
    {
      "id": 1,
      "startTime": "00:00",
      "endTime": "02:15",
      "speaker": "Professor",
      "text": "Texto polido e articulado do segmento...",
      "topic": "Nome do tópico abordado"
    }
  ],
  "timelineTopics": [
    {
      "timestamp": "00:00",
      "title": "Introdução",
      "description": "Síntese do tópico"
    }
  ],
  "glossary": [
    {
      "term": "Termo Técnico",
      "definition": "Significado detalhado e simples"
    }
  ],
  "studyNotesMarkdown": "# Notas Completas da Aula\\n\\n...",
  "flashcards": [
    {
      "front": "Pergunta do conceito",
      "back": "Explicação e resposta"
    }
  ],
  "quiz": [
    {
      "id": 1,
      "question": "Pergunta conceitual para fixação",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Justificativa da resposta"
    }
  ],
  "practicalApplications": ["Aplicação prática 1", "Aplicação prática 2"]
}
Retorne APENAS o JSON puro.`;

    const responseText = await generateStructuredContentResilient(
      ai,
      `Aqui está a transcrição completa (${
        partsCount > 1 ? `unificada a partir de ${partsCount} partes de áudio` : 'texto bruto'
      }) da aula para organizar e estruturar pedagogicamente:\n\n${rawText}\n\nTítulo informado: ${
        lectureTitle || 'Não especificado'
      }\nDisciplina: ${lectureSubject || 'Não especificada'}${
        totalDurationFormatted ? `\nDuração total do áudio: ${totalDurationFormatted}` : ''
      }`,
      {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      }
    );

    let parsedData;
    try {
      parsedData = JSON.parse(responseText.trim());
    } catch {
      const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    parsedData.rawTranscript = rawText;
    parsedData.partsCount = partsCount;
    if (totalDurationFormatted) {
      parsedData.estimatedDuration = totalDurationFormatted;
    }

    try {
      const savedInfo = await saveLectureToMarkdownFolder(parsedData);
      parsedData.savedMdPath = savedInfo.savedMdPath;
      parsedData.savedMdFilename = savedInfo.savedMdFilename;
    } catch (saveErr) {
      console.error('Aviso ao salvar .md na pasta transcricoes:', saveErr);
    }

    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Erro no processamento do texto da aula:', error);
    return res.status(500).json({
      error: error?.message || 'Falha ao estruturar a aula com a inteligência artificial.',
    });
  }
});

// Endpoint 3: Ask questions about the lecture (Tirar Dúvidas com o Professor Virtual)
app.post('/api/ask-lecture-question', async (req, res) => {
  try {
    const { question, lectureContext } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Pergunta não informada.' });
    }

    const ai = getGeminiClient();

    const systemPrompt = `Você é o Professor e Tutor Acadêmico desta aula específica.
Seu objetivo é sanar dúvidas de alunos sobre o conteúdo explicado na aula, sempre com tom encorajador, didático, claro e fundamentado no conteúdo ministrado.
Se a resposta constar diretamente no conteúdo da aula, mencione o momento/tópico onde o assunto foi abordado.
Se for uma dúvida complementar que vai além da aula, responda conectando com o que o professor explicou.
Formate a resposta em Markdown com clareza, listas e exemplos do cotidiano quando útil.`;

    const answerText = await generateStructuredContentResilient(
      ai,
      `Contexto da aula ministrada:\n${JSON.stringify(lectureContext, null, 2)}\n\nDúvida do estudante:\n${question}`,
      {
        systemInstruction: systemPrompt,
      }
    );

    return res.json({
      success: true,
      answer: answerText || 'Não foi possível gerar a resposta.',
    });
  } catch (error: any) {
    console.error('Erro ao tirar dúvida da aula:', error);
    return res.status(500).json({
      error: error?.message || 'Falha ao processar a dúvida da aula.',
    });
  }
});

// Endpoint 4: Save or update any lecture into /transcricoes/*.md on demand
app.post('/api/save-transcription-md', async (req, res) => {
  try {
    const { lecture } = req.body;
    if (!lecture) {
      return res.status(400).json({ error: 'Dados da aula não informados.' });
    }
    const savedInfo = await saveLectureToMarkdownFolder(lecture);
    const mdContent = buildAiReadyMarkdown(lecture);
    return res.json({
      success: true,
      ...savedInfo,
      mdContent,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || 'Erro ao salvar arquivo .md na pasta transcricoes.',
    });
  }
});

// Endpoint 5: List all saved .md files inside /transcricoes/
app.get('/api/saved-transcriptions', async (_req, res) => {
  try {
    await fs.mkdir(TRANSCRICOES_DIR, { recursive: true });
    const entries = await fs.readdir(TRANSCRICOES_DIR);
    const mdFiles = entries.filter((f) => f.endsWith('.md'));

    const filesInfo = await Promise.all(
      mdFiles.map(async (filename) => {
        const filePath = path.join(TRANSCRICOES_DIR, filename);
        const stat = await fs.stat(filePath);
        return {
          filename,
          relativePath: `transcricoes/${filename}`,
          sizeBytes: stat.size,
          createdAt: stat.mtime.toISOString(),
        };
      })
    );

    filesInfo.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.json({
      success: true,
      folderPath: 'transcricoes/',
      files: filesInfo,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || 'Erro ao listar a pasta transcricoes/.',
    });
  }
});

// Endpoint 6: Read or download a specific .md file from /transcricoes/
app.get('/api/saved-transcriptions/:filename', async (req, res) => {
  try {
    const safeName = path.basename(req.params.filename);
    if (!safeName.endsWith('.md')) {
      return res.status(400).json({ error: 'Arquivo inválido.' });
    }
    const fullPath = path.join(TRANSCRICOES_DIR, safeName);
    const content = await fs.readFile(fullPath, 'utf-8');

    if (req.query.download === '1') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeName}"`
      );
      return res.send(content);
    }

    return res.json({
      success: true,
      filename: safeName,
      relativePath: `transcricoes/${safeName}`,
      content,
    });
  } catch (err: any) {
    return res.status(404).json({
      error: 'Arquivo .md não encontrado na pasta transcricoes/.',
    });
  }
});

// WebSocket Server for Real-Time Voice Conversation via Gemini Live API (gemini-3.8-live)
const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (request, socket, head) => {
  const url = request.url || '';
  if (url.startsWith('/api/live')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', async (clientWs: WebSocket, request) => {
  let session: any = null;

  try {
    const reqUrl = new URL(
      request.url || '/api/live',
      `http://${request.headers.host || 'localhost'}`
    );
    const voiceName = reqUrl.searchParams.get('voice') || 'Zephyr';
    const lectureTitle = reqUrl.searchParams.get('title') || '';
    const lectureSubject = reqUrl.searchParams.get('subject') || '';
    const lectureSummary = reqUrl.searchParams.get('summary') || '';

    const ai = getGeminiClient();

    const baseInstruction = `Você é um Professor Universitário e Tutor Acadêmico interativo em uma conversa de voz ao vivo em Português do Brasil (pt-BR).
Seja claro, acolhedor, didático e conciso nas respostas faladas. Incentive o raciocínio do estudante, dê exemplos práticos e tire dúvidas em tempo real.`;

    const contextInstruction = lectureTitle
      ? `\n\nContexto da aula atual em estudo:\nTítulo: ${lectureTitle}\nDisciplina: ${lectureSubject}\nResumo: ${lectureSummary}`
      : '';

    const sessionPromise = ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: baseInstruction + contextInstruction,
      },
      callbacks: {
        onopen: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'connected', model: 'gemini-3.8-live' }));
          }
        },
        onmessage: (message: LiveServerMessage) => {
          if (clientWs.readyState !== WebSocket.OPEN) return;

          const content = message.serverContent;

          // Forward user input audio transcription
          if (content?.inputTranscription?.text) {
            clientWs.send(
              JSON.stringify({
                type: 'input_transcription',
                text: content.inputTranscription.text,
              })
            );
          }

          // Forward model output audio transcription
          if (content?.outputTranscription?.text) {
            clientWs.send(
              JSON.stringify({
                type: 'output_transcription',
                text: content.outputTranscription.text,
              })
            );
          }

          // Forward 24kHz PCM audio chunks from model
          for (const part of content?.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) {
              clientWs.send(
                JSON.stringify({
                  type: 'audio',
                  audio: part.inlineData.data,
                })
              );
            }
          }

          if (content?.turnComplete) {
            clientWs.send(JSON.stringify({ type: 'turn_complete' }));
          }

          if (content?.interrupted) {
            clientWs.send(JSON.stringify({ type: 'interrupted' }));
          }
        },
        onerror: (err: any) => {
          console.error('Erro na sessão Gemini Live:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: 'error',
                error: err?.message || 'Erro na conexão com Gemini Live API.',
              })
            );
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'closed' }));
          }
        },
      },
    });

    session = await sessionPromise;

    clientWs.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.audio) {
          sessionPromise.then((s) => {
            s.sendRealtimeInput({
              audio: {
                data: data.audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          });
        } else if (data.text) {
          sessionPromise.then((s) => {
            s.sendRealtimeInput({
              text: data.text,
            });
          });
        }
      } catch (e) {
        console.error('Erro ao processar mensagem WebSocket do cliente:', e);
      }
    });

    clientWs.on('close', () => {
      if (session) {
        try {
          session.close();
        } catch {}
      }
    });
  } catch (error: any) {
    console.error('Falha ao iniciar sessão Gemini Live:', error);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          error:
            error?.message || 'Não foi possível iniciar a conversa ao vivo (gemini-3.8-live).',
        })
      );
      clientWs.close();
    }
  }
});

// Configure Vite or Static files
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Servidor Transcritor de Aulas rodando na porta ${port}`);
  });
}

startServer();
