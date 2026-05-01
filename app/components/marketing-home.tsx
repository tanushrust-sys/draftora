'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Sparkles,
  Wand2,
  BookOpen,
  FileText,
  CalendarCheck2,
  ArrowRight,
  CheckCircle2,
  MessageSquareText,
  FlaskConical,
  X,
} from 'lucide-react';
import BrandLogo from '@/app/components/BrandLogo';
import styles from '@/app/components/marketing-home.module.css';

const PLATFORM_EXPERIENCES = [
  {
    icon: FileText,
    app: 'Student App',
    title: 'Focused writing that lifts marks and confidence',
    points: [
      'Write in a calm, prompt-aware editor.',
      'Get instant AI coaching and clearer rewrites.',
      'Improve results with each new draft.',
    ],
  },
  {
    icon: CalendarCheck2,
    app: 'Parent App',
    title: 'Clear visibility so parents can support fast',
    points: [
      'See writing momentum without complexity.',
      'Understand feedback in plain language.',
      'Guide practice with clear next steps.',
    ],
  },
  {
    icon: MessageSquareText,
    app: 'Teacher App',
    title: 'Consistent classroom support with less marking time',
    points: [
      'Review stronger drafts in less time.',
      'Use structured AI insights for feedback consistency.',
      'Keep support practical across every class.',
    ],
  },
] as const;

const OUTCOMES = [
  {
    title: 'Improve Writing Faster',
    description: 'Turn each draft into better structure, clarity, and marks.',
    audience: 'Student',
    scenario: 'Students get instant coaching after each paragraph instead of waiting until the end of the week.',
  },
  {
    title: 'Make Progress Easy To See',
    description: 'Parents can quickly spot growth and support the right next step.',
    audience: 'Parent',
    scenario: 'Parents review progress snapshots at home without guessing what to focus on.',
  },
  {
    title: 'Save Teacher Time',
    description: 'Feedback adapts by level while keeping guidance consistent.',
    audience: 'Teacher',
    scenario: 'Teachers move faster with targeted suggestions while maintaining classroom consistency.',
  },
  {
    title: 'Build Confidence',
    description: 'Students can feel weekly growth, not just final scores.',
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

type BlogPost = {
  title: string;
  summary: string;
  audience: string;
  readTime: string;
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
};

const ABOUT_ME_STORY = {
  title: 'About Me',
  subtitle: 'Why I built Draftora',
  intro:
    'Hi, I am the creator of Draftora. I am 11 years old and in Year 6. I started coding when I was 10 because I became fascinated by how websites, apps, buttons, screens, and ideas could turn into something real. At the same time, I knew what it felt like to struggle with writing, because writing used to be really hard for me in my previous school years. Draftora comes from both parts of my story: learning to code and learning to become a stronger writer through effort, practice, and feedback.',
  sections: [
    {
      heading: 'My Purpose',
      paragraphs: [
        'I made Draftora to help students feel less stuck when they write. Sometimes writing can feel confusing because you might not know how to start, what to improve, or whether your work is actually getting better. I wanted Draftora to make that process clearer by giving students feedback they can understand and use straight away.',
        'My purpose is to help writing feel less stressful and more possible. I want students to see that improvement does not happen all at once. It happens when you write, get feedback, fix one thing, and try again. Draftora is meant to make those small steps easier to follow.',
        'I also want students to feel more confident in their own voice. Writing is not just about getting marks at school. It is about explaining your thoughts, sharing ideas, and showing what you understand. If Draftora can help someone feel proud of a better paragraph or a clearer sentence, then it is doing what I built it to do.',
      ],
    },
    {
      heading: 'My Story',
      paragraphs: [
        'In my earlier school years, I struggled with writing a lot. I did not always know how to organize my ideas, make my sentences sound clear, or explain what I was thinking properly. Sometimes I had ideas in my head, but when I tried to put them on the page, they did not come out the way I wanted.',
        'Getting better took a lot of time and effort. I had to keep practicing, listen to feedback, fix mistakes, and learn that a first draft does not have to be perfect. Over time, I started to understand that writing improves through revision, just like coding improves through testing and fixing bugs.',
        'That is why Draftora matters to me personally. I am not building it from the outside, pretending writing is easy. I know what it feels like when writing is difficult. I also know that improvement is possible, because I experienced it myself.',
      ],
    },
    {
      heading: 'Why Draftora and Writing',
      paragraphs: [
        'I chose writing because it is something every student needs. You use writing in school, in assignments, in explanations, in messages, and later in life when you want to share ideas clearly. Even if you are good at another subject, writing helps you show what you know.',
        'I picked the name Draftora because writing starts with a draft. A draft does not need to be perfect. It is just the beginning. What matters is what you do next: read it again, find what can be clearer, improve the structure, add better vocabulary, and keep building it into something stronger.',
        'That is the main idea behind Draftora. It is not supposed to make students feel judged. It is supposed to help them improve step by step. I wanted to create a tool that supports the writing process instead of making students feel like they have to get everything right the first time.',
      ],
    },
    {
      heading: 'Summary',
      paragraphs: [
        'Draftora is my way of combining two things I care about: coding and writing. Coding gave me a way to build something useful, and writing gave me a reason to build it. I wanted to create an app that came from a real problem I understood, not just a random idea.',
        'I am still learning too, and I think that is important. I am still improving as a coder, as a writer, and as a student. Building Draftora has taught me that big projects are made from lots of small steps, and that the best way to grow is to keep trying even when something feels difficult.',
        'My hope is that Draftora helps other students believe they can improve too. You do not have to be perfect at writing to get better. You just need support, practice, feedback, and the courage to keep going. That is what Draftora is here for.',
      ],
    },
  ],
} as const;

const ABOUT_ME_BLOG: BlogPost = {
  title: 'About Me: Why I Built Draftora',
  summary:
    'I am an 11-year-old Year 6 student who used to struggle with writing, started coding at 10, and built Draftora to help other students improve.',
  audience: 'About me',
  readTime: '2 min read',
  intro: ABOUT_ME_STORY.intro,
  sections: ABOUT_ME_STORY.sections.map((section) => ({
    heading: section.heading,
    paragraphs: [...section.paragraphs],
  })),
};

const BLOG_POSTS: BlogPost[] = [
  {
    title: 'How an AI writing app for students can build daily writing confidence',
    summary:
      'Start with short prompts, review instant feedback, and revise one paragraph at a time. This routine helps students improve writing skills without feeling overwhelmed.',
    audience: 'For students',
    readTime: '3 min read',
    intro:
      'Most students do not struggle because they lack ideas. They struggle because writing feels vague: where to start, what to fix, and how to know if progress is real. A strong AI writing app for students removes that uncertainty by turning writing into a repeatable daily process.',
    sections: [
      {
        heading: 'Start with short wins, not long assignments',
        paragraphs: [
          'Confidence grows faster when students complete a small writing task every day instead of waiting for one big weekly piece. A focused 10-15 minute prompt creates momentum and lowers resistance.',
          'When students finish a short draft, they build trust in their own process. That consistency is more valuable than occasional perfect essays.',
        ],
      },
      {
        heading: 'Use immediate feedback while ideas are fresh',
        paragraphs: [
          'Feedback is most effective when it comes right after writing. Students can still remember their intent, so revision becomes practical instead of frustrating.',
          'With instant guidance, students can identify one sentence to sharpen, one detail to clarify, and one vocabulary improvement to apply immediately.',
        ],
      },
      {
        heading: 'Turn revision into a clear routine',
        paragraphs: [
          'A simple routine works best: draft, review strengths, fix one improvement area, then polish. This keeps students focused on progress instead of perfection.',
          'Over time, students begin to self-correct structure, clarity, and tone before feedback even appears. That is when real writing independence starts.',
        ],
      },
      {
        heading: 'Track progress students can actually feel',
        paragraphs: [
          'Visible progress indicators matter. Students stay motivated when they can see growth in consistency, clarity, and completion rate.',
          'When improvement is visible, writing feels rewarding rather than stressful. That shift is what builds long-term writing confidence.',
        ],
      },
      {
        heading: 'Keep effort high with reflection loops',
        paragraphs: [
          'Students improve faster when they briefly reflect after each session: What improved? What is still unclear? What will I focus on tomorrow?',
          'This tiny reflection loop strengthens ownership. Instead of waiting for someone else to judge quality, students start developing internal standards for strong writing.',
        ],
      },
    ],
  },
  {
    title: 'How parents can use AI feedback to support writing at home',
    summary:
      'Look at one strength and one next step after each draft. Small, consistent check-ins help children improve writing skills while keeping writing practice positive.',
    audience: 'For parents',
    readTime: '3 min read',
    intro:
      'Parents do not need to be writing experts to help a child improve. The key is consistent, calm support around specific next steps. AI feedback helps parents focus on what matters most after each draft.',
    sections: [
      {
        heading: 'Focus on one strength and one next step',
        paragraphs: [
          'After each writing session, start with one strength to reinforce confidence, then choose one improvement target. This keeps feedback actionable and emotionally balanced.',
          'Too many corrections at once can overwhelm students. One clear priority leads to better follow-through.',
        ],
      },
      {
        heading: 'Use shared language at home',
        paragraphs: [
          'When parents and teachers use similar feedback language, students experience less confusion and more clarity. Terms like “add detail,” “improve flow,” or “strong opening” become familiar and useful.',
          'Shared language makes writing support feel consistent across home and school.',
        ],
      },
      {
        heading: 'Make check-ins short and regular',
        paragraphs: [
          'A 5-minute daily check-in is often more powerful than a long weekly correction session. Ask what was improved today and what the next target is.',
          'Short check-ins reduce pressure and help writing become a normal habit.',
        ],
      },
      {
        heading: 'Celebrate progress, not just grades',
        paragraphs: [
          'Celebrate concrete improvement signals: clearer ideas, stronger sentence structure, or more consistent writing sessions.',
          'When effort and growth are recognized, students stay engaged for the long run and become more willing to revise.',
        ],
      },
      {
        heading: 'Turn feedback into home routines',
        paragraphs: [
          'Pick one regular writing rhythm that fits your family schedule: after homework, before dinner, or during a weekend slot. Consistency matters more than session length.',
          'Pair writing with one encouraging ritual, like reading the best sentence aloud. Positive closure helps students associate revision with progress, not pressure.',
        ],
      },
    ],
  },
  {
    title: 'Simple classroom habits to improve writing skills faster',
    summary:
      'Teachers can use clear revision goals, sentence-level feedback, and weekly progress snapshots to help every student write stronger drafts with less friction.',
    audience: 'For teachers',
    readTime: '3 min read',
    intro:
      'In most classrooms, the bottleneck is not effort. It is feedback bandwidth. Small instructional habits can dramatically increase writing progress without increasing marking overload.',
    sections: [
      {
        heading: 'Set one revision goal per draft',
        paragraphs: [
          'Students improve faster when each draft has one instructional focus: clarity, evidence, paragraph flow, or sentence variety.',
          'A single goal sharpens attention and makes feedback easier to apply at scale.',
        ],
      },
      {
        heading: 'Use sentence-level examples, not vague comments',
        paragraphs: [
          'Comments like “be more descriptive” are hard to act on. A stronger approach is showing one specific sentence and how to improve it.',
          'Concrete examples reduce cognitive load and help students transfer the same pattern into the rest of the piece.',
        ],
      },
      {
        heading: 'Build weekly progress snapshots',
        paragraphs: [
          'Weekly snapshots help teachers spot trend lines quickly: who is improving structure, who needs vocabulary support, and who is struggling with consistency.',
          'This enables targeted intervention instead of broad re-teaching.',
        ],
      },
      {
        heading: 'Keep the feedback loop tight',
        paragraphs: [
          'The shorter the loop between writing and revision, the stronger the learning. Rapid cycles lead to better retention and quicker growth in writing quality.',
          'When students can apply feedback immediately, classroom writing becomes an active skill-building system instead of a submission-only workflow.',
        ],
      },
      {
        heading: 'Design for teacher sustainability',
        paragraphs: [
          'A great writing system must work at classroom scale. Reusable comment patterns, targeted mini-lessons, and clear revision checkpoints help maintain quality without burning teacher time.',
          'When workload stays manageable, feedback stays consistent, and students receive better instructional support across the full term.',
        ],
      },
    ],
  },
];

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

const STRONG_FAQS = [
  {
    question: 'What makes Draftora different from a normal writing tool?',
    answer:
      'Draftora is built for student improvement, not just spell-checking or rewriting. Students write their own drafts, then receive clear coaching on structure, clarity, vocabulary, and next steps. The goal is to help students understand how to improve their writing, not replace their thinking. Draftora turns writing into a repeatable cycle: draft, review, revise, and grow.',
  },
  {
    question: 'How does Draftora help students write stronger drafts?',
    answer:
      'Draftora gives students feedback while their ideas are still fresh. It points out what is already working, what needs attention, and which parts could be clearer or more detailed. Instead of vague advice like "make it better", students get practical guidance they can act on immediately. This helps them build better paragraphs, stronger sentences, richer vocabulary, and more confident revision habits.',
  },
  {
    question: 'Can Draftora support different ages, levels, and writing confidence?',
    answer:
      'Yes. Draftora is designed to support students at different stages of writing growth. A student who is still building confidence can receive simpler, more encouraging guidance, while a stronger writer can be pushed toward deeper structure, sharper word choice, and more polished expression. This makes the feedback feel more fair, useful, and age-appropriate instead of one-size-fits-all.',
  },
  {
    question: 'How can parents see real writing progress over time?',
    answer:
      'Parents can see writing activity, feedback patterns, and progress signals in plain language. This makes it easier to understand whether a child is writing more consistently, improving clarity, using stronger vocabulary, or needing extra support. Instead of guessing what to say, parents can encourage the exact next step their child is working on, which makes support at home more specific and helpful.',
  },
  {
    question: 'How does Draftora keep student writing and account data protected?',
    answer:
      'Draftora uses authenticated accounts, protected routes, and role-based access so students, parents, and teachers only see the information they are meant to access. Student writing and progress data are treated as private learning records, not public content. The platform is designed around careful data handling, controlled access, and keeping writing progress connected to the right user.',
  },
  {
    question: 'Does Draftora do the writing for students?',
    answer:
      'No. Draftora is designed to coach students, not write everything for them. It helps students notice what to improve, understand why it matters, and revise their own work with more direction. That keeps the learning with the student, which is the most important part. The strongest result is not just a better draft, but a student who understands how to make the next draft better too.',
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
  const [activeBlog, setActiveBlog] = useState<BlogPost | null>(null);

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

  useEffect(() => {
    if (!activeBlog) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveBlog(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeBlog]);

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
            <p className={styles.heroPunch}>Write better in minutes, not months.</p>
            <p className={styles.subhead}>
              Draftora helps students improve writing skills with guided feedback, gives parents clear progress visibility, and helps teachers deliver faster writing support at scale.
            </p>
            <div className={styles.heroActions}>
              <Link href="/signup" className={styles.primaryCta}>
                <span className={styles.ctaCopy}>
                  <span className={styles.ctaMain}>Start Writing Free — takes seconds</span>
                  <span className={styles.ctaSub}>Open your first draft instantly</span>
                </span>
                <span className={styles.ctaArrowWrap}>
                  <ArrowRight size={16} />
                </span>
              </Link>
              <Link href="/dashboard?practice=1" className={styles.practiceHeroCta}>
                <span className={styles.practiceHeroIcon}>
                  <FlaskConical size={15} />
                </span>
                <span className={styles.practiceHeroCopy}>
                  <span>Try Practice Mode (No Signup)</span>
                  <small>Sign in as USER and auto-reset after all tabs close</small>
                </span>
              </Link>
              <a href="#showcase" className={styles.secondaryHeroCta}>
                See Product Walkthrough
              </a>
            </div>
            <p className={styles.heroTrustLine}>Built for students. Trusted by parents. Practical for teachers.</p>
            <div className={styles.heroProofGrid}>
              <article className={styles.heroProofCard}>
                <MessageSquareText size={15} />
                <div>
                  <strong>Instant feedback</strong>
                  <span>Know what to fix right away</span>
                </div>
              </article>
              <article className={styles.heroProofCard}>
                <Wand2 size={15} />
                <div>
                  <strong>Clearer writing</strong>
                  <span>Improve flow without losing voice</span>
                </div>
              </article>
              <article className={styles.heroProofCard}>
                <CalendarCheck2 size={15} />
                <div>
                  <strong>Builds confidence</strong>
                  <span>Small wins that compound weekly</span>
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

        <section className={`${styles.proofSection} ${styles.reveal}`} data-reveal>
          <div className={styles.sectionHead}>
            <h2>See how Draftora improves writing</h2>
            <p className={styles.sectionSubhead}>
              A quick before-and-after snapshot from one revision cycle.
            </p>
          </div>
          <div className={styles.proofCard}>
            <article className={styles.proofBlock}>
              <p className={styles.proofLabel}>Before</p>
              <p className={styles.proofText}>
                My school day was good. We did science and it was fun. I learned things and then I went home.
              </p>
            </article>
            <ArrowRight className={styles.proofArrow} size={18} />
            <article className={styles.proofBlock}>
              <p className={styles.proofLabel}>After</p>
              <p className={styles.proofText}>
                Today&apos;s science lesson was my favorite because we built a simple circuit. I learned how electricity flows, then explained it to my parents at home.
              </p>
            </article>
          </div>
          <div className={styles.proofCtaWrap}>
            <Link href="/signup" className={styles.proofCta}>
              Start Writing Free — takes seconds
            </Link>
          </div>
        </section>

        <section className={`${styles.section} ${styles.reveal}`} data-reveal>
          <div className={styles.sectionHead}>
            <h2>Why Draftora works for writing growth</h2>
            <p className={styles.sectionSubhead}>
              One AI writing workflow that improves student outcomes and keeps parents and teachers aligned.
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
              Explore the core surfaces students use to draft, revise, and improve with AI support.
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
              Three focused experiences that stay seamlessly connected.
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
              Draftora makes writing clearer, calmer, and more consistent week after week.
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
              <article
                key={post.title}
                className={styles.blogCard}
                onClick={() => setActiveBlog(post)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setActiveBlog(post);
                  }
                }}
              >
                <p className={styles.blogAudience}>
                  <BookOpen size={14} />
                  <span>{post.audience}</span>
                </p>
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
                <p className={styles.blogReadMore}>
                  ... click to read more
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.reveal}`} data-reveal>
          <div className={styles.sectionHead}>
            <h2>{ABOUT_ME_STORY.title}</h2>
            <p className={styles.sectionSubhead}>{ABOUT_ME_STORY.subtitle}</p>
          </div>
          <div className={`${styles.blogGrid} ${styles.aboutMeGrid}`}>
            <article
              className={styles.blogCard}
              onClick={() => setActiveBlog(ABOUT_ME_BLOG)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setActiveBlog(ABOUT_ME_BLOG);
                }
              }}
            >
              <p className={styles.blogAudience}>
                <BookOpen size={14} />
                <span>{ABOUT_ME_BLOG.audience}</span>
              </p>
              <h3>{ABOUT_ME_BLOG.title}</h3>
              <p>{ABOUT_ME_BLOG.summary}</p>
              <p className={styles.blogReadMore}>
                ... click to read more
              </p>
            </article>
          </div>
        </section>

        <section className={`${styles.finalCta} ${styles.reveal}`} data-reveal>
          <h2>Start improving your writing today</h2>
          <Link href="/signup" className={styles.primaryCta}>
            <span className={styles.ctaCopy}>
              <span className={styles.ctaMain}>Start Writing Free — begin in seconds</span>
              <span className={styles.ctaSub}>Create your account and open your first piece now</span>
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
              Clear answers for students, parents, and teachers who want to understand how Draftora supports real writing growth.
            </p>
          </div>
          <div className={styles.faqGrid}>
            {STRONG_FAQS.map((item, index) => (
              <details key={item.question} className={styles.faqCard}>
                <summary className={styles.faqQuestion}>
                  <span className={styles.faqNumber}>{String(index + 1).padStart(2, '0')}</span>
                  <span className={styles.faqQuestionText}>{item.question}</span>
                </summary>
                <div className={styles.faqAnswerPanel}>
                  <p className={styles.faqAnswer}>{item.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </section>
      </main>

      {activeBlog && (
        <div className={styles.blogOverlay} onClick={() => setActiveBlog(null)} role="dialog" aria-modal="true">
          <article className={styles.blogModal} onClick={(event) => event.stopPropagation()}>
            <button type="button" className={styles.blogCloseBtn} onClick={() => setActiveBlog(null)} aria-label="Close blog article">
              <X size={20} />
            </button>

            <header className={styles.blogModalHeader}>
              <p className={styles.blogModalAudience}>{activeBlog.audience}</p>
              <p className={styles.blogModalMeta}>{activeBlog.readTime}</p>
              <h2>{activeBlog.title}</h2>
              <p className={styles.blogModalIntro}>{activeBlog.intro}</p>
            </header>

            <div className={styles.blogModalBody}>
              {activeBlog.sections.map((section) => (
                <section key={section.heading} className={styles.blogModalSection}>
                  <h3>{section.heading}</h3>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </section>
              ))}
            </div>
          </article>
        </div>
      )}

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
