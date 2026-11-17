import { LectureData } from '../types';

/**
 * Generates an AI-ready Markdown (.md) document with YAML frontmatter
 * containing all structured and raw information from the lecture so another AI
 * (ChatGPT, Claude, Gemini, NotebookLM, Obsidian, Cursor, etc.) can analyze it.
 */
export function buildAiReadyMarkdownClient(lecture: LectureData): string {
  const nowIso = new Date().toISOString();
  const title = lecture.title || 'Aula Transcrita';
  const subject = lecture.subject || 'Geral';
  const duration = lecture.estimatedDuration || 'N/A';
  const language = lecture.language || 'pt-BR';
  const partsCount = lecture.partsCount || 1;

  const takeawaysList = Array.isArray(lecture.keyTakeaways)
    ? lecture.keyTakeaways.map((k) => `- ${k}`).join('\n')
    : '';

  const timelineList = Array.isArray(lecture.timelineTopics)
    ? lecture.timelineTopics
        .map((t) => `- **[${t.timestamp}] ${t.title}**: ${t.description}`)
        .join('\n')
    : '';

  const segmentsList = Array.isArray(lecture.segments)
    ? lecture.segments
        .map(
          (s) =>
            `### [${s.startTime} - ${s.endTime || ''}] ${s.speaker}${
              s.topic ? ` — *${s.topic}*` : ''
            }\n${s.text}\n`
        )
        .join('\n')
    : '';

  const glossaryList = Array.isArray(lecture.glossary)
    ? lecture.glossary
        .map((g) => `- **${g.term}**: ${g.definition}`)
        .join('\n')
    : '';

  const flashcardsList = Array.isArray(lecture.flashcards)
    ? lecture.flashcards
        .map(
          (f, idx) =>
            `${idx + 1}. **Pergunta:** ${f.front}\n   **Resposta:** ${f.back}`
        )
        .join('\n\n')
    : '';

  const quizList = Array.isArray(lecture.quiz)
    ? lecture.quiz
        .map(
          (q, idx) =>
            `### Questão ${idx + 1}: ${q.question}\n` +
            (Array.isArray(q.options)
              ? q.options
                  .map(
                    (opt, optIdx) =>
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
    ? lecture.practicalApplications.map((p) => `- ${p}`).join('\n')
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
 * Triggers a browser download of the AI-ready .md file
 */
export function downloadAiReadyMarkdown(lecture: LectureData): string {
  const mdContent = buildAiReadyMarkdownClient(lecture);
  const slug = (lecture.title || 'aula_transcrita')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);

  const filename =
    lecture.savedMdFilename || `${slug || 'aula'}_para_ia.md`;

  const blob = new Blob([mdContent], {
    type: 'text/markdown;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}
