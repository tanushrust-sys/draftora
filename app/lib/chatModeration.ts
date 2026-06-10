const MAX_MESSAGE_LENGTH = 500;

const FRIENDLY_BLOCK_MESSAGE = 'That message can’t be sent. Please keep Draftora safe and kind.';

const BLOCKED_SINGLE_TERMS = [
  'anal',
  'arse',
  'arsehole',
  'ass',
  'asshat',
  'asshole',
  'bastard',
  'biatch',
  'bimbo',
  'blowjob',
  'bollocks',
  'boner',
  'boob',
  'boobs',
  'bootycall',
  'brothel',
  'bullcrap',
  'butthole',
  'camgirl',
  'camsex',
  'clit',
  'cock',
  'coon',
  'crap',
  'cum',
  'cunt',
  'dammit',
  'dick',
  'dildo',
  'dipshit',
  'douche',
  'douchebag',
  'dyke',
  'escort',
  'fag',
  'faggot',
  'fuck',
  'fucker',
  'fucking',
  'goddamn',
  'gonorrhea',
  'handjob',
  'hentai',
  'hoe',
  'hooker',
  'horny',
  'jackass',
  'jerkoff',
  'jizz',
  'kike',
  'masturbate',
  'milf',
  'motherfucker',
  'nazi',
  'nigga',
  'nigger',
  'nutsack',
  'orgasm',
  'penis',
  'porn',
  'porno',
  'pornography',
  'pussy',
  'rape',
  'rapist',
  'retard',
  'scrotum',
  'sex',
  'sexting',
  'shit',
  'shitter',
  'slut',
  'spastic',
  'sperm',
  'testicle',
  'thot',
  'tit',
  'tits',
  'twat',
  'vagina',
  'vibrator',
  'wanker',
  'whore',
];

const BLOCKED_BULLYING_PHRASES = [
  'everyone hates you',
  'go away forever',
  'go die',
  'go kill yourself',
  'i hate you',
  'kill yourself',
  'nobody likes you',
  'shut up forever',
  'you are a freak',
  'you are a loser',
  'you are annoying',
  'you are bad',
  'you are disgusting',
  'you are dumb',
  'you are embarrassing',
  'you are fake',
  'you are gross',
  'you are horrible',
  'you are pathetic',
  'you are stupid',
  'you belong nowhere',
  'you should disappear',
  'you should feel bad',
  'you should quit',
  'you suck',
  'you stink',
  'you worthless',
];

const BLOCKED_THREAT_PHRASES = [
  'beat you up',
  'break your face',
  'come after you',
  'find you and hurt you',
  'hurt you',
  'i am watching you',
  'i know where you live',
  'i will attack you',
  'i will beat you',
  'i will get you',
  'i will hurt you',
  'i will jump you',
  'i will ruin your life',
  'i will stab you',
  'i will smash you',
  'i will threaten you',
  'i will track you down',
  'i will punch you',
  'i will wreck you',
  'slash your tires',
  'threaten your family',
];

const BLOCKED_GROOMING_PHRASES = [
  'are you alone',
  'can we meet alone',
  'delete our chat',
  'do not tell your parents',
  'do not tell your teacher',
  'keep this between us',
  'keep this secret',
  'meet me after school',
  'meet me alone',
  'message me privately',
  'sneak out',
  'tell no one',
];

const BLOCKED_PRIVATE_INFO_PHRASES = [
  'drop your address',
  'give me your address',
  'give me your number',
  'send me your address',
  'send me your number',
  'send your password',
  'share your location',
  'what is your address',
  'what is your number',
  'what is your password',
  'what is your snap',
  'what school do you go to',
  'where are you right now',
  'where do you live',
  'where is your house',
];

const BLOCKED_SELF_HARM_PHRASES = [
  'cut yourself',
  'end your life',
  'hurt yourself',
  'nobody would care if you died',
  'you should die',
  'you should hurt yourself',
];

const BLOCKED_HATE_PHRASES = [
  'dirty immigrant',
  'go back to your country',
  'hate all girls',
  'hate all boys',
  'hate gay people',
  'hate trans people',
  'people like you are trash',
  'you do not belong because of your race',
];

const SUSPICIOUS_SOCIAL_TERMS = [
  'discord',
  'facebook',
  'instagram',
  'kik',
  'messenger',
  'roblox username',
  'snap',
  'snapchat',
  'telegram',
  'tiktok',
  'whatsapp',
];

const SUSPICIOUS_PRIVATE_ASK_PATTERNS = [
  /\b(?:what(?:'s| is)|tell me|send me|drop|share|give me)\s+(?:your\s+)?(?:full\s+)?name\b/i,
  /\b(?:what(?:'s| is)|tell me|send me|drop|share|give me)\s+(?:your\s+)?phone(?:\s+number)?\b/i,
  /\b(?:what(?:'s| is)|tell me|send me|drop|share|give me)\s+(?:your\s+)?email\b/i,
  /\b(?:what(?:'s| is)|tell me|send me|drop|share|give me)\s+(?:your\s+)?address\b/i,
  /\b(?:what(?:'s| is)|tell me|send me|drop|share|give me)\s+(?:your\s+)?school\b/i,
  /\b(?:what(?:'s| is)|tell me|send me|drop|share|give me)\s+(?:your\s+)?suburb\b/i,
  /\b(?:what(?:'s| is)|tell me|send me|drop|share|give me)\s+(?:your\s+)?location\b/i,
  /\b(?:what(?:'s| is)|tell me|send me|drop|share|give me)\s+(?:your\s+)?password\b/i,
  /\b(?:what(?:'s| is)|tell me|send me|drop|share|give me)\s+(?:your\s+)?socials?\b/i,
  /\b(?:what(?:'s| is)|tell me|send me|drop|share|give me)\s+(?:your\s+)?snap(?:chat)?\b/i,
  /\b(?:what(?:'s| is)|tell me|send me|drop|share|give me)\s+(?:your\s+)?insta(?:gram)?\b/i,
  /\b(?:what(?:'s| is)|tell me|send me|drop|share|give me)\s+(?:your\s+)?discord\b/i,
];

const SUSPICIOUS_MEETUP_PATTERNS = [
  /\bcome meet me\b/i,
  /\bdo you want to meet\b/i,
  /\blet(?:')?s meet\b/i,
  /\bmeet (?:at|by|near|outside|inside)\b/i,
  /\bmeet me (?:after|before|outside|near)\b/i,
  /\bsee you in person\b/i,
];

const UNSAFE_PATTERNS = [
  /\bare you home alone\b/i,
  /\bdelete this chat\b/i,
  /\bhide this from\b/i,
  /\bkeep this secret\b/i,
  /\bmessage me when your parents sleep\b/i,
  /\bno adults need to know\b/i,
  /\bsecret between us\b/i,
  /\bwhat time are you alone\b/i,
  ...SUSPICIOUS_PRIVATE_ASK_PATTERNS,
  ...SUSPICIOUS_MEETUP_PATTERNS,
];

const PRIVATE_INFO_PATTERNS = [
  /\b\d{8,}\b/,
  /\b(?:\+?\d[\d\s().-]{7,}\d)\b/,
  /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i,
  /\b\d{1,5}\s+[a-z0-9.'-]+\s+(street|st|road|rd|avenue|ave|drive|dr|lane|ln|court|ct|close|crescent|cres|way|boulevard|blvd)\b/i,
  /\b(?:my|our)\s+address\s+is\b/i,
  /\b(?:i live at|come to)\s+\d{1,5}\b/i,
  /\b(?:school address|home address)\b/i,
  /\b(?:postcode|zip code)\b/i,
  /\b(?:unit|apartment|apt)\s+\d+\b/i,
];

const URL_PATTERNS = [
  /\bhttps?:\/\/\S+\b/i,
  /\bwww\.\S+\b/i,
  /\b(?:discord\.gg|bit\.ly|tinyurl\.com|linktr\.ee)\b/i,
];

const HANDLE_PATTERNS = [
  /@[a-z0-9._]{3,}/i,
  /\buser(?:name)?\s*[:=]\s*[a-z0-9._-]{3,}\b/i,
];

const AGE_OR_LOCATION_PATTERNS = [
  /\bi am \d{1,2}\b/i,
  /\bi'm \d{1,2}\b/i,
  /\bmy age is \d{1,2}\b/i,
  /\bi live in [a-z][a-z\s'-]{2,}\b/i,
  /\bmy suburb is [a-z][a-z\s'-]{2,}\b/i,
  /\bmy town is [a-z][a-z\s'-]{2,}\b/i,
];

const SPAM_PATTERNS = [
  /(.)\1{7,}/,
  /\b(\w+)(?:\s+\1){5,}\b/i,
  /([!?.,])\1{6,}/,
];

const ALLOWED_CONTEXT_EXCEPTIONS = [
  'sexagesimal',
  'class assignment on war and peace',
  'password in a story prompt',
];

export type ChatModerationResult = {
  allowed: boolean;
  reason?: string;
  cleanMessage?: string;
};

function collapseWhitespace(message: string) {
  return message.replace(/\s+/g, ' ').trim();
}

function collapseRepeatedLetters(message: string) {
  return message.replace(/([a-z])\1{2,}/gi, '$1$1');
}

function normalizeSeparators(message: string) {
  return message
    .replace(/[_~`*^|]+/g, ' ')
    .replace(/[()[\]{}<>]+/g, ' ')
    .replace(/[\\/]+/g, ' ')
    .replace(/[-=+]+/g, ' ');
}

function normalizeLeetspeak(message: string) {
  return message
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's');
}

function buildSpacedVariant(message: string) {
  return message.replace(/[^a-z0-9]+/gi, '');
}

function buildWordPattern(term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const flexible = escaped.replace(/\s+/g, '\\s+');
  return new RegExp(`\\b${flexible}\\b`, 'i');
}

const BLOCKED_SINGLE_TERM_PATTERNS = BLOCKED_SINGLE_TERMS.map(buildWordPattern);
const BLOCKED_BULLYING_PATTERNS = BLOCKED_BULLYING_PHRASES.map(buildWordPattern);
const BLOCKED_THREAT_PATTERNS = BLOCKED_THREAT_PHRASES.map(buildWordPattern);
const BLOCKED_GROOMING_PATTERNS = BLOCKED_GROOMING_PHRASES.map(buildWordPattern);
const BLOCKED_PRIVATE_INFO_PATTERNS = BLOCKED_PRIVATE_INFO_PHRASES.map(buildWordPattern);
const BLOCKED_SELF_HARM_PATTERNS = BLOCKED_SELF_HARM_PHRASES.map(buildWordPattern);
const BLOCKED_HATE_PATTERNS = BLOCKED_HATE_PHRASES.map(buildWordPattern);
const SUSPICIOUS_SOCIAL_PATTERNS = SUSPICIOUS_SOCIAL_TERMS.map(buildWordPattern);

function containsAnyPattern(message: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(message));
}

function containsAnyLiteral(message: string, phrases: string[]) {
  return phrases.some((phrase) => message.includes(phrase));
}

function hasAllowedException(message: string) {
  return ALLOWED_CONTEXT_EXCEPTIONS.some((phrase) => message.includes(phrase));
}

function getNormalizationVariants(message: string) {
  const collapsed = collapseWhitespace(message);
  const lowered = collapsed.toLowerCase();
  const noSeparators = collapseWhitespace(normalizeSeparators(lowered));
  const leet = collapseWhitespace(normalizeLeetspeak(noSeparators));
  const compact = buildSpacedVariant(leet);
  const repeated = collapseWhitespace(collapseRepeatedLetters(leet));

  return {
    collapsed,
    lowered,
    noSeparators,
    leet,
    compact,
    repeated,
  };
}

function messageLooksLikeBypassedBlockedWord(variant: ReturnType<typeof getNormalizationVariants>) {
  const compactTerms = BLOCKED_SINGLE_TERMS
    .filter((term) => !term.includes(' '))
    .map((term) => term.replace(/[^a-z0-9]+/g, ''));

  return compactTerms.some((term) => variant.compact.includes(term));
}

function hasPrivateInfoSignal(variant: ReturnType<typeof getNormalizationVariants>) {
  return (
    containsAnyPattern(variant.collapsed, PRIVATE_INFO_PATTERNS)
    || containsAnyPattern(variant.collapsed, URL_PATTERNS)
    || containsAnyPattern(variant.collapsed, HANDLE_PATTERNS)
    || containsAnyPattern(variant.collapsed, AGE_OR_LOCATION_PATTERNS)
  );
}

function hasSpamSignal(variant: ReturnType<typeof getNormalizationVariants>) {
  if (variant.collapsed.length > MAX_MESSAGE_LENGTH) return true;
  if (containsAnyPattern(variant.collapsed, SPAM_PATTERNS)) return true;

  const words = variant.collapsed.split(/\s+/).filter(Boolean);
  if (words.length >= 12) {
    const uniqueWords = new Set(words.map((word) => word.toLowerCase()));
    if (uniqueWords.size <= 3) return true;
  }

  return false;
}

function hasUnsafeSocialRequest(variant: ReturnType<typeof getNormalizationVariants>) {
  if (!containsAnyPattern(variant.collapsed, SUSPICIOUS_SOCIAL_PATTERNS)) return false;
  return /\b(?:what(?:'s| is)|send|share|give|drop|tell me|add me|message me)\b/i.test(variant.collapsed);
}

function hasBlockedContent(variant: ReturnType<typeof getNormalizationVariants>) {
  const candidates = [
    variant.lowered,
    variant.noSeparators,
    variant.leet,
    variant.repeated,
  ];

  for (const candidate of candidates) {
    if (containsAnyPattern(candidate, BLOCKED_SINGLE_TERM_PATTERNS)) return true;
    if (containsAnyPattern(candidate, BLOCKED_BULLYING_PATTERNS)) return true;
    if (containsAnyPattern(candidate, BLOCKED_THREAT_PATTERNS)) return true;
    if (containsAnyPattern(candidate, BLOCKED_GROOMING_PATTERNS)) return true;
    if (containsAnyPattern(candidate, BLOCKED_PRIVATE_INFO_PATTERNS)) return true;
    if (containsAnyPattern(candidate, BLOCKED_SELF_HARM_PATTERNS)) return true;
    if (containsAnyPattern(candidate, BLOCKED_HATE_PATTERNS)) return true;
    if (containsAnyPattern(candidate, UNSAFE_PATTERNS)) return true;
  }

  return false;
}

export function normalizeChatMessage(message: string) {
  return collapseWhitespace(message).slice(0, MAX_MESSAGE_LENGTH);
}

export function moderateChatMessage(message: string): ChatModerationResult {
  const cleanMessage = normalizeChatMessage(message);

  if (!cleanMessage) {
    return { allowed: false, reason: 'Please write a message before sending.' };
  }

  const variant = getNormalizationVariants(cleanMessage);

  if (hasAllowedException(variant.lowered)) {
    return { allowed: true, cleanMessage };
  }

  if (hasBlockedContent(variant)) {
    return {
      allowed: false,
      reason: FRIENDLY_BLOCK_MESSAGE,
    };
  }

  if (messageLooksLikeBypassedBlockedWord(variant)) {
    return {
      allowed: false,
      reason: FRIENDLY_BLOCK_MESSAGE,
    };
  }

  if (hasPrivateInfoSignal(variant)) {
    return {
      allowed: false,
      reason: FRIENDLY_BLOCK_MESSAGE,
    };
  }

  if (hasUnsafeSocialRequest(variant)) {
    return {
      allowed: false,
      reason: FRIENDLY_BLOCK_MESSAGE,
    };
  }

  if (hasSpamSignal(variant)) {
    return {
      allowed: false,
      reason: 'That message can’t be sent yet. Please slow down and send something clearer.',
    };
  }

  if (containsAnyLiteral(variant.lowered, ['dm me', 'private chat', 'talk somewhere else'])) {
    return {
      allowed: false,
      reason: FRIENDLY_BLOCK_MESSAGE,
    };
  }

  return { allowed: true, cleanMessage };
}
