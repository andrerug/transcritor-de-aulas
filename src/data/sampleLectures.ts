import { LectureData } from '../types';

export const SAMPLE_LECTURES: LectureData[] = [
  {
    title: 'Arquitetura dos Modelos de Linguagem e Redes Transformers',
    subject: 'Ciência da Computação & Inteligência Artificial',
    estimatedDuration: '08:24 min',
    language: 'pt-BR',
    summary:
      'Esta aula aborda a evolução das arquiteturas de Inteligência Artificial para Processamento de Linguagem Natural, destacando a transição de Redes Neurais Recorrentes (RNNs) e LSTMs para o mecanismo de Atenção e os modelos Transformers (Vaswani et al., 2017). O professor detalha a importância do Self-Attention, a tokenização vetorial (embeddings), o posicionamento posicional e a fase de pré-treinamento seguida por alinhamento (RLHF).',
    keyTakeaways: [
      'O mecanismo de Autoatenção (Self-Attention) permitiu o processamento paralelo em larga escala, superando o gargalo sequencial das RNNs.',
      'Embeddings transformam palavras e subpalavras em representações vetoriais de alta dimensão contendo proximidade semântica.',
      'O positional encoding resolve o problema de ordem em uma arquitetura que processa todas as palavras simultaneamente.',
      'O processo moderno compreende pré-treinamento em terabytes de dados seguido por Fine-Tuning supervisionado e alinhamento ético.',
      'Modelos autoregressivos preveem probabilisticamente o próximo token calculando a distribuição softmax.'
    ],
    segments: [
      {
        id: 1,
        startTime: '00:00',
        endTime: '00:45',
        speaker: 'Prof. Marcos Vasconcelos',
        topic: 'Abertura & Contexto Histórico',
        text: 'Olá a todos! Sejam muito bem-vindos à nossa aula sobre Fundamentos de Modelos de Linguagem. Hoje vamos compreender como saímos das antigas redes recorrentes para o artigo seminal de 2017 da Google, "Attention Is All You Need", que redefiniu completamente a inteligência artificial moderna.'
      },
      {
        id: 2,
        startTime: '00:46',
        endTime: '01:50',
        speaker: 'Prof. Marcos Vasconcelos',
        topic: 'O Limite das Redes Recorrentes (RNNs)',
        text: 'Antes de 2017, utilizávamos RNNs e LSTMs. O problema fundamental era a dependência sequencial: para calcular a palavra número 50 de uma frase, você precisava passar obrigatoriamente pelas 49 anteriores. Isso causava dois problemas críticos: desaparecimento do gradiente em textos longos e impossibilidade de paralelizar o treino nas GPUs.'
      },
      {
        id: 3,
        startTime: '01:51',
        endTime: '02:30',
        speaker: 'Mariana (Aluna)',
        topic: 'Dúvida sobre Paralelismo',
        text: 'Professor, então quer dizer que o Transformer consegue olhar a frase inteira de uma vez só, em vez de ler palavra por palavra como um ser humano?'
      },
      {
        id: 4,
        startTime: '02:31',
        endTime: '04:15',
        speaker: 'Prof. Marcos Vasconcelos',
        topic: 'Mecanismo de Autoatenção (Self-Attention)',
        text: 'Exatamente, Mariana! Essa é a genialidade da arquitetura. Através do Self-Attention, o modelo calcula uma matriz de afinidade entre todas as palavras. Por exemplo, na frase "O banco bloqueou o cartão porque ele suspeitou de fraude", o pronome "ele" calcula atenção máxima para "banco", e não para "cartão". Esse cálculo é feito através de três vetores matemáticos: Query, Key e Value.'
      },
      {
        id: 5,
        startTime: '04:16',
        endTime: '05:40',
        speaker: 'Prof. Marcos Vasconcelos',
        topic: 'Embeddings e Codificação Posicional',
        text: 'Como o modelo recebe todas as palavras ao mesmo tempo, ele não saberia qual palavra veio primeiro se não fosse a Codificação Posicional (Positional Encoding). Nós somamos funções senoidais aos embeddings das palavras para que a rede saiba que "o cachorro mordeu o homem" é diferente de "o homem mordeu o cachorro".'
      },
      {
        id: 6,
        startTime: '05:41',
        endTime: '06:55',
        speaker: 'Prof. Marcos Vasconcelos',
        topic: 'Treinamento e Previsão de Próximo Token',
        text: 'Na prática, o que esses modelos fazem é previsão autoregressiva de próximo token. Eles recebem um contexto e geram uma distribuição de probabilidades sobre um vocabulário de cerca de 32 a 128 mil tokens. A cada passo, escolhem o próximo token com base em parâmetros como temperatura e top-p.'
      },
      {
        id: 7,
        startTime: '06:56',
        endTime: '08:24',
        speaker: 'Prof. Marcos Vasconcelos',
        topic: 'Conclusão e Próximos Passos',
        text: 'Para finalizar: lembrem-se de que os Transformers não se limitam a texto. Hoje temos Vision Transformers (ViT), modelos multimodais de áudio e vídeo como o Gemini. Na próxima aula prática, vamos codificar um mecanismo de atenção em PyTorch do zero. Leiam o capítulo 4 da bibliografia!'
      }
    ],
    timelineTopics: [
      {
        timestamp: '00:00',
        title: 'Introdução aos Modelos Fundacionais',
        description: 'Contextualização histórica e o marco do artigo "Attention Is All You Need".'
      },
      {
        timestamp: '00:46',
        title: 'Gargalos das RNNs e LSTMs',
        description: 'Problema do gradiente evanescente e incapacidade de paralelização massiva em GPUs.'
      },
      {
        timestamp: '02:31',
        title: 'Mecanismo de Query, Key e Value',
        description: 'Como a Autoatenção calcula a relação semântica entre tokens simultâneos.'
      },
      {
        timestamp: '04:16',
        title: 'Positional Encoding & Vetorização',
        description: 'Preservação da ordem temporal e sintática através de vetores senoidais.'
      },
      {
        timestamp: '05:41',
        title: 'Amostragem e Previsão Autoregressiva',
        description: 'Distribuição softmax, temperatura e decodificação sequencial de tokens.'
      }
    ],
    glossary: [
      {
        term: 'Transformer',
        definition: 'Arquitetura de rede neural profunda baseada inteiramente no mecanismo de autoatenção, sem necessidade de recorrência ou convolução.'
      },
      {
        term: 'Self-Attention (Autoatenção)',
        definition: 'Mecanismo matemático que permite ao modelo ponderar a relevância de diferentes palavras de uma frase em relação a cada palavra específica.'
      },
      {
        term: 'Token',
        definition: 'Unidade fundamental de processamento de texto em LLMs, podendo ser uma palavra completa, raiz morfológica ou conjunto de caracteres.'
      },
      {
        term: 'Embedding',
        definition: 'Representação numérica contínua em formato vetorial de alta dimensão que codifica o significado semântico de um token.'
      },
      {
        term: 'Positional Encoding',
        definition: 'Vetor somado ao embedding de cada token para fornecer à rede informação sobre a posição relativa ou absoluta da palavra na sentença.'
      },
      {
        term: 'RLHF',
        definition: 'Reinforcement Learning from Human Feedback (Aprendizado por Reforço com Feedback Humano), técnica usada para alinhar respostas às preferências humanas de segurança e utilidade.'
      }
    ],
    studyNotesMarkdown: `# Aula: Arquitetura Transformers e Modelos de Linguagem
**Professor:** Marcos Vasconcelos | **Disciplina:** Ciência da Computação

---

## 1. Visão Geral e Quebra de Paradigma
Historicamente, tarefas de processamento de linguagem natural dependiam de arquiteturas recorrentes (**RNNs**) ou redes convolucionais (**CNNs**).
- **Problema central:** A recorrência exige processar $t$ após $t-1$, impedindo a paralelização nas GPUs modernas.
- **Solução de 2017:** A arquitetura **Transformer** eliminou completamente as etapas recorrentes, operando sobre todas as palavras simultaneamente através de **Atenção Pura**.

---

## 2. A Equação Fundamental da Atenção
O cálculo de atenção escalonada por produto escalar é dado por:

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$

Onde:
- **$Q$ (Query):** O que este token está procurando no texto.
- **$K$ (Key):** O que os outros tokens oferecem como identidade.
- **$V$ (Value):** O conteúdo informacional real transferido.
- **$\\sqrt{d_k}$:** Fator de escala para evitar saturação da função softmax quando as dimensões são grandes.

---

## 3. Resolução da Ordem Sintática: Codificação Posicional
Ao contrário das RNNs, que sabiam a ordem dos elementos naturalmente por serem executadas passo a passo, o Transformer não possui noção inata de posição. Para contornar isso, utiliza-se a codificação posicional baseada em funções trigonométricas de frequências alternadas:

$$PE_{(pos, 2i)} = \\sin\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right)$$
$$PE_{(pos, 2i+1)} = \\cos\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right)$$

---

## 4. Pipeline Moderno de um LLM
1. **Tokenização:** BPE (Byte-Pair Encoding) ou WordPiece.
2. **Pré-Treino Auto-Supervisionado:** Previsão de próximo token em terabytes de texto.
3. **SFT (Supervised Fine-Tuning):** Ajuste fino com perguntas e respostas didáticas.
4. **Alinhamento (RLHF / DPO):** Recompensa humana para mitigar toxicidade e alucinação.`,
    flashcards: [
      {
        front: 'Qual era a principal desvantagem das redes neurais recorrentes (RNNs) no processamento de linguagem?',
        back: 'A impossibilidade de processar palavras em paralelo nas GPUs, além do problema do desaparecimento do gradiente em sequências longas.'
      },
      {
        front: 'Quais são os 3 vetores essenciais no mecanismo de Atenção dos Transformers?',
        back: 'Query (Consulta), Key (Chave) e Value (Valor).'
      },
      {
        front: 'Por que o Positional Encoding é indispensável na arquitetura Transformer?',
        back: 'Porque os Transformers processam todas as palavras simultaneamente e, sem a codificação posicional, não saberiam a ordem sintática da frase.'
      },
      {
        front: 'O que o hiperparâmetro "Temperatura" controla na geração de texto de um LLM?',
        back: 'Controla a aleatoriedade e criatividade da distribuição de probabilidades: temperaturas baixas tornam a resposta mais determinística, enquanto altas incentivam diversidade.'
      }
    ],
    quiz: [
      {
        id: 1,
        question: 'Qual foi o principal avanço técnico introduzido pelo artigo "Attention Is All You Need" em 2017?',
        options: [
          'A introdução de neurônios convolucionais bidimensionais em textos curtos.',
          'A eliminação da recorrência temporal, permitindo treinamento massivamente paralelizado via Autoatenção.',
          'O uso de redes neurais biológicas conectadas a sensores analógicos.',
          'A substituição de vetores matemáticos por dicionários léxicos manuais.'
        ],
        correctIndex: 1,
        explanation: 'A eliminação das camadas recorrentes permitiu que todas as posições da frase fossem calculadas em paralelo nas placas de vídeo (GPUs), acelerando o treinamento em ordens de magnitude.'
      },
      {
        id: 2,
        question: 'No cálculo de Self-Attention, qual é a função do termo divisor $\\sqrt{d_k}$?',
        options: [
          'Aumentar artificialmente o número de parâmetros do modelo.',
          'Evitar que o produto escalar atinja valores muito altos que empurrariam a função softmax para regiões de gradiente quase nulo.',
          'Traduzir o texto automaticamente para outro idioma.',
          'Reduzir o tamanho do arquivo em disco do modelo treinado.'
        ],
        correctIndex: 1,
        explanation: 'Para dimensões grandes, produtos escalares crescem muito, deixando a softmax com gradientes minúsculos. O divisor normaliza a escala.'
      },
      {
        id: 3,
        question: 'O que representa o conceito de "Token" em modelos de linguagem modernos?',
        options: [
          'Uma moeda digital usada exclusivamente para pagar servidores.',
          'Um fragmento de texto (subpalavra, caractere ou palavra) mapeado para um identificador numérico.',
          'O nome da biblioteca gráfica utilizada no treinamento.',
          'O tempo exato de gravação de um áudio da aula.'
        ],
        correctIndex: 1,
        explanation: 'Tokens são os blocos construtores que a rede lê e escreve, frequentemente correspondendo a cerca de 4 caracteres de texto em português.'
      },
      {
        id: 4,
        question: 'Como a arquitetura Transformer consegue diferenciar frases com as mesmas palavras em ordens diferentes (ex: "o cão mordeu o gato" vs "o gato mordeu o cão")?',
        options: [
          'Ela não consegue diferenciar; necessita sempre de uma RNN auxiliar.',
          'Através da soma de vetores de Codificação Posicional (Positional Encoding) aos embeddings.',
          'Aumentando o volume do microfone durante a gravação.',
          'Removendo todos os pronomes e artigos da sentença.'
        ],
        correctIndex: 1,
        explanation: 'A Codificação Posicional insere uma assinatura numérica que identifica a posição exata de cada token na frase.'
      }
    ],
    practicalApplications: [
      'Construção de assistentes virtuais e tutores didáticos personalizados.',
      'Sumarização automática de artigos científicos e atas de reuniões.',
      'Tradução neural multilíngue em tempo real com preservação de contexto.',
      'Geração e depuração de código de software assistida por IA.'
    ]
  },
  {
    title: 'Biologia Celular: Bioenergética, Mitocôndrias e Ciclo de Krebs',
    subject: 'Ciências Biológicas & Medicina',
    estimatedDuration: '06:15 min',
    language: 'pt-BR',
    summary:
      'Uma aula fundamental sobre o metabolismo energético das células eucariontes. A professora explica as três fases da respiração celular aeróbia: Glicólise (no citosol), Ciclo do Ácido Cítrico (Ciclo de Krebs, na matriz mitocondrial) e Fosforilação Oxidativa (com a cadeia transportadora de elétrons e ATP sintase nas cristas mitocondriais).',
    keyTakeaways: [
      'A glicólise é anaeróbia e ocorre no hialoplasma celular, quebrando glicose em duas moléculas de piruvato.',
      'O ciclo de Krebs ocorre na matriz mitocondrial e tem como objetivo principal carregar transportadores de elétrons (NADH e FADH2).',
      'O oxigênio molecular atua como o aceptor final de elétrons na respiração aeróbia, formando água.',
      'A ATP sintase funciona como um motor rotativo molecular movido pelo gradiente de prótons (força próton-motriz).'
    ],
    segments: [
      {
        id: 1,
        startTime: '00:00',
        endTime: '01:10',
        speaker: 'Dra. Helena Prado',
        topic: 'A Moeda Energética Celular (ATP)',
        text: 'Bom dia, turma! Hoje vamos desvendar como as células transformam a comida que ingerimos em energia utilizável na forma de trifosfato de adenosina, o nosso famoso ATP. Pensem no ATP como a bateria recarregável de cada uma das nossas células.'
      },
      {
        id: 2,
        startTime: '01:11',
        endTime: '02:40',
        speaker: 'Dra. Helena Prado',
        topic: 'Etapa 1: A Glicólise Citoplasmática',
        text: 'A primeira fase é a Glicólise. Ela acontece fora da mitocôndria, no citosol. Uma molécula de glicose com 6 carbonos é clivada em dois piruvatos de 3 carbonos. O saldo líquido dessa etapa é de apenas 2 ATPs e 2 moléculas de NADH.'
      },
      {
        id: 3,
        startTime: '02:41',
        endTime: '04:20',
        speaker: 'Dra. Helena Prado',
        topic: 'Etapa 2: A Matriz Mitocondrial e o Ciclo de Krebs',
        text: 'Quando o piruvato entra na mitocôndria, ele perde um carbono como CO2 e se junta à Coenzima A, formando a Acetil-CoA. Na matriz mitocondrial, ocorre o Ciclo de Krebs. O grande objetivo desta etapa não é gerar montanhas de ATP, mas sim recolher prótons e elétrons de alta energia nos transportadores NADH e FADH2.'
      },
      {
        id: 4,
        startTime: '04:21',
        endTime: '06:15',
        speaker: 'Dra. Helena Prado',
        topic: 'Etapa 3: A Cadeia Respiratória e a Quimiosmose',
        text: 'Por fim, esses elétrons chegam à membrana interna da mitocôndria. Conforme os elétrons passam pelos complexos proteicos I, II, III e IV, eles bombeiam prótons H+ para o espaço intermembranar. Cria-se uma diferença de carga e pH gigantesca. Quando esses prótons voltam pela enzima ATP Sintase, ela gira e fosforila o ADP, gerando cerca de 28 a 30 ATPs adicionais!'
      }
    ],
    timelineTopics: [
      {
        timestamp: '00:00',
        title: 'Visão Geral do Metabolismo Energético',
        description: 'Estrutura do ATP e a importância da respiração aeróbia.'
      },
      {
        timestamp: '01:11',
        title: 'Glicólise no Citosol',
        description: 'Conversão da glicose em piruvato com rendimento líquido de 2 ATP.'
      },
      {
        timestamp: '02:41',
        title: 'Ciclo do Ácido Cítrico',
        description: 'Descarboxilação do piruvato e produção de carreadores NADH e FADH2.'
      },
      {
        timestamp: '04:21',
        title: 'Fosforilação Oxidativa e ATP Sintase',
        description: 'Gradiente de prótons, quimiosmose e ação do aceptor final de elétrons (O2).'
      }
    ],
    glossary: [
      {
        term: 'ATP (Trifosfato de Adenosina)',
        definition: 'Molécula de armazenamento e liberação rápida de energia livre nas reações químicas celulares.'
      },
      {
        term: 'Quimiosmose',
        definition: 'Movimento de íons através de uma membrana semipermeável a favor de seu gradiente eletroquímico para gerar ATP.'
      },
      {
        term: 'Aceptor Final de Elétrons',
        definition: 'Função do oxigênio na respiração celular; ao receber elétrons e prótons ao fim da cadeia, transforma-se em H2O.'
      },
      {
        term: 'Cristas Mitocondriais',
        definition: 'Dobras da membrana interna da mitocôndria onde estão ancorados os complexos proteicos da cadeia respiratória.'
      }
    ],
    studyNotesMarkdown: `# Aula de Biologia Celular: Respiração Celular
**Professora:** Dra. Helena Prado | **Tema:** Bioenergética

### As Três Etapas:
1. **Glicólise (Anaeróbia):** Citosol $\\rightarrow$ Quebra da Glicose em 2 Piruvatos. Saldo: +2 ATP, +2 NADH.
2. **Ciclo de Krebs (Aeróbio):** Matriz Mitocondrial $\\rightarrow$ Oxidação da Acetil-CoA gerando $CO_2$, NADH, $FADH_2$ e GTP/ATP.
3. **Cadeia Transportadora de Elétrons e Fosforilação Oxidativa:** Cristas Mitocondriais $\\rightarrow$ Quimiosmose via ATP Sintase com rendimento de ~28 ATP. Saldo total: ~30-32 ATP por molécula de glicose.`,
    flashcards: [
      {
        front: 'Onde ocorre a etapa da Glicólise na célula eucariótica?',
        back: 'No citosol (citoplasma hialoplasma), não necessitando de oxigênio.'
      },
      {
        front: 'Qual é o papel do Oxigênio ($O_2$) na respiração celular aeróbia?',
        back: 'Atua como aceptor final de elétrons e prótons ao término da cadeia respiratória, evitando que o sistema trave e formando água ($H_2O$).'
      },
      {
        front: 'Como a enzima ATP Sintase sintetiza ATP?',
        back: 'Aproveitando o fluxo de prótons H+ que retornam do espaço intermembranar para a matriz mitocondrial a favor do gradiente eletroquímico.'
      }
    ],
    quiz: [
      {
        id: 1,
        question: 'Em que compartimento mitocondrial ocorrem as reações do Ciclo de Krebs?',
        options: [
          'No espaço intermembranar.',
          'Na matriz mitocondrial.',
          'Na membrana externa.',
          'No complexo de Golgi.'
        ],
        correctIndex: 1,
        explanation: 'O Ciclo de Krebs (ou do ácido cítrico) ocorre inteiramente dissolvido na matriz mitocondrial.'
      },
      {
        id: 2,
        question: 'O que aconteceria com a cadeia respiratória se o suprimento de oxigênio fosse interrompido?',
        options: [
          'A velocidade de produção de ATP aumentaria dez vezes.',
          'Os complexos da cadeia ficariam saturados de elétrons e o transporte de prótons cessaria.',
          'A glicólise seria impedida de acontecer.',
          'A mitocôndria se desintegraria imediatamente em gordura.'
        ],
        correctIndex: 1,
        explanation: 'Sem o aceptor final (oxigênio), os elétrons não têm para onde ir, bloqueando a cadeia de transporte e paralisando a quimiosmose.'
      }
    ],
    practicalApplications: [
      'Compreensão do mecanismo de ação de venenos como cianeto (que bloqueia o complexo IV da mitocôndria).',
      'Fisiologia do exercício físico e acúmulo de ácido lático na ausência temporária de oxigênio muscular.',
      'Desenvolvimento de medicamentos contra doenças mitocondriais degenerativas.'
    ]
  },
  {
    title: 'A Queda do Muro de Berlim e a Geopolítica Pós-Guerra Fria',
    subject: 'História Contemporânea & Relações Internacionais',
    estimatedDuration: '07:10 min',
    language: 'pt-BR',
    summary:
      'Uma análise histórica detalhada dos eventos que culminaram na queda do Muro de Berlim em novembro de 1989. O professor examina as reformas de Mikhail Gorbachev (Glasnost e Perestroika), a crise econômica soviética, a abertura das fronteiras húngaras e a nova ordem internacional multipolar.',
    keyTakeaways: [
      'A crise do modelo soviético decorreu da estagnação econômica combinada a gastos militares desproporcionais.',
      'Gorbachev implementou a Glasnost (transparência política) e Perestroika (reestruturação econômica).',
      'A declaração acidental de Günter Schabowski na coletiva de 9 de novembro de 1989 precipitou a abertura imediata dos postos de checagem.',
      'A queda simbolizou o encerramento simbólico do século XX e o colapso do bloco socialista europeu.'
    ],
    segments: [
      {
        id: 1,
        startTime: '00:00',
        endTime: '01:30',
        speaker: 'Prof. Fernando Dias',
        topic: 'O Contexto de Berlim na Guerra Fria',
        text: 'Prezados alunos, para entender novembro de 1989, precisamos voltar a agosto de 1961, quando a República Democrática Alemã ergueu o Muro para conter a fuga massiva de cérebros e cidadãos em direção a Berlim Ocidental. O muro não era apenas concreto; era a representação física da Cortina de Ferro.'
      },
      {
        id: 2,
        startTime: '01:31',
        endTime: '03:15',
        speaker: 'Prof. Fernando Dias',
        topic: 'Gorbachev, Glasnost e Perestroika',
        text: 'Na década de 1980, a União Soviética enfrentava uma crise sem precedentes. O custo da corrida armamentista e a guerra no Afeganistão exauriram a economia. Ao assumir o poder em 1985, Mikhail Gorbachev introduz duas palavras que mudaram o mundo: Glasnost (abertura e transparência) e Perestroika (reestruturação econômica).'
      },
      {
        id: 3,
        startTime: '03:16',
        endTime: '05:00',
        speaker: 'Prof. Fernando Dias',
        topic: 'A Noite de 9 de Novembro de 1989',
        text: 'Em 9 de novembro de 1989, o porta-voz do partido Günter Schabowski cometeu um dos maiores desvios de comunicação da história. Questionado por um jornalista sobre quando as novas regras de viagem entrariam em vigor, ele respondeu: "Pelo que sei, entra em vigor imediatamente, sem demora". Milhares de alemães correram para os postos e os guardas, desorientados, não dispararam.'
      },
      {
        id: 4,
        startTime: '05:01',
        endTime: '07:10',
        speaker: 'Prof. Fernando Dias',
        topic: 'Consequências e a Nova Ordem Mundial',
        text: 'Menos de um ano depois, em outubro de 1990, a Alemanha estava oficialmente reunificada. Em dezembro de 1991, a própria União Soviética foi dissolvida. Entrávamos naquilo que Francis Fukuyama chamou de "O Fim da História" e em um mundo temporariamente unipolar liderado pelos Estados Unidos.'
      }
    ],
    timelineTopics: [
      {
        timestamp: '00:00',
        title: 'Origem do Muro de Berlim (1961)',
        description: 'Divisão física e ideológica da cidade e contenção do êxodo populacional.'
      },
      {
        timestamp: '01:31',
        title: 'As Reformas de Gorbachev (1985)',
        description: 'Perestroika e Glasnost enfraquecem o controle central de Moscou.'
      },
      {
        timestamp: '03:16',
        title: 'A Coletiva de Schabowski (09/11/1989)',
        description: 'O erro comunicacional que mobilizou centenas de milhares de pessoas aos postos de fronteira.'
      },
      {
        timestamp: '05:01',
        title: 'Reunificação Alemã e Dissolução da URSS',
        description: 'A transição para a geopolítica contemporânea dos anos 90.'
      }
    ],
    glossary: [
      {
        term: 'Glasnost',
        definition: 'Política soviética introduzida por Gorbachev visando maior liberdade de expressão e transparência nas decisões governamentais.'
      },
      {
        term: 'Perestroika',
        definition: 'Programa de reforma e reestruturação econômica que buscou modernizar a combalida economia planificada da URSS.'
      },
      {
        term: 'Cortina de Ferro',
        definition: 'Termo celebrizado por Winston Churchill para descrever a barreira ideológica e militar que separava a Europa Oriental da Ocidental.'
      },
      {
        term: 'Checkpoint Charlie',
        definition: 'O mais famoso ponto de cruzamento de fronteira entre Berlim Ocidental e Oriental durante a Guerra Fria.'
      }
    ],
    studyNotesMarkdown: `# História Contemporânea: A Queda do Muro de Berlim
**Professor:** Fernando Dias | **Disciplina:** História e Relações Internacionais

### Cronologia Essencial:
- **Agosto de 1961:** Construção do Muro de Berlim pela RDA.
- **1985:** Ascensão de Mikhail Gorbachev e início da *Glasnost* e *Perestroika*.
- **Verão de 1989:** Hungria abre fronteiras com a Áustria, gerando êxodo de alemães orientais.
- **9 de Novembro de 1989:** Queda do Muro após a declaração acidental de Schabowski.
- **3 de Outubro de 1990:** Reunificação oficial da Alemanha.
- **25 de Dezembro de 1991:** Renúncia de Gorbachev e fim da União Soviética.`,
    flashcards: [
      {
        front: 'O que significavam respectivamente Glasnost e Perestroika?',
        back: 'Glasnost significava abertura e transparência política; Perestroika significava reestruturação econômica.'
      },
      {
        front: 'Qual foi o gatilho direto que levou as multidões a derrubarem os postos do Muro em 9 de novembro de 1989?',
        back: 'A resposta acidental do porta-voz Günter Schabowski anunciando que a liberação de viagens ocorreria "imediatamente, sem demora".'
      },
      {
        front: 'Em que data ocorreu a reunificação formal da Alemanha?',
        back: 'Em 3 de outubro de 1990.'
      }
    ],
    quiz: [
      {
        id: 1,
        question: 'Qual país do leste europeu acelerou a crise de 1989 ao abrir sua cerca de fronteira com a Áustria no verão daquele ano?',
        options: [
          'A Polônia',
          'A Hungria',
          'A Romênia',
          'A Iugoslávia'
        ],
        correctIndex: 1,
        explanation: 'A abertura da fronteira húngara com a Áustria permitiu que milhares de cidadãos da Alemanha Oriental contornassem o muro e chegassem ao Ocidente.'
      },
      {
        id: 2,
        question: 'Quem foi o líder soviético responsável pelas reformas que culminaram no fim da Guerra Fria?',
        options: [
          'Leonid Brejnev',
          'Nikita Kruschev',
          'Mikhail Gorbachev',
          'Iosif Stalin'
        ],
        correctIndex: 2,
        explanation: 'Mikhail Gorbachev liderou a URSS de 1985 a 1991, promovendo a desescalada militar e as reformas internas.'
      }
    ],
    practicalApplications: [
      'Análise de riscos geopolíticos e expansão da OTAN nos dias de hoje.',
      'Compreensão dos impactos socioeconômicos da integração de países com modelos econômicos distintos.',
      'Estudos de diplomacia e resolução pacífica de conflitos internacionais.'
    ]
  }
];
