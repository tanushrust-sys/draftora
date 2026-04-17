'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import {
  Sparkles,
  Wand2,
  BookOpen,
  FileText,
  CalendarCheck2,
  ArrowRight,
  CheckCircle2,
  MessageSquareText,
  Lightbulb,
} from 'lucide-react';
import BrandLogo from '@/app/components/BrandLogo';
import styles from '@/app/components/marketing-home.module.css';

const SHOWCASE_THEMES = [
  styles.showcaseTone1,
  styles.showcaseTone2,
  styles.showcaseTone3,
] as const;

const SHOWCASE_SECTIONS = [
  {
    icon: Sparkles,
    title: 'Instant AI Feedback',
    description: 'Students get targeted, specific coaching within seconds of submitting a draft.',
    impact: ['Fast feedback', 'Specific coaching', 'Clear next steps'],
    prompt: 'Prompt: Explain why protecting rainforests matters.',
    draft: `The rainforest is important and we should protect it because animals live there. It helps the planet and people need it too. We should stop cutting trees and tell everyone to care about nature.`,
    feedback: {
      summary: 'Clear message and a strong cause, but you need concrete evidence and vivid detail.',
      strengths: [
        'Your purpose is clear from the first sentence.',
        'You connect rainforest protection to both animals and people.',
      ],
      improvements: [
        'Add one factual detail (for example: rainforest oxygen production or biodiversity).',
        'Replace broad words like "important" with precise language.',
        'Use a stronger ending line that motivates action.',
      ],
      vocabulary: ['biodiversity', 'conservation', 'ecosystem'],
      nextStep: 'Add one statistic and one sensory image, then tighten your ending into a single persuasive sentence.',
    },
  },
  {
    icon: Wand2,
    title: 'Smart Rewrites',
    description: 'Draftora keeps student intent, then upgrades clarity, tone, and sentence rhythm.',
    impact: ['Voice preserved', 'Sharper wording', 'Better flow'],
    prompt: 'Goal: Improve sentence impact for a sports reflection.',
    draft: `The match was fun and our team did good. We tried hard and then we won at the end.`,
    feedback: {
      summary: 'Meaning is clear, but wording is too generic and does not show game intensity.',
      strengths: [
        'You communicate effort and outcome clearly.',
        'Your sentence order is easy to follow.',
      ],
      improvements: [
        'Swap vague words like "fun" and "good" for specific verbs and adjectives.',
        'Add one detail from a key moment in the match.',
        'Vary sentence length so the rhythm feels more dynamic.',
      ],
      vocabulary: ['thrilling', 'disciplined', 'momentum'],
      nextStep: 'Rewrite with one high-pressure moment and one precise adjective that shows emotion, not just tells it.',
    },
  },
  {
    icon: BookOpen,
    title: 'Vocabulary Growth',
    description: 'Vocabulary suggestions are context-aware, so stronger words sound natural in student writing.',
    impact: ['Context-aware words', 'Natural usage', 'Sentence precision'],
    prompt: 'Word target: resilient',
    draft: `Mia lost two races and felt upset, but she kept practicing every afternoon and improved next month.`,
    feedback: {
      summary: 'Great context for "resilient." The idea is strong; now make the sentence sharper.',
      strengths: [
        'You show resilience through actions, not just definitions.',
        'The timeline gives your example a realistic flow.',
      ],
      improvements: [
        'Place the target word directly in the sentence for stronger control.',
        'Replace "felt upset" with a more vivid emotional phrase.',
        'Shorten the second clause to improve readability.',
      ],
      vocabulary: ['resilient', 'persistent', 'composed'],
      nextStep: 'Rewrite using “resilient” in the first sentence and add one specific training detail.',
    },
  },
] as const;

const OUTCOMES = [
  {
    title: 'Improve Writing Faster',
    description: 'Turn every draft into a learning loop with precise next steps.',
  },
  {
    title: 'Make Writing Enjoyable',
    description: 'A clear workflow keeps students engaged, focused, and motivated.',
  },
  {
    title: 'Personalised Suggestions',
    description: 'Feedback adapts to writing level, style, and goals.',
  },
  {
    title: 'Build Confidence',
    description: 'Students see progress they can feel across every week.',
  },
];

const TESTIMONIALS = [
  {
    quote: 'Helped me improve my writing so much.',
    role: 'Year 6 Student',
  },
  {
    quote: 'Actually makes writing fun and less stressful.',
    role: 'Year 8 Student',
  },
  {
    quote: 'I can clearly see my child getting more confident each week.',
    role: 'Parent',
  },
];

function AppPreviewCard({
  label,
  title,
  lines,
}: {
  label: string;
  title: string;
  lines: string[];
}) {
  return (
    <article className={styles.previewCard}>
      <p className={styles.previewLabel}>{label}</p>
      <h3 className={styles.previewTitle}>{title}</h3>
      <div className={styles.previewLines}>
        {lines.map((line) => (
          <div key={line} className={styles.previewLine}>
            <CheckCircle2 size={14} />
            <span>{line}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function MarketingHome() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(styles.isVisible);
          obs.unobserve(entry.target);
        });
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.18,
      }
    );

    nodes.forEach((node, index) => {
      node.style.transitionDelay = `${Math.min(index * 55, 220)}ms`;
      observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.orbA} aria-hidden="true" />
      <div className={styles.orbB} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.brandWrap}>
          <BrandLogo size={34} />
          <span>Draftora</span>
        </div>
        <nav className={styles.navActions}>
          <Link href="/login" className={styles.loginBtn}>
            Login
          </Link>
          <Link href="/signup" className={styles.signupBtn}>
            Sign Up
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <section className={`${styles.hero} ${styles.reveal}`} data-reveal>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>AI Writing App for Students</p>
            <h1 className={styles.heroTypeTitle} aria-label="Write better with AI coaching made for students.">
              <span className={`${styles.typeLine} ${styles.typeLineSky}`}>Write better with</span>
              <span className={`${styles.typeLine} ${styles.typeLineLake}`}>AI coaching made</span>
              <span className={`${styles.typeLine} ${styles.typeLineDark}`}>for students.</span>
            </h1>
            <p className={styles.subhead}>
              Draftora helps students improve faster with instant feedback, smart rewrites, and daily vocabulary practice.
            </p>
            <div className={styles.heroActions}>
              <Link href="/signup" className={styles.primaryCta}>
                <span className={styles.ctaCopy}>
                  <span className={styles.ctaMain}>Start Writing Free</span>
                  <span className={styles.ctaSub}>Open your first draft now</span>
                </span>
                <span className={styles.ctaArrowWrap}>
                  <ArrowRight size={16} />
                </span>
              </Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.windowChrome}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.heroGrid}>
              <article className={styles.editorPane}>
                <p className={styles.miniLabel}>Writing Editor</p>
                <h3>The storm rolled in by sunset...</h3>
                <p>
                  I started writing quickly, but then I slowed down and described how the wind rattled every window in the street.
                </p>
                <p className={styles.highlightLine}>Suggestion: add one sensory detail for stronger imagery.</p>
              </article>
              <article className={styles.feedbackPane}>
                <p className={styles.miniLabel}>AI Feedback</p>
                <div className={styles.feedbackItem}>
                  <MessageSquareText size={15} />
                  <span>Strong opening hook and clear tone.</span>
                </div>
                <div className={styles.feedbackItem}>
                  <Lightbulb size={15} />
                  <span>Try shorter sentences in the middle section.</span>
                </div>
                <div className={styles.feedbackItem}>
                  <Sparkles size={15} />
                  <span>Upgrade 2 words for more impact.</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.reveal}`} data-reveal>
          <div className={styles.sectionHead}>
            <h2>Built to help students level up every draft</h2>
          </div>
          <div className={styles.showcaseStack}>
            {SHOWCASE_SECTIONS.map(({ icon: Icon, title, description, impact, prompt, draft, feedback }, index) => (
              <article key={title} className={`${styles.showcaseCard} ${SHOWCASE_THEMES[index % SHOWCASE_THEMES.length]}`}>
                <div className={styles.showcaseMeta}>
                  <div className={styles.showcaseTopRow}>
                    <span className={styles.showcaseBadge}>Live Product Demo</span>
                    <div className={styles.showcaseTabs}>
                      <span className={`${styles.showcaseTab} ${styles.showcaseTabActive}`}>Draft</span>
                      <span className={styles.showcaseTab}>AI Review</span>
                    </div>
                  </div>
                  <div className={styles.featureIcon}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 className={styles.showcaseTitle}>{title}</h3>
                    <p className={styles.showcaseModule}>Module {String(index + 1).padStart(2, '0')}</p>
                    <p className={styles.showcaseDescription}>{description}</p>
                    <div className={styles.impactChips}>
                      {impact.map((item) => (
                        <span key={item} className={styles.impactChip}>{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={styles.showcaseExample}>
                  <div className={styles.exampleBlock}>
                    <div className={styles.exampleTopRow}>
                      <p className={styles.exampleLabel}>Student Draft</p>
                      <span className={styles.exampleBadge}>Input</span>
                    </div>
                    <div className={styles.exampleScroll}>
                      <p className={styles.examplePrompt}>{prompt}</p>
                      <p className={styles.exampleText}>{draft}</p>
                    </div>
                  </div>
                  <div className={styles.exampleBlockStrong}>
                    <div className={styles.exampleTopRow}>
                      <p className={styles.exampleLabel}>Draftora AI Feedback</p>
                      <span className={styles.exampleBadgeStrong}>Detailed</span>
                    </div>
                    <div className={styles.exampleScroll}>
                      <div className={styles.feedbackSection}>
                        <p className={styles.feedbackHeading}>Overall</p>
                        <p className={styles.exampleText}>{feedback.summary}</p>
                      </div>

                      <div className={styles.feedbackSection}>
                        <p className={styles.feedbackHeading}>What&apos;s Working</p>
                        <ul className={styles.feedbackList}>
                          {feedback.strengths.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className={styles.feedbackSection}>
                        <p className={styles.feedbackHeading}>Improve Next</p>
                        <ul className={styles.feedbackList}>
                          {feedback.improvements.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className={styles.feedbackSection}>
                        <p className={styles.feedbackHeading}>Vocabulary Upgrades</p>
                        <div className={styles.vocabChips}>
                          {feedback.vocabulary.map((word) => (
                            <span key={word} className={styles.vocabChip}>
                              {word}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className={styles.feedbackSection}>
                        <p className={styles.feedbackHeading}>Next Step</p>
                        <p className={styles.exampleText}>{feedback.nextStep}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.reveal}`} data-reveal>
          <div className={styles.sectionHead}>
            <h2>Why Draftora</h2>
          </div>
          <div className={styles.outcomeGrid}>
            {OUTCOMES.map((item) => (
              <article key={item.title} className={styles.outcomeCard}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.reveal}`} data-reveal>
          <div className={styles.sectionHead}>
            <h2>See the app in action</h2>
          </div>
          <div className={styles.previewGrid}>
            <AppPreviewCard
              label="Writing Screen"
              title="Focused editor that keeps students in flow"
              lines={[
                'Live word count and progress signals',
                'Prompt-aware writing workspace',
                'One-click draft save and review',
              ]}
            />
            <AppPreviewCard
              label="Feedback Mode"
              title="Coaching that is specific and encouraging"
              lines={[
                'Clear strengths and improvements',
                'Sentence-level rewrite suggestions',
                'Actionable next-step guidance',
              ]}
            />
            <AppPreviewCard
              label="Vocabulary"
              title="Daily words with usage checks"
              lines={[
                'Practice words in real sentences',
                'Unlock extra words with consistency',
                'Track mastery over time',
              ]}
            />
          </div>
        </section>

        <section className={`${styles.section} ${styles.reveal}`} data-reveal>
          <div className={styles.sectionHead}>
            <h2>Loved by Students</h2>
          </div>
          <div className={styles.testimonialGrid}>
            {TESTIMONIALS.map((item) => (
              <blockquote key={item.quote} className={styles.testimonialCard}>
                <p>&ldquo;{item.quote}&rdquo;</p>
                <footer>{item.role}</footer>
              </blockquote>
            ))}
          </div>
        </section>

        <section className={`${styles.finalCta} ${styles.reveal}`} data-reveal>
          <h2>Start improving your writing today</h2>
          <Link href="/signup" className={styles.primaryCta}>
            <span className={styles.ctaCopy}>
              <span className={styles.ctaMain}>Start Writing Free</span>
              <span className={styles.ctaSub}>Create your account and begin your first piece</span>
            </span>
            <span className={styles.ctaArrowWrap}>
              <ArrowRight size={16} />
            </span>
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>Draftora</div>
        <nav className={styles.footerLinks}>
          <Link href="/login">Login</Link>
          <Link href="/signup">Sign Up</Link>
          <Link href="/about">About</Link>
        </nav>
        <p className={styles.footerCopy}>© {new Date().getFullYear()} Draftora. All rights reserved.</p>
      </footer>
    </div>
  );
}
