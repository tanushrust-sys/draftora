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

const WRITING_UPGRADE_TOOLS = [
  {
    icon: MessageSquareText,
    label: 'Feedback',
    text: 'Shows what is vague, missing, or unclear.',
  },
  {
    icon: Wand2,
    label: 'Rewrite',
    text: 'Models a stronger version without taking over the voice.',
  },
  {
    icon: Sparkles,
    label: 'Sentence Strength',
    text: 'Improves detail, flow, and confidence.',
  },
  {
    icon: BookOpen,
    label: 'Vocabulary Lift',
    text: 'Suggests richer words that still fit the sentence.',
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
            <p className={styles.eyebrow}>AI WRITING WORKSPACE FOR STUDENTS</p>
            <h1 aria-label="Build confident writers, one stronger draft at a time.">
              Build confident writers, one stronger draft at a time.
            </h1>
            <p className={styles.subhead}>
              Draftora helps students transform uncertain first drafts into clear, thoughtful writing by strengthening structure, deepening ideas, and building revision habits that create lasting confidence in how they express themselves.
            </p>
            <p className={styles.heroPunch}>Better writing is not talent. It is a process students can learn, practice, and own.</p>
            <div className={styles.heroActions}>
              <Link href="/signup" className={styles.primaryCta}>
                <span className={styles.ctaCopy}>
                  <span className={styles.ctaMain}>Start Writing Free</span>
                  <span className={styles.ctaSub}>Open Writing Studio in seconds</span>
                </span>
                <span className={styles.ctaArrowWrap}>
                  <ArrowRight size={16} />
                </span>
              </Link>
              <div className={styles.heroSecondaryActions}>
                <Link href="/dashboard?practice=1" className={styles.practiceHeroCta}>
                  <span className={styles.practiceHeroIcon}>
                    <FlaskConical size={15} />
                  </span>
                  <span className={styles.practiceHeroCopy}>
                    <span>Try Practice Mode</span>
                    <small>No signup, resets after use</small>
                  </span>
                </Link>
                <a href="#showcase" className={styles.secondaryHeroCta}>
                  View Live Demo
                </a>
              </div>
            </div>
            <p className={styles.heroTrustLine}>Trusted by students, parents, tutors, and teachers across everyday writing practice.</p>
            <div className={styles.heroProofGrid}>
              <article className={styles.heroProofCard}>
                <MessageSquareText size={15} />
                <div>
                  <strong>Writing Studio</strong>
                  <span>Draft and revise with clear guided feedback</span>
                </div>
              </article>
              <article className={styles.heroProofCard}>
                <BookOpen size={15} />
                <div>
                  <strong>Vocabulary Growth</strong>
                  <span>Build stronger word choice with daily practice</span>
                </div>
              </article>
              <article className={styles.heroProofCard}>
                <Sparkles size={15} />
                <div>
                  <strong>AI Coach</strong>
                  <span>Personal support for writing goals and revision</span>
                </div>
              </article>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroVisualGlow} aria-hidden="true" />
            <article className={styles.liveWorkspaceShell} aria-label="Draftora live student workspace">
              <div className={styles.liveDemoBrowserBar}>
                <span />
                <span />
                <span />
                <strong>draftora.com.au/student-workspace</strong>
              </div>

              <div className={styles.liveDemoTabRow}>
                <span className={styles.liveDemoTabActive}>Writing Studio</span>
                <span>AI Feedback</span>
                <span>Vocabulary</span>
                <span>Teacher View</span>
              </div>

              <div className={styles.liveDemoWorkspaceBody}>
                <section className={styles.liveDemoWritingPane}>
                  <p className={styles.liveDemoPrompt}>Prompt: Explain a moment that changed your perspective.</p>
                  <h3>Your Writing</h3>
                  <p>
                    My science project taught me to test ideas before giving up. At first our circuit failed, and I thought I was doing everything wrong. After checking each wire step by step, we found a loose connection and the bulb lit up.
                  </p>
                  <div className={styles.liveDemoMetaPills}>
                    <span>Writing score 82</span>
                    <span>Clarity improved +14%</span>
                    <span>Vocabulary suggestions ready</span>
                  </div>
                </section>

                <aside className={styles.liveDemoFeedbackPane}>
                  <p className={styles.liveDemoPanelTitle}>AI Feedback</p>
                  <article className={styles.liveDemoFeedbackCard}>
                    <strong>Strength</strong>
                    <span>Clear personal reflection with a concrete outcome.</span>
                  </article>
                  <article className={styles.liveDemoFeedbackCard}>
                    <strong>Next step</strong>
                    <span>Add one sensory detail to make the experiment scene more vivid.</span>
                  </article>
                  <article className={styles.liveDemoFeedbackCard}>
                    <strong>Rewritten version</strong>
                    <span>Your revision keeps your voice but improves precision and flow.</span>
                  </article>
                  <article className={styles.liveDemoFeedbackCard}>
                    <strong>Teacher review status</strong>
                    <span>Assignment submitted, feedback synced, ready for review.</span>
                  </article>
                </aside>
              </div>
            </article>

            <article className={`${styles.liveDemoCallout} ${styles.liveDemoCalloutA}`}>
              <p>Realtime Coaching</p>
              <strong>AI Feedback Ready</strong>
              <span>Instant strengths, improvements, and revision steps.</span>
            </article>
            <article className={`${styles.liveDemoCallout} ${styles.liveDemoCalloutB}`}>
              <p>Vocabulary Progress</p>
              <strong>Vocabulary Mastery +12</strong>
              <span>Word usage and mastery signals stay visible per draft.</span>
            </article>
            <article className={`${styles.liveDemoCallout} ${styles.liveDemoCalloutC}`}>
              <p>Submission Flow</p>
              <strong>Revision steps ready</strong>
              <span>Next actions are sequenced to keep writing momentum.</span>
            </article>

            <article className={styles.heroKpiStrip} aria-label="Draftora impact highlights">
              <div>
                <p>Teacher Review</p>
                <strong>Assignments and submissions stay synced, clear, and review-ready.</strong>
              </div>
            </article>

            <article className={styles.liveDemoProgressCard}>
              <div className={styles.liveDemoProgressTop}>
                <span>Progress Snapshot</span>
                <span>Teacher-ready</span>
              </div>
              <div className={styles.liveDemoProgressGrid}>
                <section className={styles.liveDemoProgressColumn}>
                  <h4>What&apos;s going well</h4>
                  <ul>
                    <li>Clearer idea development across paragraphs</li>
                    <li>More precise vocabulary in context</li>
                    <li>Stronger revision consistency this week</li>
                  </ul>
                </section>
                <section className={styles.liveDemoProgressColumn}>
                  <h4>Next improvements</h4>
                  <ul>
                    <li>Add one stronger opening hook</li>
                    <li>Improve sentence variety in middle section</li>
                    <li>Refine the ending with a clearer takeaway</li>
                  </ul>
                </section>
                <section className={styles.liveDemoProgressColumn}>
                  <h4>Teacher review status</h4>
                  <div className={styles.liveDemoStatusPills}>
                    <span>Assignment submitted</span>
                    <span>Feedback synced</span>
                    <span>Ready for review</span>
                  </div>
                </section>
              </div>
            </article>
          </div>
        </section>

        <section className={`${styles.proofSection} ${styles.reveal}`} data-reveal>
          <div className={styles.sectionHead}>
            <h2>See the upgrade happen inside Draftora</h2>
            <p className={styles.sectionSubhead}>
              Students do not just get a better sentence. They see which tools helped them make it stronger.
            </p>
          </div>
          <div className={styles.proofShowcase}>
            <article className={`${styles.proofPanel} ${styles.proofPanelBefore}`}>
              <div className={styles.proofPanelTop}>
                <div>
                  <p className={styles.proofLabel}>Student draft</p>
                  <h3>Good idea, flat writing</h3>
                </div>
                <span className={styles.proofToneTag}>Needs detail</span>
              </div>
              <p className={styles.proofDraftText}>
                My school day was good. We did science and it was fun. I learned things and then I went home.
              </p>
              <div className={styles.proofIssueList} aria-label="Writing issues Draftora detects">
                <span>Generic words</span>
                <span>No clear moment</span>
                <span>Weak ending</span>
              </div>
            </article>

            <div className={styles.proofToolPanel}>
              <p className={styles.proofToolEyebrow}>Draftora applies</p>
              <div className={styles.proofToolGrid}>
                {WRITING_UPGRADE_TOOLS.map(({ icon: Icon, label, text }) => (
                  <article key={label} className={styles.proofToolCard}>
                    <span className={styles.proofToolIcon}>
                      <Icon size={15} />
                    </span>
                    <div>
                      <h4>{label}</h4>
                      <p>{text}</p>
                    </div>
                  </article>
                ))}
              </div>
              <div className={styles.proofRevisionBridge} aria-hidden="true">
                <span>Guided revision</span>
                <ArrowRight className={styles.proofArrow} size={18} />
              </div>
            </div>

            <article className={`${styles.proofPanel} ${styles.proofPanelAfter}`}>
              <div className={styles.proofPanelTop}>
                <div>
                  <p className={styles.proofLabel}>Upgraded draft</p>
                  <h3>Specific, clear, confident</h3>
                </div>
                <span className={`${styles.proofToneTag} ${styles.proofToneTagStrong}`}>Specific</span>
              </div>
              <p className={styles.proofDraftText}>
                In science, my group spent twenty minutes tracing a fault in our circuit before one loose wire finally clicked into place and lit the bulb. Seeing that tiny glow made the whole lesson real: electricity only flows when the loop is complete. I went home and showed my parents how each connection changes the outcome.
              </p>
              <ul className={styles.proofWinList}>
                <li>
                  <CheckCircle2 size={14} />
                  <span>Concrete detail</span>
                </li>
                <li>
                  <CheckCircle2 size={14} />
                  <span>Stronger vocabulary</span>
                </li>
                <li>
                  <CheckCircle2 size={14} />
                  <span>Clear learning outcome</span>
                </li>
              </ul>
            </article>
          </div>
          <div className={styles.proofCtaWrap}>
            <Link href="/signup" className={styles.proofCta}>
              Start writing free
              <ArrowRight size={16} />
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

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>Draftora</div>
        <nav className={styles.footerLinks}>
          <Link href="/login">Login</Link>
          <Link href="/signup">Sign Up</Link>
          <Link href="/about">About</Link>
        </nav>
        <p className={styles.footerCopy}>© {new Date().getFullYear()} Draftora. All rights reserved.</p>
      </footer>

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
    </div>
  );
}
