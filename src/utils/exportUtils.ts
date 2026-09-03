import { FlashcardDeck, StudyExplanation, StudyPlan, FormulaCheatSheetData } from '../types';

/**
 * Downloads a text file with a specified filename and mime type.
 */
export function downloadTextFile(content: string, filename: string, mimeType: string = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Copies text to the user's clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard write failed, using fallback textarea', err);
  }

  // Fallback
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed', err);
    return false;
  }
}

/**
 * Exports a Flashcard Deck to standard Anki TSV format.
 * Format: Front \t Back \t Tags
 */
export function exportFlashcardsToAnki(deck: FlashcardDeck) {
  const header = `#separator:tab\n#html:true\n#tags column:3\n`;
  const rows = deck.cards.map((card) => {
    // Clean tabs and newlines inside fields for TSV
    const cleanFront = card.front.replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const cleanBack = card.back.replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const tag = (card.conceptTag || deck.topic).replace(/\s+/g, '_');
    return `${cleanFront}\t${cleanBack}\t${tag}`;
  });

  const content = header + rows.join('\n');
  const safeTitle = deck.topic.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
  downloadTextFile(content, `${safeTitle}_anki_deck.tsv`, 'text/tab-separated-values;charset=utf-8');
}

/**
 * Exports a Flashcard Deck to human-readable Markdown.
 */
export function exportFlashcardsToMarkdown(deck: FlashcardDeck) {
  let md = `# Flashcard Deck: ${deck.deckTitle}\n`;
  md += `**Topic:** ${deck.topic} | **Total Cards:** ${deck.cards.length} | **Created:** ${new Date(deck.createdAt).toLocaleDateString()}\n\n---\n\n`;

  deck.cards.forEach((card, idx) => {
    md += `### Card ${idx + 1}: ${card.conceptTag || 'Concept'}\n`;
    md += `**Q:** ${card.front}\n\n`;
    md += `**A:** ${card.back}\n\n`;
    if (card.hint) {
      md += `*Hint:* ${card.hint}\n\n`;
    }
    md += `---\n\n`;
  });

  const safeTitle = deck.topic.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
  downloadTextFile(md, `${safeTitle}_flashcards.md`, 'text/markdown;charset=utf-8');
}

/**
 * Exports a Study Explanation to formatted Markdown.
 */
export function exportExplanationToMarkdown(exp: StudyExplanation) {
  let md = `# Study Notes: ${exp.topic}\n\n`;
  md += `> **Difficulty:** ${exp.difficulty} | **Generated:** ${new Date(exp.generatedAt).toLocaleDateString()}\n\n`;

  md += `## 1. Core Concept Explanation\n\n${exp.simpleExplanation}\n\n`;
  md += `## 2. Intuitive Everyday Analogy\n\n${exp.easyAnalogy}\n\n`;

  if (exp.keyPoints && exp.keyPoints.length > 0) {
    md += `## 3. Key Takeaways & Principles\n\n`;
    exp.keyPoints.forEach((point) => {
      md += `- ${point}\n`;
    });
    md += `\n`;
  }

  if (exp.example) {
    md += `## 4. Real-World Application & Example\n\n${exp.example}\n\n`;
  }

  const questions = exp.practiceQuestions && exp.practiceQuestions.length > 0
    ? exp.practiceQuestions
    : exp.practiceQuestion ? [exp.practiceQuestion] : [];

  if (questions.length > 0) {
    md += `## 5. Practice & Self-Check Questions\n\n`;
    questions.forEach((q, idx) => {
      md += `### Question ${idx + 1}\n${q.question}\n\n`;
      q.options.forEach((opt, optIdx) => {
        const isCorrect = optIdx === q.correctOptionIndex;
        md += `- [${isCorrect ? 'x' : ' '}] **${String.fromCharCode(65 + optIdx)}:** ${opt}${isCorrect ? ' *(Correct)*' : ''}\n`;
      });
      md += `\n**Explanation:** ${q.explanation}\n\n`;
      if (q.hint) {
        md += `*Hint:* ${q.hint}\n\n`;
      }
    });
  }

  const safeTitle = exp.topic.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
  downloadTextFile(md, `${safeTitle}_study_notes.md`, 'text/markdown;charset=utf-8');
}

/**
 * Exports a Study Plan to Markdown checklist.
 */
export function exportStudyPlanToMarkdown(plan: StudyPlan) {
  let md = `# Exam Revision Schedule: ${plan.planTitle}\n\n`;
  md += `**Target Exam:** ${plan.examName} | **Days Remaining:** ${plan.daysRemaining} | **Daily Commitment:** ${plan.dailyHours} hrs/day\n\n`;
  md += `*${plan.overview}*\n\n---\n\n`;

  if (plan.phases && plan.phases.length > 0) {
    md += `## Revision Phases\n\n`;
    plan.phases.forEach((p) => {
      md += `### ${p.phaseName} (${p.dayRange})\n${p.phaseFocus}\n\n`;
    });
    md += `---\n\n`;
  }

  md += `## Daily Checklist\n\n`;
  plan.tasks.forEach((t) => {
    md += `### Day ${t.dayNumber}: ${t.title} [${t.priority} Priority - ~${t.estimatedMinutes}m]\n`;
    md += `**Topic:** ${t.topic}\n\n`;
    t.actionSteps.forEach((step) => {
      md += `- [${t.completed ? 'x' : ' '}] ${step}\n`;
    });
    md += `\n`;
  });

  if (plan.topExamTips && plan.topExamTips.length > 0) {
    md += `---\n\n## High-Yield Test Day Tips\n\n`;
    plan.topExamTips.forEach((tip) => {
      md += `- ${tip}\n`;
    });
    md += `\n`;
  }

  const safeTitle = plan.examName.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
  downloadTextFile(md, `${safeTitle}_revision_checklist.md`, 'text/markdown;charset=utf-8');
}
