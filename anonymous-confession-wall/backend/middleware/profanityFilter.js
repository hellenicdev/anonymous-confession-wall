const badWords = [
  'abuse', 'anal', 'anals', 'anus', 'arse', 'ass', 'asshole', 'assholes',
  'bastard', 'bitch', 'bitches', 'blowjob', 'blowjobs', 'bollocks', 'boner',
  'boob', 'boobs', 'bugger', 'bullshit', 'buttplug',
  'chink', 'clit', 'clitoris', 'cock', 'cocks', 'condom', 'coon', 'crap',
  'cum', 'cunt', 'cunts',
  'damn', 'dick', 'dicks', 'dildo', 'dildos', 'doggystyle', 'douch', 'douche',
  'dyke',
  'ejaculate', 'erection', 'erotic', 'escort',
  'fag', 'faggot', 'fags', 'fart', 'fck', 'felch', 'fellatio', 'feltch', 'fetish',
  'fuck', 'fucked', 'fucker', 'fucking', 'fucks', 'f u c k',
  'gay', 'gays', 'genital', 'genitals', 'goddamn', 'gook',
  'handjob', 'hentai', 'homo', 'homosexual', 'hooker', 'horny', 'hump',
  'incest', 'jackass', 'jackoff', 'jerk', 'jizz', 'jerkoff',
  'kike', 'kkk', 'knob',
  'labia', 'lesbo', 'lesbian', 'lezbo', 'lezza', 'lust',
  'masterbat', 'masturbat', 'milf', 'molest', 'molestor', 'muff',
  'naked', 'nazi', 'negro', 'nigga', 'nigger', 'niggers', 'nude', 'nudity',
  'oral', 'orgasm', 'orgy',
  'panties', 'panty', 'pedo', 'pedophile', 'penis', 'penises', 'pimp', 'piss',
  'pissed', 'porn', 'porno', 'pornography', 'pornhub', 'prick', 'prostitut',
  'pube', 'pubes', 'pussy', 'pussies',
  'queef', 'queer',
  'rape', 'rapist', 'rectum', 'retard', 'rimjob', 'rough',
  'scrotum', 'semen', 'sex', 'sexy', 'sexual', 'shit', 'shits', 'shitt',
  'slut', 'sluts', 'smegma', 'spank', 'sperm', 'spick', 'spunk', 'stripper',
  'suck', 'sucks',
  'tits', 'titt', 'titty', 'titties', 'turd', 'twat',
  'urethra', 'urinal', 'urine',
  'vagina', 'vaginal', 'vibrator', 'vulva',
  'wang', 'wank', 'wanker', 'whore', 'wtf',
  'xxx',
  'arsehole', 'asshat', 'asswipe', 'bampot', 'bawsack', 'bellend',
  'berk', 'bint', 'bollok', 'bollok', 'bollox', 'bum', 'bumboy',
  'chav', 'crikey', 'cripple', 'dickhead', 'dickweed', 'div',
  'donga', 'dork', 'dunce', 'earhole', 'fanny', 'flamer', 'gash',
  'gimp', 'git', 'gobshite', 'goddam', 'goddamn', 'golliwog',
  'gonad', 'halfwit', 'hobag', 'hoer', 'jerk', 'jesus', 'jizzum',
  'kafir', 'knobhead', 'knobjockey', 'lardass', 'lunatic', 'minge',
  'minger', 'mook', 'moron', 'munter', 'nark', 'neegrow', 'niglet',
  'nigr', 'numpty', 'NUMTIT', 'paki', 'pillock', 'plonker', 'poof',
  'poon', 'poontang', 'potato', 'prairie', 'prig', 'punani', 'punny',
  'quim', 'raghead', 'rapey', 'raper', 'rectal', 'renob', 'rim',
  'sadist', 'sagg', 'scag', 'scank', 'schlong', 'scrote', 'shag',
  'shagged', 'shagger', 'shaggin', 'shav', 'shemale', 'shiz',
  'skag', 'skank', 'slag', 'sleaze', 'slutty', 'smeg', 'snatch',
  'spacker', 'spaz', 'spazmoid', 'spearchucker', 'splooge', 'spooge',
  'tard', 'testes', 'testicle', 'thundercunt', 'titty', 'tosser',
  'tramp', 'tranny', 'trollop', 'turd', 'twat', 'twathead',
  'twatting', 'twatwaffle', 'twazzock', 'ugly', 'unclefucker',
  'undies', 'unflushable', 'va-jay-jay', 'vag', 'vajayjay',
  'wad', 'wank', 'wanked', 'wanker', 'wankstain', 'wanksta',
  'wankster', 'waz', 'wedgie', 'weed', 'wog', 'wombat',
  'wop', 'wtf', 'xrated', 'yeasty', 'yid', 'zigabo', 'zipperfish'
];

const profanityFilter = (req, res, next) => {
  if (req.body.text) {
    const lowerText = req.body.text.toLowerCase();
    const found = badWords.some(word => {
      const regex = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      return regex.test(lowerText);
    });
    if (found) {
      return res.status(400).json({ error: 'Your confession contains inappropriate language. Please revise.' });
    }
  }
  next();
};

module.exports = profanityFilter;
