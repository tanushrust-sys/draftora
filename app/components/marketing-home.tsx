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

const BLOG_POSTS = [
  {
    title: 'How an AI writing app for students can build daily writing confidence',
    summary:
      'Start with short prompts, review instant feedback, and revise one paragraph at a time. This routine helps students improve writing skills without feeling overwhelmed.',
    audience: 'For students',
  },
  {
    title: 'How parents can use AI feedback to support writing at home',
    summary:
      'Look at one strength and one next step after each draft. Small, consistent check-ins help children improve writing skills while keeping writing practice positive.',
    audience: 'For parents',
  },
  {
    title: 'Simple classroom habits to improve writing skills faster',
    summary:
      'Teachers can use clear revision goals, sentence-level feedback, and weekly progress snapshots to help every student write stronger drafts with less friction.',
    audience: 'For teachers',
  },
] as const;

const FAQS = [
  {
    question: 'What is Draftora?',
    answer:
      'Draftora is an AI writing app for students that turns writing into a clear improvement system. Students draft, get targeted feedback, revise with purpose, and track progress over time. Parents and teachers stay aligned with the same learning signals, so support at home and school becomes consistent, specific, and far more effective.',
  },
  {
    question: 'How does Draftora help students improve their writing?',
    answer:
      'Draftora improves writing through fast, actionable feedback after every draft. Students see what is working, what needs improvement, and exactly which sentences to strengthen next. Because feedback is immediate and specific, students revise while ideas are still fresh, building stronger structure, clarity, and vocabulary with every cycle.',
  },
  {
    question: 'Is Draftora suitable for different age groups and skill levels?',
    answer:
      'Yes. Draftora is designed for multiple age groups and writing levels, from early writers to more advanced students. Support can be tuned so beginners get simpler guidance while experienced writers receive deeper critique. That means each student gets feedback at the right difficulty level instead of one-size-fits-all comments.',
  },
  {
    question: 'Can parents track their child’s writing progress?',
    answer:
      'Yes. Parents can view writing activity, progress patterns, and feedback trends in a way that is easy to understand. Instead of guessing how to help, they can see concrete next steps and reinforce them at home. This leads to better conversations, better accountability, and steadier writing growth week to week.',
  },
  {
    question: 'Is Draftora secure and how is user data protected?',
    answer:
      'Draftora is built with security-focused access controls and authenticated user sessions. Student information is scoped by role so students, parents, and teachers only access the data they are authorized to view. Protected API routes and careful data-handling practices help keep progress data private and reduce exposure risk.',
  },
] as const;

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
            <p className={styles.eyebrow}>AI writing app for students, parents, and teachers</p>
            <h1 className={styles.heroTypeTitle} aria-label="AI writing app for students to improve writing skills with support for parents and teachers.">
              <span className={`${styles.typeLine} ${styles.typeLineSky}`}>AI writing app</span>
              <span className={`${styles.typeLine} ${styles.typeLineLake}`}>for students to</span>
              <span className={`${styles.typeLine} ${styles.typeLineDark}`}>improve writing</span>
              <span className={`${styles.typeLine} ${styles.typeLineDeep}`}>skills daily.</span>
            </h1>
            <p className={styles.subhead}>
              Draftora helps students improve writing skills with guided feedback, gives parents clear progress visibility, and helps teachers deliver faster writing support at scale.
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
            <div className={styles.demoCard}>
              <div className={styles.liveSignalRow}>
                <span className={styles.liveSignal}>Live product preview</span>
                <span className={styles.liveSignal}>Student-safe guidance</span>
              </div>
              <div className={styles.dashboardShotWrap}>
                <img
                  src="/marketing/dashboard-real.png"
                  alt="Draftora live product demo"
                  className={styles.dashboardShot}
                  loading="eager"
                />
              </div>
            </div>
            <div className={`${styles.demoCard} ${styles.secondaryDemoCard}`}>
              <div className={styles.liveSignalRow}>
                <span className={styles.liveSignal}>Secondary live demo</span>
                <span className={styles.liveSignal}>Progress snapshot</span>
              </div>
              <div className={styles.dashboardShotWrap}>
                <img
                  src="/marketing/dashboard-real-2.png"
                  alt="Draftora secondary live product demo"
                  className={styles.dashboardShot}
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.reveal}`} data-reveal>
          <div className={styles.sectionHead}>
            <h2>Why Draftora works for writing growth</h2>
            <p className={styles.sectionSubhead}>
              One AI writing workflow that supports students directly and keeps parents and teachers aligned.
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
            <h2>See how students improve writing skills</h2>
            <p className={styles.sectionSubhead}>
              Explore the core surfaces students use every day to draft, revise, and improve with AI support.
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
            <h2>Built to help students improve writing skills every draft</h2>
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
            <h2>Loved by students, trusted by parents</h2>
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

        <section className={`${styles.section} ${styles.reveal}`} data-reveal>
          <div className={styles.sectionHead}>
            <h2>Writing tips blog</h2>
            <p className={styles.sectionSubhead}>
              Short guides for families and classrooms using an AI writing app for students.
            </p>
          </div>
          <div className={styles.blogGrid}>
            {BLOG_POSTS.map((post) => (
              <article key={post.title} className={styles.blogCard}>
                <p className={styles.blogAudience}>
                  <BookOpen size={14} />
                  <span>{post.audience}</span>
                </p>
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
              </article>
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

        <section className={`${styles.section} ${styles.reveal}`} data-reveal>
          <div className={styles.sectionHead}>
            <h2>Frequently asked questions</h2>
            <p className={styles.sectionSubhead}>
              Quick answers for students, parents, and teachers exploring Draftora.
            </p>
          </div>
          <div className={styles.faqGrid}>
            {FAQS.map((item) => (
              <details key={item.question} className={styles.faqCard}>
                <summary className={styles.faqQuestion}>{item.question}</summary>
                <p className={styles.faqAnswer}>{item.answer}</p>
              </details>
            ))}
          </div>
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
