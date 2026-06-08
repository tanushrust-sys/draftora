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
  {
    title: 'Best Writing Apps for Students in 2026',
    summary:
      'The best writing apps in 2026 do more than fix spelling. They help students plan ideas, revise clearly, build vocabulary, and practice consistently without making writing feel intimidating.',
    audience: 'For students and families',
    readTime: '6 min read',
    intro:
      'Students in 2026 have access to more writing tools than ever, but not every app actually helps them become stronger writers. Some tools are useful for checking grammar. Some are good for note-taking. Some can generate text quickly. The best writing apps for students, however, do something more important: they help a student think clearly, organize ideas, improve a draft, and build writing confidence over time. That means the right app is not always the one with the most features. It is the one that supports the writing process in a way students can understand and actually use.',
    sections: [
      {
        heading: 'What students should look for in a writing app',
        paragraphs: [
          'A strong writing app should help students before, during, and after drafting. Before writing, it should make it easier to understand the task and organize ideas. During writing, it should keep the student focused instead of filling the screen with distractions. After writing, it should help the student revise with clear next steps rather than vague corrections. These three stages matter because students rarely struggle with only one part of writing. They often need support with planning, clarity, structure, and confidence at the same time.',
          'Another important factor is whether the app teaches independence. If a tool simply rewrites everything for the student, it may create short-term convenience but not long-term growth. Students improve when they can see what is weak, understand why it is weak, and practice making it stronger themselves. That is why the best writing apps do not just produce better sentences. They help students learn how to produce better sentences on their own.',
        ],
      },
      {
        heading: 'Different apps solve different writing problems',
        paragraphs: [
          'Some apps are best for brainstorming and collecting ideas. Others are useful for grammar checking, while some focus on classroom drafting, teacher feedback, or vocabulary growth. A student writing a persuasive paragraph may need a different tool from a student preparing a creative story or a reflection journal. Families often make the mistake of choosing one “everything app” and expecting it to solve every writing issue. In reality, the best choice depends on the type of writing support a student needs most right now.',
          'For example, a student who freezes at the start of a task benefits from prompts, scaffolds, and writing starters. A student whose work lacks detail may need sentence-level coaching and examples. A student who writes often but carelessly may need routines that emphasize revision and reflection. When parents or teachers understand the real bottleneck, they can choose a writing app based on function rather than hype.',
        ],
      },
      {
        heading: 'Why AI writing support matters in 2026',
        paragraphs: [
          'In 2026, AI is increasingly common in education, but its value depends on how it is used. Good AI writing support does not take over the student’s job. It shortens the feedback loop. Instead of waiting days to know whether a paragraph is clear, students can get immediate signals about structure, repetition, sentence strength, or missing detail. That speed matters because revision works best while the original thinking is still fresh in the student’s mind.',
          'The strongest AI writing apps also keep the student engaged in the process. They might highlight a confusing sentence, suggest where an example is needed, or encourage stronger vocabulary, but the student still has to make the decision and improve the draft. That balance is important. AI should reduce friction, not remove thinking. When it is used well, it helps students build habits that transfer into school assignments, exam writing, and independent work.',
        ],
      },
      {
        heading: 'What makes Draftora relevant for students',
        paragraphs: [
          'Draftora fits this newer category of writing apps because it is built around improvement, not just correction. Instead of acting like a simple grammar checker, it supports a full writing cycle: start a draft, review targeted feedback, revise clearly, and keep practicing. That matters for students who need confidence as much as they need correction. Many students already know that writing is hard for them. What they need is a process that makes progress visible and manageable.',
          'For families and classrooms, that structure is useful because it creates common language around writing. Students can see what to fix next. Parents can understand the feedback without needing to be writing experts. Teachers can reinforce the same revision habits more consistently. A writing tool becomes far more effective when it supports the student, the home, and the classroom with the same clear signals.',
        ],
      },
      {
        heading: 'How to choose the best app for your student',
        paragraphs: [
          'The best writing app is the one a student will actually use repeatedly. That means it should feel clear, motivating, and age-appropriate. If the interface is confusing or the feedback sounds robotic, students will ignore it. If it feels practical and specific, they are much more likely to build a routine around it. Families should test whether the app makes the student more willing to start writing, revise their work, and try again the next day.',
          'In the end, the question is not just “Which writing app is most advanced?” It is “Which writing app helps this student improve with consistency?” In 2026, the best writing tools are the ones that make growth visible, revision less stressful, and writing practice easier to sustain. When a student finds that kind of support, better writing becomes something they can build step by step rather than something they have to magically get right the first time.',
        ],
      },
    ],
  },
  {
    title: 'How Students Can Improve Writing Skills',
    summary:
      'Students improve writing fastest when they practice regularly, revise in small steps, and focus on clarity before perfection. Strong writing grows through routines, not last-minute effort.',
    audience: 'For students',
    readTime: '6 min read',
    intro:
      'Many students think good writing comes from talent, but strong writing is usually the result of habits. Students improve when they write often, notice what is weak, and learn how to revise with purpose. That means better writing is not built through one big assignment or one perfect day. It is built through many small sessions where a student drafts, reflects, edits, and tries again. Once students understand that writing is a process rather than a one-shot performance, progress starts to feel much more achievable.',
    sections: [
      {
        heading: 'Write more often than you think you need to',
        paragraphs: [
          'The biggest reason students stay stuck is not always lack of ability. It is lack of repetition. Writing is a skill, and skills improve through use. A student who writes three or four short times each week usually improves more than a student who writes only when school demands it. Frequent writing reduces fear because the page stops feeling unfamiliar. Students begin to trust that they can start, continue, and finish a piece even when the topic is not easy.',
          'These writing sessions do not need to be long. Ten to fifteen focused minutes can be enough to build momentum. What matters is consistency. A short paragraph, a reflection, a response to a prompt, or a quick descriptive scene all help students strengthen fluency. When students practice often, they also make more mistakes, and that is useful. Mistakes create the raw material that revision turns into growth.',
        ],
      },
      {
        heading: 'Start with clear ideas before chasing better sentences',
        paragraphs: [
          'Students often try to sound impressive before they know exactly what they want to say. This usually leads to confusing sentences, weak structure, or ideas that feel unfinished. It is much more effective to begin by clarifying the point. What am I trying to explain? What is my main argument? What should the reader understand by the end? Once those answers are clear, stronger sentences become much easier to write.',
          'A helpful habit is to plan briefly before drafting. Students can jot down three points, one example, and a possible ending before writing in full sentences. This does not need to be formal. Even a rough plan makes the draft more focused. When students know where they are going, they waste less time circling around the topic and more time building a piece that actually says something clearly.',
        ],
      },
      {
        heading: 'Use revision as the real place where writing improves',
        paragraphs: [
          'A first draft is not supposed to be polished. Its job is to get ideas onto the page. The real improvement usually happens during revision, when a student reads the draft again and asks what needs to change. Is the opening strong enough? Does the paragraph stay on topic? Are there places where more detail, explanation, or better vocabulary would help? These questions move writing forward much more effectively than simply correcting spelling.',
          'Students improve faster when revision is broken into small targets. Instead of trying to fix everything at once, choose one focus: make the topic sentence clearer, add one stronger example, remove repetition, or improve sentence flow. This keeps revision manageable. Over time, those small adjustments build into a much stronger draft. Students begin to see that writing does not need to be perfect immediately because they now know how to improve it in stages.',
        ],
      },
      {
        heading: 'Read your writing like a reader, not just a student',
        paragraphs: [
          'One of the best ways to improve writing is to step back and read the draft as if you did not write it. Would the meaning be clear to someone else? Would they know what the paragraph is trying to say? Would any part feel boring, repetitive, rushed, or confusing? This shift helps students notice problems that are easy to miss when they are too close to the piece.',
          'Reading aloud is especially useful. When a sentence sounds awkward out loud, it often needs to be rewritten. Reading aloud also helps students hear where punctuation is missing, where ideas jump too fast, and where the rhythm feels clumsy. It is one of the simplest strategies students can use on their own, and it builds a stronger instinct for clarity, tone, and flow with repeated practice.',
        ],
      },
      {
        heading: 'Build a system that makes progress visible',
        paragraphs: [
          'Students stay motivated when they can actually see improvement. That might mean saving earlier drafts, keeping a writing folder, tracking weekly sessions, or noting one thing that improved after each piece. When students compare an older paragraph with a newer one, they often notice stronger openings, clearer explanations, or more confident sentence structure. That visible progress matters because it turns effort into evidence.',
          'Improving writing skills is not about becoming brilliant overnight. It is about building a repeatable process: write regularly, plan simply, revise one thing at a time, and reflect on what got better. Students who follow that cycle become more capable and more confident. The students who improve most are usually not the ones waiting for inspiration. They are the ones who keep showing up to the page and learning how to make each draft a little stronger than the last.',
        ],
      },
    ],
  },
  {
    title: 'AI Writing Feedback for Primary School Students',
    summary:
      'Good AI writing feedback for primary students should be clear, gentle, and specific. It needs to support confidence while showing one simple next step that a child can use straight away.',
    audience: 'For parents and primary teachers',
    readTime: '6 min read',
    intro:
      'Primary school students need writing feedback that helps them grow without making writing feel scary. That is why AI feedback for younger writers must be designed differently from feedback for older students. It should be short enough to understand, positive enough to encourage effort, and specific enough to guide revision. When used properly, AI writing feedback can help primary students improve sentence clarity, add more detail, and build stronger habits while still keeping their own voice at the center of the writing process.',
    sections: [
      {
        heading: 'Why younger writers need different feedback',
        paragraphs: [
          'Primary students are still building basic writing confidence. Many are learning how to turn spoken ideas into written sentences, organize a paragraph, and stay focused on a prompt. If feedback is too long, too abstract, or too critical, it becomes hard for them to use. Instead of helping, it can make them feel confused or discouraged. Effective support at this stage must meet the child where they are and show one clear step they can take next.',
          'This is where carefully designed AI can help. Unlike delayed feedback that arrives after the student has emotionally moved on from the task, AI can respond while the child still remembers what they meant to say. If a sentence is unclear or a story needs more detail, the student can act on that guidance immediately. That speed makes feedback feel more useful and less like a judgment after the fact.',
        ],
      },
      {
        heading: 'The best AI feedback is simple and actionable',
        paragraphs: [
          'Primary students do not need a full essay about their paragraph. They need feedback such as: add one describing word here, explain what happened next, make this sentence clearer, or try a stronger opening. These kinds of directions are concrete. A child can actually do something with them. Over time, repeated exposure to this kind of feedback helps students internalize better writing patterns without feeling overloaded.',
          'It is also important that feedback recognizes what is already working. Younger students become more willing to revise when they hear that they have done something well first. For example, a tool might point out a strong idea, an interesting detail, or a clear sentence before suggesting one improvement. This balance matters. Students should feel that feedback is helping them grow, not simply pointing out errors.',
        ],
      },
      {
        heading: 'AI should support thinking, not replace it',
        paragraphs: [
          'A major concern with AI in education is whether it encourages dependency. That concern is valid if the system writes the answer for the child. Good AI writing feedback for primary students should not take over the task. It should guide the student to think again. If a child writes a weak sentence, the goal is not to swap it with a perfect AI sentence and move on. The goal is to help the child notice what is missing and try a better version themselves.',
          'That distinction is important for long-term growth. Primary students are still learning foundational habits: adding detail, sequencing ideas, choosing accurate words, and writing for a reader. These habits only develop when children remain active participants in the revision process. AI is most helpful when it acts like a prompt for better thinking rather than a shortcut around thinking.',
        ],
      },
      {
        heading: 'How parents and teachers can use AI feedback well',
        paragraphs: [
          'Adults should treat AI feedback as a conversation starter, not the final verdict. After a student receives a suggestion, a parent or teacher can ask simple questions: What do you think this means? Which sentence would you like to improve? Can you add one more detail here? These questions help children process the feedback rather than just react to it. They also build independence, because the student learns how to interpret writing advice for themselves.',
          'It is best to keep the revision target small. Younger writers benefit from improving one thing at a time. That could mean strengthening the first sentence, adding a feeling word, fixing a confusing idea, or expanding a short ending. When the target stays narrow, the child experiences success more quickly. That success builds the confidence needed to revise again in the future.',
        ],
      },
      {
        heading: 'What strong primary writing support should feel like',
        paragraphs: [
          'At its best, AI writing feedback for primary students should feel calm, encouraging, and clear. It should reduce the stress of “I do not know what to do next” and replace it with a manageable step. Students should finish a writing session understanding at least one thing they did well and one thing they can make better. That is how a child begins to see writing as something they can improve rather than something they either can or cannot do.',
          'This is why the design of the tool matters so much. Primary students need support that respects their stage of learning. If the feedback is developmentally appropriate, AI can become a very practical ally for schools and families. It can help children build stronger paragraphs, better sentences, and more positive writing habits without taking away the thinking and effort that real writing growth depends on.',
        ],
      },
    ],
  },
  {
    title: 'Writing Activities for Grade 4–6 Students',
    summary:
      'Strong writing activities for Grades 4 to 6 should build confidence, expand ideas, and make revision feel normal. The best tasks are short, purposeful, and easy to repeat each week.',
    audience: 'For primary classrooms',
    readTime: '6 min read',
    intro:
      'Students in Grades 4 to 6 are at an important stage in writing development. They are moving beyond very simple sentences, but many still need support with organizing ideas, adding detail, and revising clearly. That means writing activities should do more than fill time. They should help students practice specific skills in a way that feels achievable. The most effective activities are not always long assignments. Often, they are short, structured tasks that students can repeat regularly until stronger writing habits begin to form.',
    sections: [
      {
        heading: 'Use quick prompts to lower the pressure of starting',
        paragraphs: [
          'One of the biggest writing hurdles for this age group is simply getting started. Many students stare at the page because they are unsure how to begin. Quick prompts solve this by narrowing the task. A prompt might ask students to describe a surprising sound, explain the best part of their morning, or imagine finding a hidden door in the classroom wall. These kinds of openings reduce the fear of the blank page and help students enter the task with momentum.',
          'Teachers can keep the prompt routine short and consistent. For example, students might complete a ten-minute writing burst three times a week. The goal is not to finish a masterpiece. The goal is to build fluency. As students become more comfortable starting quickly, they gain confidence that they can produce ideas on demand instead of waiting for inspiration or permission to feel ready.',
        ],
      },
      {
        heading: 'Choose activities that target one writing skill at a time',
        paragraphs: [
          'Students improve faster when an activity has a clear skill focus. One day the focus might be strong openings. Another day it could be adding detail, using better verbs, or improving paragraph endings. When too many goals are combined in one task, students often miss the real lesson. A narrow focus helps them understand what good writing looks like in one area before trying to manage everything at once.',
          'For example, a “detail expansion” activity can start with a plain sentence like “The dog ran outside.” Students then rewrite it by adding description, movement, or feeling. This teaches specificity. A “sentence combining” activity can help them build smoother, more mature sentences from short basic ones. Over time, these small exercises strengthen the tools students bring into longer assignments.',
        ],
      },
      {
        heading: 'Make revision part of the activity, not an afterthought',
        paragraphs: [
          'Many students in Grades 4 to 6 think writing ends when the draft is finished. That is why writing activities should include a visible revision step. After a short draft, students can highlight their best sentence, underline a place that needs more detail, or swap with a partner to get one suggestion. These routines teach that writing is something you shape, not just something you produce once and submit.',
          'Revision activities work best when they are simple. Ask students to improve only the first sentence, add one specific example, or replace two ordinary words with stronger choices. This keeps revision from feeling like a punishment. Instead, it becomes a normal and manageable part of writing. Students begin to understand that even good writing usually starts as something rough that becomes clearer through changes.',
        ],
      },
      {
        heading: 'Use sharing and reflection to build motivation',
        paragraphs: [
          'Students are often more engaged when they know their writing will be heard or noticed. This does not mean every piece needs a full presentation. Small sharing routines are enough. A teacher might invite students to read one strong sentence aloud, post a favorite line on the wall, or choose an example of strong detail from a partner. These moments help students value the craft of writing because their words begin to feel real and worth improving.',
          'Reflection is just as important. After an activity, students can answer quick questions such as: What part did I improve today? What was difficult? Which sentence am I proud of? Reflection turns the task into learning rather than simple completion. Over time, students become more aware of their own progress and more able to explain what stronger writing actually involves.',
        ],
      },
      {
        heading: 'Build a weekly rhythm that students can trust',
        paragraphs: [
          'The best writing activities become more powerful when they are part of a predictable routine. For Grades 4 to 6, that might look like one quick prompt day, one skill-practice day, one drafting day, and one revision or sharing day. A regular rhythm helps students know what to expect, which reduces resistance and creates more room for actual improvement. Writing starts to feel like a normal practice rather than a surprise challenge.',
          'When students experience that rhythm week after week, they begin to accumulate real gains. Their sentences become fuller, their ideas more organized, and their willingness to revise more natural. Writing activities do not need to be flashy to work. They need to be purposeful, repeatable, and connected to the specific skills students are still building. That is what helps Grades 4 to 6 writers grow in a steady and lasting way.',
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
