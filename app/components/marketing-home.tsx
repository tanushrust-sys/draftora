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

const PLATFORM_EXPERIENCES = [
  {
    icon: FileText,
    app: 'Student App',
    title: 'Focused writing and feedback loop',
    points: [
      'Write in a calm, prompt-aware editor.',
      'Get instant AI coaching and rewrites.',
      'Build confidence with every draft.',
    ],
  },
  {
    icon: CalendarCheck2,
    app: 'Parent App',
    title: 'Simple progress visibility at home',
    points: [
      'See writing momentum without complexity.',
      'Understand feedback in plain language.',
      'Support practice with clear next steps.',
    ],
  },
  {
    icon: MessageSquareText,
    app: 'Teacher App',
    title: 'Practical support for classroom writing',
    points: [
      'Review stronger drafts in less time.',
      'Use structured AI insights for guidance.',
      'Keep support consistent across students.',
    ],
  },
] as const;

const OUTCOMES = [
  {
    title: 'Improve Writing Faster',
    description: 'Turn every draft into a learning loop with precise next steps.',
    audience: 'Student',
    scenario: 'Students get instant coaching after each paragraph instead of waiting for end-of-week feedback.',
  },
  {
    title: 'Make Writing Enjoyable',
    description: 'A clear workflow keeps students engaged, focused, and motivated.',
    audience: 'Parent',
    scenario: 'Parents can review progress snapshots and coach at home without guessing what to focus on.',
  },
  {
    title: 'Personalised Suggestions',
    description: 'Feedback adapts to writing level, style, and goals.',
    audience: 'Teacher',
    scenario: 'Teachers see targeted suggestions by student level so support stays differentiated and practical.',
  },
  {
    title: 'Build Confidence',
    description: 'Students see progress they can feel across every week.',
    audience: 'All roles',
    scenario: 'Students improve, parents see momentum, and teachers track growth with one shared language.',
  },
];

const APP_PREVIEWS = [
  {
    label: 'Writing Screen',
    title: 'Focused editor that keeps students in flow',
    lines: [
      'Live word count and progress signals',
      'Prompt-aware writing workspace',
      'One-click draft save and review',
    ],
    scenarios: [
      { role: 'Student', text: 'Starts a draft and gets clear writing momentum in minutes.' },
      { role: 'Parent', text: 'Sees exactly what was written today and where to encourage.' },
      { role: 'Teacher', text: 'Reviews submitted drafts quickly without workflow clutter.' },
    ],
  },
  {
    label: 'Feedback Mode',
    title: 'Coaching that is specific and encouraging',
    lines: [
      'Clear strengths and improvements',
      'Sentence-level rewrite suggestions',
      'Actionable next-step guidance',
    ],
    scenarios: [
      { role: 'Student', text: 'Gets instant “what to fix next” instead of vague advice.' },
      { role: 'Parent', text: 'Understands feedback language and supports revision at home.' },
      { role: 'Teacher', text: 'Uses AI notes to speed up marking while staying instructional.' },
    ],
  },
  {
    label: 'Vocabulary',
    title: 'Daily words with usage checks',
    lines: [
      'Practice words in real sentences',
      'Unlock extra words with consistency',
      'Track mastery over time',
    ],
    scenarios: [
      { role: 'Student', text: 'Learns richer words and uses them correctly in context.' },
      { role: 'Parent', text: 'Can spot mastered words and celebrate visible progress.' },
      { role: 'Teacher', text: 'Monitors class vocabulary growth with less manual tracking.' },
    ],
  },
] as const;

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
  scenarios,
}: {
  label: string;
  title: string;
  lines: readonly string[];
  scenarios: readonly { role: string; text: string }[];
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
      <div className={styles.scenarioStack}>
        {scenarios.map((item) => (
          <div key={item.role} className={styles.scenarioItem}>
            <span className={styles.scenarioRole}>{item.role}</span>
            <span className={styles.scenarioText}>{item.text}</span>
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
          <BrandLogo size={44} />
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
            <p className={styles.eyebrow}>AI Writing App for Students, Parents, and Teachers</p>
            <h1 className={styles.heroTypeTitle} aria-label="Write better with AI coaching for students, parents, and teachers.">
              <span className={`${styles.typeLine} ${styles.typeLineSky}`}>Write better with</span>
              <span className={`${styles.typeLine} ${styles.typeLineLake}`}>AI coaching for</span>
              <span className={`${styles.typeLine} ${styles.typeLineDark}`}>students, parents,</span>
              <span className={`${styles.typeLine} ${styles.typeLineDeep}`}>and teachers.</span>
            </h1>
            <p className={styles.subhead}>
              Draftora helps students write stronger drafts, gives parents clear progress visibility, and helps teachers deliver faster feedback at scale.
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
              <a href="#showcase" className={styles.secondaryHeroCta}>
                View Product Walkthrough
              </a>
            </div>
            <p className={styles.heroTrustLine}>Built for students. Trusted by parents. Practical for teachers.</p>
            <div className={styles.heroProofGrid}>
              <article className={styles.heroProofCard}>
                <MessageSquareText size={15} />
                <div>
                  <strong>Actionable Feedback</strong>
                  <span>Clear next steps after every draft</span>
                </div>
              </article>
              <article className={styles.heroProofCard}>
                <Wand2 size={15} />
                <div>
                  <strong>Smart Rewrites</strong>
                  <span>Better clarity without losing voice</span>
                </div>
              </article>
              <article className={styles.heroProofCard}>
                <CalendarCheck2 size={15} />
                <div>
                  <strong>Daily Writing Rhythm</strong>
                  <span>Consistent support that builds confidence</span>
                </div>
              </article>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.liveSignalRow}>
              <span className={styles.liveSignal}>Live product preview</span>
              <span className={styles.liveSignal}>Student-safe guidance</span>
            </div>
            <div className={styles.windowChrome}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.feedbackDemo}>
              <article className={styles.draftTop}>
                <div className={styles.topRow}>
                  <p className={styles.miniLabel}>Prompt</p>
                  <span className={styles.exampleBadge}>Input</span>
                </div>
                <p className={styles.promptText}>Describe a stormy evening in your neighborhood.</p>

                <div className={styles.topRow}>
                  <p className={styles.miniLabel}>Writing Piece</p>
                  <span className={styles.exampleBadgeStrong}>Draft</span>
                </div>
                <p className={styles.draftText}>
                  The storm rolled in by sunset. I started writing quickly, but then I slowed down and described how the wind rattled every window in the street.
                </p>
              </article>

              <div className={styles.feedbackBottom}>
                <article className={styles.feedbackCardMini}>
                  <p className={styles.feedbackMiniTitle}>Overall Feedback</p>
                  <div className={styles.feedbackItem}>
                    <MessageSquareText size={15} />
                    <span>
                      Clear opening and strong mood.
                      <br />
                      <br />
                      Your scene is easy to imagine, and the sentence flow mostly works.
                      <br />
                      <br />
                      To level up, add one emotional reaction and one concrete sensory detail so the reader feels the storm, not just the summary.
                    </span>
                  </div>
                </article>
                <article className={styles.feedbackCardMini}>
                  <p className={styles.feedbackMiniTitle}>Section by Section</p>
                  <div className={styles.feedbackItem}>
                    <Lightbulb size={15} />
                    <span>
                      Opening: direct and effective.
                      <br />
                      <br />
                      Middle: vivid, but one long clause should be split for rhythm.
                      <br />
                      <br />
                      Ending: stops too quickly. Add one reflective closing line about sound or feeling so the paragraph lands with stronger control and completion.
                    </span>
                  </div>
                </article>
                <article className={styles.feedbackCardMini}>
                  <p className={styles.feedbackMiniTitle}>Rewrite</p>
                  <div className={styles.feedbackItem}>
                    <Sparkles size={15} />
                    <span>
                      The storm rolled in by sunset, and restless wind pushed along our street. I slowed my writing as the noise grew louder, describing shutters rattling and panes trembling. By the end, the weather felt close and threatening.
                    </span>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.reveal}`} data-reveal>
          <div className={styles.sectionHead}>
            <h2>Why Draftora</h2>
            <p className={styles.sectionSubhead}>
              One writing workflow that supports students directly and keeps parents and teachers aligned.
            </p>
          </div>
          <div className={styles.outcomeGrid}>
            {OUTCOMES.map((item) => (
              <article key={item.title} className={styles.outcomeCard}>
                <span className={styles.audiencePill}>{item.audience}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <p className={styles.outcomeScenario}>{item.scenario}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="showcase" className={`${styles.section} ${styles.reveal}`} data-reveal>
          <div className={styles.sectionHead}>
            <h2>See the app in action</h2>
            <p className={styles.sectionSubhead}>
              Explore the core surfaces students use every day to draft, revise, and improve.
            </p>
          </div>
          <div className={styles.previewGrid}>
            {APP_PREVIEWS.map((preview) => (
              <AppPreviewCard
                key={preview.label}
                label={preview.label}
                title={preview.title}
                lines={preview.lines}
                scenarios={preview.scenarios}
              />
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.reveal}`} data-reveal>
          <div className={styles.sectionHead}>
            <h2>Built to help students level up every draft</h2>
            <p className={styles.sectionSubhead}>
              Three focused experiences that work independently and stay seamlessly connected.
            </p>
          </div>
          <div className={styles.seamlessBand}>
            <div className={`${styles.experienceTop} ${styles.seamlessTop}`}>
              <span className={styles.experienceIcon}>
                <Sparkles size={16} />
              </span>
              <span className={styles.experienceApp}>Connected Draftora Flow</span>
              <p className={styles.seamlessInlineTitle}>
                All three apps work separately, but stay perfectly synced in one seamless system.
              </p>
            </div>
            <ul className={`${styles.experiencePoints} ${styles.seamlessList}`}>
              <li>
                <CheckCircle2 size={13} />
                <span>One shared student profile across all three apps.</span>
              </li>
              <li>
                <CheckCircle2 size={13} />
                <span>Draft updates appear instantly for parents and teachers.</span>
              </li>
              <li>
                <CheckCircle2 size={13} />
                <span>Feedback context stays consistent between home and class.</span>
              </li>
              <li>
                <CheckCircle2 size={13} />
                <span>Progress signals sync automatically with no manual tracking.</span>
              </li>
              <li>
                <CheckCircle2 size={13} />
                <span>Vocabulary growth flows into writing support in real time.</span>
              </li>
              <li>
                <CheckCircle2 size={13} />
                <span>Everyone sees the same next-step priorities for each student.</span>
              </li>
            </ul>
          </div>
          <div className={styles.experienceGrid}>
            {PLATFORM_EXPERIENCES.map(({ icon: Icon, app, title, points }) => (
              <article key={app} className={styles.experienceCard}>
                <div className={styles.experienceTop}>
                  <span className={styles.experienceIcon}>
                    <Icon size={16} />
                  </span>
                  <span className={styles.experienceApp}>{app}</span>
                </div>
                <h3 className={styles.experienceTitle}>{title}</h3>
                <ul className={styles.experiencePoints}>
                  {points.map((item) => (
                    <li key={item}>
                      <CheckCircle2 size={13} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.reveal}`} data-reveal>
          <div className={styles.sectionHead}>
            <h2>Loved by Students</h2>
            <p className={styles.sectionSubhead}>
              Draftora helps make writing clearer, calmer, and more consistent week after week.
            </p>
          </div>
          <div className={styles.testimonialGrid}>
            {TESTIMONIALS.map((item) => (
              <blockquote key={item.quote} className={styles.testimonialCard}>
                <p>&ldquo;{item.quote}&rdquo;</p>
                <footer>{item.role}</footer>
              </blockquote>
            ))}
          </div>
          <div className={styles.trustMarkers}>
            <article>
              <FileText size={15} />
              <span>Student-friendly feedback language</span>
            </article>
            <article>
              <CalendarCheck2 size={15} />
              <span>Built for consistent daily writing practice</span>
            </article>
            <article>
              <Sparkles size={15} />
              <span>Designed to improve writing confidence</span>
            </article>
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
