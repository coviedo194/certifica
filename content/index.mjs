import { ab410 } from './ab410.mjs';

export const certifications = [ab410];

export const certificationInterests = [
  {
    id: 'gh-300', code: 'GH-300', title: 'GitHub Copilot',
    url: 'https://learn.microsoft.com/es-mx/credentials/certifications/github-copilot/?practice-assessment-type=certification',
    verified: '2026-11-16',
  },
  {
    id: 'ab-100', code: 'AB-100', title: 'Agentic AI Business Solutions Architect Expert',
    url: 'https://learn.microsoft.com/es-mx/credentials/certifications/exams/ab-100/',
    verified: '2026-11-16',
  },
];

export function validateContent(catalog = certifications) {
  const certIds = new Set();
  for (const cert of catalog) {
    if (certIds.has(cert.id)) throw new Error(`Certificación duplicada: ${cert.id}`);
    certIds.add(cert.id);
    const sourceIds = new Set(cert.sources.map(s => s.id));
    const lessonIds = new Set();
    const domainIds = new Set(cert.domains.map(d => d.id));
    for (const lesson of cert.lessons) {
      if (lessonIds.has(lesson.id) || !domainIds.has(lesson.domain) || !lesson.blocks.length || !lesson.objectives.length) {
        throw new Error(`Lección inválida: ${lesson.id}`);
      }
      lessonIds.add(lesson.id);
      if (!lesson.sources.length || lesson.sources.some(id => !sourceIds.has(id))) throw new Error(`Fuentes inválidas: ${lesson.id}`);
      for (const block of lesson.blocks) {
        if (!Array.isArray(block.concepts) || block.concepts.length < 1 || block.concepts.length > 3 ||
            block.concepts.some(concept => typeof concept !== 'string' || !concept.trim())) {
          throw new Error(`Conceptos de diapositiva inválidos: ${lesson.id}`);
        }
        if (block.kind === 'recall' && (!Array.isArray(block.guidance) || block.guidance.length < 2 ||
            block.guidance.some(point => typeof point !== 'string' || !point.trim()))) {
          throw new Error(`Guía de recuperación inválida: ${lesson.id}`);
        }
        const { image } = block;
        if (!image) continue;
        if (['src', 'alt', 'caption', 'originalUrl', 'attribution', 'license', 'licenseUrl', 'licenseSource', 'reviewed']
          .some(field => typeof image[field] !== 'string' || !image[field].trim()) ||
          !/^\/study-media\/[a-z0-9-]+\/[a-z0-9-]+\.png$/.test(image.src) ||
          !lesson.sources.includes(image.source) ||
          !Number.isInteger(image.width) || image.width <= 0 || !Number.isInteger(image.height) || image.height <= 0) {
          throw new Error(`Ilustración inválida: ${lesson.id}`);
        }
      }
    }
    const questionIds = new Set();
    for (const q of cert.questions) {
      if (questionIds.has(q.id) || !lessonIds.has(q.lessonId) || !q.objective ||
          q.provenance !== 'original' || q.options.length !== 4 ||
          new Set(q.options).size !== q.options.length ||
          !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length ||
          q.explanations.length !== q.options.length || q.explanations.some(e => !e) ||
          !q.sources.length || q.sources.some(id => !sourceIds.has(id))) {
        throw new Error(`Pregunta inválida: ${q.id}`);
      }
      questionIds.add(q.id);
      // The correct option must not stand out by length (more than 10% over the longest distractor).
      const longestDistractor = Math.max(...q.options.filter((_, i) => i !== q.answer).map(o => o.length));
      if (q.options[q.answer].length > longestDistractor * 1.1) throw new Error(`Pista por longitud: ${q.id}`);
    }
    // Across the bank, "pick the longest" must not beat chance (25% with four options) by much.
    const longest = cert.questions.filter(q =>
      q.options[q.answer].length > Math.max(...q.options.filter((_, i) => i !== q.answer).map(o => o.length))).length;
    if (longest > cert.questions.length * 0.35) throw new Error(`Sesgo de longitud en ${cert.id}: ${longest}/${cert.questions.length}`);
    if (cert.recommended.length !== lessonIds.size || new Set(cert.recommended).size !== lessonIds.size ||
        cert.recommended.some(id => !lessonIds.has(id))) throw new Error(`Ruta inválida: ${cert.id}`);
  }
}
