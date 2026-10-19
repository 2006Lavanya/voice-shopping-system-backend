/**
 * assistantEngine.js
 * ------------------
 * The "brain" of the VoiceShop assistant. 100% offline and rule-based (no paid API,
 * nothing to configure), but it understands:
 *   - English (incl. Indian English)
 *   - Tamil, Hindi, Telugu, Malayalam, Kannada (native script, as speech recognition returns it)
 *   - "Tanglish"/"Hinglish" style Latin spellings  ("iphone 15 cart la add pannu")
 *
 * understandMessage() turns a sentence into a structured command:
 *   { intent, terms[], qty, ordinal, useContext, maxPrice, minPrice, sort, buyNow, ... }
 * The controller then resolves `terms` against the real product catalog (catalogMatcher.js)
 * and performs the action (cart / wishlist / search / navigation).
 *
 * Replies are always produced in the language the shopper used (see `translate`).
 */
import { detectScriptLang, hasIndic } from "./phonetics.js";

export const SUPPORTED_LANGS = ["en-US", "en-IN", "ta-IN", "hi-IN", "te-IN", "ml-IN", "kn-IN"];

// Zero-width joiners are inserted inconsistently by speech engines - drop them everywhere.
const strip = (s) => s.normalize("NFC").replace(/[​-‍⁠﻿]/g, "");

// ---------------------------------------------------------------------------
// 1. Lexicon: word -> action. Latin spellings include Tanglish / Hinglish variants.
// ---------------------------------------------------------------------------
const ACTS = {
  ADD: [
    "ஆட்", "ஆட் பண்ணு", "ஆட் பண்ணுங்க", "ऐड", "एड", "యాడ్", "ಆಡ್", "ആഡ്",
    "add", "ad", "edd", "put", "place in", "insert", "include", "keep",
    "serthu", "sethu", "serthudu", "sethudu", "serkka", "serkavum", "serkkavum", "serunga", "serthuru", "podu", "podunga", "poodu", "pottu", "poduga", "potrunga", "pottudu", "potudu",
    "jodo", "jodh", "jodiye", "daalo", "dalo", "dal do", "daal do", "pettu", "veyyi", "cherkku", "cherkkuka", "haaku", "sersu", "serisu",
    "சேர்", "சேர்க்க", "சேர்த்து", "சேத்து", "சேருங்கள்", "சேர்க்கவும்", "போடு", "போடுங்க", "போடுங்கள்", "போட்டு", "போடு",
    "जोड़ो", "जोड़ें", "जोड़", "डालो", "डाल", "डालें", "रखो",
    "చేర్చు", "చేర్చండి", "పెట్టు", "వేయి", "వెయ్యి", "పెట్టండి",
    "ಸೇರಿಸು", "ಸೇರಿಸಿ", "ಹಾಕು", "ಹಾಕಿ",
    "ചേർക്കൂ", "ചേർക്കുക", "ചേർക്കു", "ഇടൂ", "ഇടുക",
  ],
  BUY: [
    "buy", "purchase", "order now", "buy now", "vaangu", "vaanga", "vangu", "vaangunga", "vaangidu", "vaanganum", "vaangi", "kharido", "khareedo", "kharid", "konu", "konandi", "kollu", "vaangu", "kollalu",
    "வாங்கு", "வாங்க", "வாங்குங்க", "வாங்கிடு", "வாங்கணும்", "வாங்கவும்",
    "खरीदो", "खरीदें", "खरीद", "ख़रीदो",
    "కొను", "కొనండి", "కొనాలి", "కొనుగోలు",
    "ಖರೀದಿಸು", "ಖರೀದಿಸಿ", "ಕೊಳ್ಳು",
    "വാങ്ങു", "വാങ്ങൂ", "വാങ്ങുക", "വാങ്ങണം",
  ],
  REMOVE: [
    "ரிமூவ்", "रिमूव", "రిమూవ్", "ರಿಮೂವ್", "റിമൂവ്",
    "remove", "delete", "discard", "take out", "take it out", "take that out", "take this out", "get rid of", "throw away", "drop", "eduthudu", "eduthuru", "eduthudunga", "eduthuri", "edu", "eduthu", "neekku", "neeku", "neekunga", "neekkunga", "nikku", "nikkunga", "hatao", "hata do", "hataiye", "nikalo", "nikal do", "teeseyyi", "teeseyandi", "teesey", "tegi", "tegeyyi", "thegi", "nikkam",
    "நீக்கு", "நீக்க", "நீக்குங்க", "நீக்கிடு", "நீக்கவும்", "எடு", "எடுத்துடு", "எடுத்து விடு", "எடுத்துடுங்க", "அகற்று",
    "हटाओ", "हटा", "हटाएं", "हटा दो", "निकालो", "निकाल", "निकाल दो",
    "తీసివేయి", "తీసేయి", "తీసివేయండి", "తొలగించు", "తీసెయ్యి",
    "ತೆಗೆ", "ತೆಗೆಯಿರಿ", "ತೆಗೆದುಹಾಕು", "ತೆಗೆಯು",
    "നീക്കം", "നീക്കൂ", "നീക്കുക", "എടുക്കൂ", "ഒഴിവാക്കൂ", "ഒഴിവാക്കുക",
  ],
  CLEAR: [
    "க்ளியர்", "கிளியர்", "क्लियर", "క్లియర్", "ಕ್ಲಿಯರ್", "ക്ലിയർ",
    "clear", "empty", "kaali", "kaaliyaa", "khali", "khaali", "khali karo",
    "காலி", "காலியா", "காலிசெய்", "खाली", "ఖాళీ", "ಖಾಲಿ", "ശൂന്യമാക്കൂ", "ശൂന്യമാക്കുക",
  ],
  ALL: ["all", "everything", "entire", "whole", "ellam", "ellaam", "ellathayum", "sab", "saara", "anni", "ellavu", "ellaam", "எல்லாம்", "எல்லாத்தையும்", "அனைத்தும்", "सब", "सारा", "सभी", "అన్ని", "ಎಲ್ಲಾ", "ಎಲ್ಲವನ್ನೂ", "എല്ലാം"],
  OPEN: [
    "ஓபன்", "ओपन", "ఓపెన్", "ಓಪನ್", "ഓപ്പൺ",
    "open", "go", "goto", "visit", "navigate", "take me", "thira", "thirakku", "thirandhu", "thiranga", "thirakkavum", "kholo", "khol", "kholiye", "teruvu", "teravandi", "tereyiri", "tereyiri", "thurakku", "thurakkuka",
    "திற", "திறக்க", "திறங்க", "திறக்கவும்", "திறந்து", "खोलो", "खोल", "खोलें", "తెరువు", "తెరవండి", "తెరవు", "ತೆರೆ", "ತೆರೆಯಿರಿ", "ತೆರೆಯು", "തുറക്കൂ", "തുറക്കുക", "തുറക്ക്",
  ],
  SHOW: [
    "ஷோ", "शो", "షో", "ಶೋ", "ഷോ",
    "show", "display", "list", "view", "see", "kaattu", "kaatu", "kattu", "kaatunga", "kaaminga", "kaami", "paaru", "paarkka", "dikhao", "dikha", "dikhaiye", "dikhaye", "dekho", "dekhna", "chupinchu", "chupinchandi", "choopinchu", "toorisu", "torisu", "tori", "kaanikku", "kaanikkuka",
    "காட்டு", "காட்டுங்க", "காட்டுங்கள்", "காண்பி", "காண்பிக்க", "காமி", "காட்டவும்", "பாரு", "பார்க்க",
    "दिखाओ", "दिखा", "दिखाएं", "दिखाइए", "देखो", "చూపించు", "చూపించండి", "చూపు", "ತೋರಿಸು", "ತೋರಿಸಿ", "കാണിക്കൂ", "കാണിക്കുക", "കാണിക്ക്",
  ],
  SEARCH: [
    "சர்ச்", "सर्च", "సెర్చ్", "ಸರ್ಚ್", "സെർച്ച്",
    "search", "find", "look for", "looking for", "need", "want", "get me", "i want", "thedu", "thedi", "theduga", "thedunga", "thedanum", "venum", "vendum", "chahiye", "khojo", "dhundo", "dhoondo", "kavali", "kaavali", "vethuku", "veduku", "beku", "huduku", "thiraya", "vendathu", "veno",
    "தேடு", "தேடுங்க", "தேடி", "தேடுங்கள்", "வேணும்", "வேண்டும்", "வேனும்", "खोजो", "खोज", "ढूंढो", "ढूँढो", "ढूंढ", "चाहिए", "వెతుకు", "వెతకండి", "వెతుకు", "కావాలి", "ಹುಡುಕು", "ಹುಡುಕಿ", "ಬೇಕು", "തിരയൂ", "തിരയുക", "വേണം",
  ],
  CART: [
    "cart", "basket", "trolley", "carts", "kart", "kaart", "cartla", "cartku", "kaartu",
    "கார்ட்", "கார்டு", "கார்ட்டு", "கார்ட்டில்", "கார்ட்ல", "கார்டில்", "கூடை",
    "कार्ट", "टोकरी", "ट्रॉली", "కార్ట్", "కార్టు", "ಕಾರ್ಟ್", "ಕಾರ್ಟು", "കാർട്ട്", "കാർട്ടിൽ", "കാർട്ടു",
  ],
  WISHLIST: [
    "wishlist", "wish list", "wishlists", "favourites", "favorites", "favourite", "favorite", "fav", "wish",
    "விஷ்லிஸ்ட்", "விஷ் லிஸ்ட்", "விஷ்லிஸ்ட்டில்", "விருப்பப்பட்டியல்", "விருப்ப பட்டியல்", "விருப்பபட்டியல்", "விசலிஸ்ட்",
    "विशलिस्ट", "विश लिस्ट", "विशलिस्ट", "पसंदीदा", "వీష్లిస్ట్", "విష్లిస్ట్", "విష్ లిస్ట్", "వీష్ లిస్ట్", "ವಿಶ್ಲಿಸ್ಟ್", "ವಿಶ್ ಲಿಸ್ಟ್", "വിഷ്ലിസ്റ്റ്", "വിഷ് ലിസ്റ്റ്", "വിഷ്ലിസ്റ്റിൽ",
  ],
  CHECKOUT: [
    "checkout", "check out", "place order", "place the order", "proceed to pay", "pay now",
    "செக்அவுட்", "செக் அவுட்", "செக்கவுட்", "चेकआउट", "चेक आउट", "చెక్అవుట్", "చెక్ అవుట్", "ಚೆಕ್ಔಟ್", "ಚೆಕ್ ಔಟ್", "ചെക്ക്ഔട്ട്", "ചെക്ക് ഔട്ട്", "ചെക്കൗട്ട്",
  ],
  ORDER: [
    "order", "orders", "ordered", "track", "tracking", "history",
    "ஆர்டர்", "ஆடர்", "ஆர்டர்கள்", "ऑर्डर", "आर्डर", "ఆర్డర్", "ಆರ್ಡರ್", "ഓർഡർ", "ഓർഡറുകൾ",
  ],
  CANCEL: ["cancel", "ரத்து", "கேன்சல்", "रद्द", "कैंसिल", "రద్దు", "క్యాన్సిల్", "ರದ್ದು", "ക്യാൻസൽ", "ரத்துசெய்"],
  HOME: ["home", "homepage", "home page", "main page", "முகப்பு", "முகப்புப்பக்கம்", "होम", "హోమ్", "ಹೋಮ್", "ഹോം"],
  PROFILE: ["profile", "account", "my account", "ப்ரொஃபைல்", "ப்ரொபைல்", "புரொஃபைல்", "प्रोफाइल", "ప్రొఫైల్", "ಪ್ರೊಫೈಲ್", "പ്രൊഫൈൽ", "கணக்கு", "अकाउंट", "ఖాతా"],
  STOP: [
    "stop", "bye", "goodbye", "exit", "quit", "stop listening", "stop hands free", "turn off", "sleep", "nirutthu", "niruthu", "nirutthunga", "niruthunga", "nillu", "nillunga", "band karo", "band kar do", "ruko", "aapu", "nilpu", "nilisu", "nirthu", "nirthoo",
    "நிறுத்து", "நிறுத்துங்க", "நிறுத்துங்கள்", "நில்லு", "போதும்", "बंद करो", "बंद", "रुको", "रुक", "बाय", "ఆపు", "ఆపండి", "ఆపేయి", "ನಿಲ್ಲಿಸು", "ನಿಲ್ಲಿಸಿ", "നിർത്തൂ", "നിർത്തുക", "മതി",
  ],
  THIS: [
    "this", "this one", "it", "that one", "ithai", "idhai", "ithu", "idhu", "intha", "indha", "ye", "isko", "isse", "yeh", "idi", "idhi", "ee", "ithu", "ithine", "idannu", "idu",
    "that", "idhoda", "ithoda", "idhukku", "ithukku", "adhai", "athai", "andha", "antha",
    "இத", "இதோட", "இதுக்கு", "இதான்", "அந்த", "அதை", "அது",
    "இதை", "இது", "இந்த", "இதையும்", "इसे", "इसको", "यह", "ये", "ఇది", "ఇదిని", "ఈ", "ಇದನ್ನು", "ಇದು", "ಈ", "ഇത്", "ഇതിനെ", "ഈ",
  ],
  HELP: ["help", "assist", "what can you do", "udhavi", "உதவி", "मदद", "सहायता", "సహాయం", "ಸಹಾಯ", "സഹായം"],
  THANKS: ["thanks", "thank you", "thank", "thankyou", "nandri", "nanri", "dhanyavad", "shukriya", "dhanyavadalu", "nanni", "nandi", "நன்றி", "धन्यवाद", "शुक्रिया", "ధన్యవాదాలు", "ಧನ್ಯವಾದ", "ധನ್യವാദ്", "നന്ദി"],
  GREET: ["hello", "hi", "hey", "hii", "hiii", "vanakkam", "namaste", "namaskaram", "namaskara", "வணக்கம்", "नमस्ते", "नमस्कार", "నమస్కారం", "ನಮಸ್ಕಾರ", "നമസ്കാരം", "హలో", "ஹலோ", "हैलो", "हेलो"],
  OVER: ["above", "over", "more than", "minimum", "atleast", "at least", "mela", "mele", "upar", "oopar", "paina", "maelae", "மேல்", "மேலே", "ऊपर", "से ज्यादा", "से अधिक", "పైన", "ಮೇಲೆ", "മുകളിൽ"],
  UNDER: [
    "under", "below", "within", "less than", "upto", "up to", "maximum", "max", "budget", "around", "kila", "keezh", "keel", "kum", "kammiya", "kulla", "andar", "neeche", "lopu", "kinda", "olage", "thaazhe", "thazhe",
    "கீழ்", "கீழே", "குறைவாக", "குள்ள", "க்குள்", "குள்", "க்கு கீழ்", "கம்மியா", "से कम", "के अंदर", "के अन्दर", "के नीचे", "तक", "లోపు", "కింద", "తక్కువ", "ಕೆಳಗೆ", "ಒಳಗೆ", "ಕಡಿಮೆ", "താഴെ", "ഉള്ളിൽ", "കുറവ്",
  ],
  CHEAP: ["cheap", "cheapest", "lowest price", "low price", "affordable", "sasta", "sasta wala", "malivu", "மலிவான", "மலிவு", "விலை குறைவான", "सस्ता", "सस्ती", "చౌక", "ಅಗ್ಗದ", "വിലകുറഞ്ഞ"],
  BEST: ["best", "top rated", "top", "highest rated", "best rated", "popular", "sirandha", "சிறந்த", "बेस्ट", "सबसे अच्छा", "ఉత్తమ", "ಅತ್ತ್ಯುತ್ತಮ", "മികച്ച"],
  CUR: ["₹", "rs", "inr", "rupee", "rupees", "rupaye", "rupai", "ரூபாய்", "ரூபா", "रुपये", "रुपए", "रु", "రూపాయలు", "రూపాయి", "ರೂಪಾಯಿ", "രൂപ"],
  LAKH: ["lakh", "lakhs", "lac", "lacs", "லட்சம்", "லட்சத்துக்கு", "लाख", "లక్ష", "లక్షలు", "ಲಕ್ಷ", "ലക്ഷം"],
};

// Number words (quantities) in every language we support.
const NUMBER_WORDS = {
  2: ["two", "rendu", "rendhu", "randu", "இரண்டு", "ரெண்டு", "दो", "రెండు", "ಎರಡು", "രണ്ട്"],
  3: ["three", "moonu", "munu", "teen", "moodu", "mooru", "மூன்று", "மூணு", "तीन", "మూడు", "ಮೂರು", "മൂന്ന്"],
  4: ["four", "naalu", "nalu", "chaar", "char", "naalku", "நான்கு", "நாலு", "चार", "నాలుగు", "ನಾಲ್ಕು", "നാല്"],
  5: ["five", "anju", "ainthu", "paanch", "panch", "aidu", "ayidu", "ஐந்து", "அஞ்சு", "पाँच", "पांच", "ఐదు", "ಐದು", "അഞ്ച്"],
  6: ["six", "aaru", "chhe", "cheh", "aru", "ஆறு", "छह", "छः", "ఆరు", "ಆರು", "ആറ്"],
  7: ["seven", "yezhu", "ezhu", "saat", "elu", "ஏழு", "सात", "ఏడు", "ಏಳು", "ഏഴ്"],
  8: ["eight", "ettu", "aath", "enimidi", "எட்டு", "आठ", "ఎనిమిది", "ಎಂಟು", "എട്ട്"],
  9: ["nine", "onbadhu", "nau", "tommidi", "ombattu", "ஒன்பது", "नौ", "తొమ్మిది", "ಒಂಬತ್ತು", "ഒൻപത്"],
  10: ["ten", "paththu", "pathu", "das", "padi", "hattu", "பத்து", "दस", "పది", "ಹತ್ತು", "പത്ത്"],
};

const ORDINALS = {
  1: ["first", "1st", "mudhal", "mudhalavadhu", "mudhalaavathu", "pehla", "pehle", "modati", "modatidi", "modalu", "aadyathe", "முதல்", "முதலாவது", "முதல்ல", "पहला", "पहले", "पहली", "మొదటి", "మొదటిది", "ಮೊದಲ", "ಮೊದಲನೇ", "ആദ്യ", "ആദ്യത്തെ"],
  2: ["second", "2nd", "rendavadhu", "rendavathu", "dusra", "doosra", "dusre", "rendava", "rendo", "ereduva", "randamathe", "இரண்டாவது", "இரண்டாம்", "ரெண்டாவது", "दूसरा", "दूसरे", "दूसरी", "రెండవ", "రెండవది", "ಎರಡನೇ", "ಎರಡನೆಯ", "രണ്ടാമത്തെ", "രണ്ടാം"],
  3: ["third", "3rd", "moonravadhu", "moonravathu", "teesra", "teesre", "moodava", "moodo", "mooraneya", "moonnamathe", "மூன்றாவது", "மூணாவது", "மூன்றாம்", "तीसरा", "तीसरे", "तीसरी", "మూడవ", "మూడవది", "ಮೂರನೇ", "ಮೂರನೆಯ", "മൂന്നാമത്തെ", "മൂന്നാം"],
  4: ["fourth", "4th", "naalavadhu", "chautha", "chauthe", "nalugava", "naalaneya", "naalamathe", "நான்காவது", "நாலாவது", "चौथा", "चौथे", "చివరి నాలుగవ", "నాలుగవ", "ನಾಲ್ಕನೇ", "നാലാമത്തെ"],
  5: ["fifth", "5th", "anjavadhu", "paanchva", "paanchvan", "aidava", "aidaneya", "anchamathe", "ஐந்தாவது", "ஐந்தாம்", "पांचवां", "पाँचवा", "ఐదవ", "ಐದನೇ", "അഞ്ചാമത്തെ"],
};

// Words that carry no product meaning (English filler + Tanglish/Hinglish particles).
const STOPWORDS = new Set([
  "a", "an", "the", "of", "for", "to", "from", "in", "on", "at", "by", "my", "me", "mine", "i", "we", "you", "your", "us", "please", "pls", "plz", "kindly", "and", "or", "with", "is", "are", "was", "be", "do", "does", "did", "can", "could", "would", "will", "shall", "should", "now", "then", "also", "just", "some", "any", "one", "ones", "item", "items", "product", "products", "thing", "things", "model", "pieces", "piece", "pcs", "quantity", "qty", "nos", "no", "number", "units", "unit", "that", "these", "those", "there", "here", "into", "onto", "up", "out", "off", "it", "its", "what", "whats", "which", "how", "much", "many", "tell", "give", "gimme", "bring", "get", "want", "need", "like", "ok", "okay", "hey", "hmm", "um", "uh", "ah", "so", "very", "more", "less", "sir", "madam", "bro", "dude", "voiceshop", "assistant", "shop", "shopping", "store", "online", "new", "latest", "good", "nice", "best", "top", "x",
  // tanglish / hinglish / tenglish particles
  "pannu", "panni", "pannunga", "panunga", "pannidu", "pannidunga", "pannuga", "panna", "pannanum", "pannungo", "panu", "panra", "seiyyunga", "seiyyu", "seyyi", "seyyandi", "cheyyi", "cheyyandi", "cheyyu", "madi", "maadi", "madu", "maadu", "karo", "kar", "karna", "kijiye", "kijie", "do", "de", "dena", "dijiye", "la", "le", "ku", "kku", "ah", "aa", "ai", "ae", "oda", "ode", "um", "ooda", "enakku", "enaku", "yenakku", "naa", "naan", "nee", "neenga", "ippo", "ippodhu", "romba", "konjam", "oru", "oru", "ellam", "mera", "meri", "mujhe", "mujhko", "ko", "ka", "ki", "se", "mein", "me", "ne", "hai", "ho", "hain", "nakku", "naaku", "nanage", "nanna", "ninna", "ente", "enikku", "ayyo", "sollu", "solren", "sollunga", "sonna", "solli", "pls", "thaan", "than", "dhaan", "dha", "ada", "da", "di", "pa", "ma", "machan", "macha", "bhai", "anna", "akka",
  // v4 voice: question / filler words (price, status, "what", "where", "is") + colloquial Tamil particles
  "price", "prices", "cost", "costs", "rate", "where", "when", "whose", "status", "vilai", "evlo", "evvalavu", "enna", "yenna", "enga", "engey", "enge", "eppo", "eppadi",
  "irukku", "iruku", "irukka", "iruka", "irukkunga", "ennoda", "enoda", "en", "unga", "ungal", "ungaloda", "avanga", "nalla", "konjam", "thaan", "dhaan", "paaru", "paarunga",
  "பண்ணு", "பண்ணுங்க", "பண்ணுங்கள்", "பண்ணிடு", "பண்ணிடுங்க", "பண்ணி", "செய்", "செய்யுங்க", "செய்யுங்கள்", "என்ன", "எங்க", "எங்கே", "எங்கு", "இருக்கு", "இருக்கா", "இருக்கிறது",
  "என்னோட", "விலை", "எவ்வளவு", "எவ்ளோ", "எப்போ", "எப்படி", "ஆச்சு", "ஆயிடுச்சு", "கொஞ்சம்", "தான்", "தானே", "இப்போ", "உடனே", "ப்ளீஸ்", "பிளீஸ்", "தயவுசெய்து", "என்", "எனக்கு", "என்னுடைய", "ஒரு", "ஒன்று", "நான்", "மற்றும்", "प्लीज़", "प्लीज", "कृपया", "मेरे", "मेरी", "मेरा", "मुझे", "को", "में", "का", "की", "के", "एक", "और", "ప్లీజ్", "దయచేసి", "నాకు", "నా", "ఒక", "మరియు", "ಪ್ಲೀಸ್", "ದಯವಿಟ್ಟು", "ನನಗೆ", "ನನ್ನ", "ಒಂದು", "ಮತ್ತು", "പ്ലീസ്", "ദയവായി", "എനിക്ക്", "എന്റെ", "ഒരു", "ഒപ്പം", "ഉം", "ஐ", "ல", "இல்", "ல்",
]);

// ---------------------------------------------------------------------------
// 2. Product nouns in Indic scripts / Tanglish -> canonical English word.
//    (Everything else - brands, model names - is handled by catalogMatcher's phonetic matching.)
// ---------------------------------------------------------------------------
const NOUNS = {
  laptop: ["லேப்டாப்", "லேப்டாப", "लैपटॉप", "ల్యాప్టాప్", "ಲ್ಯಾಪ್ಟಾಪ್", "ലാപ്ടോപ്പ്", "ലാപ്ടോപ്", "laptob", "lappy", "labtop"],
  mobile: ["மொபைல்", "மொபைலை", "மொபைலு", "போன்", "போனு", "போனை", "फोन", "मोबाइल", "ఫోన్", "మొబైల్", "ಫೋನ್", "ಮೊಬೈಲ್", "ഫോൺ", "മൊബൈൽ", "phones", "mobiles", "cellphone", "fone", "ponu"],
  shoes: ["ஷூ", "ஷூஸ்", "காலணி", "செருப்பு", "जूते", "जूता", "షూస్", "బూట్లు", "ಶೂ", "ಶೂಸ್", "ഷൂ", "ഷൂസ്", "shoe", "footwear", "shoos"],
  watch: ["வாட்ச்", "கடிகாரம்", "घड़ी", "वॉच", "వాచ్", "గడియారం", "ವಾಚ್", "ಗಡಿಯಾರ", "വാച്ച്", "watches"],
  headphones: ["ஹெட்ஃபோன்", "ஹெட்போன்", "ஹெட்ஃபோன்ஸ்", "ஹெட்செட்", "हेडफोन", "హెడ్ఫోన్", "ಹೆಡ್ಫೋನ್", "ഹെഡ്ഫോൺ", "headphone", "earphones", "earphone", "headset"],
  earbuds: ["இயர்பட்ஸ்", "இயர்போன்", "इयरबड्स", "ఇయర్బడ్స్", "ಇಯರ್ಬಡ್ಸ್", "ഇയർബഡ്സ്", "earbud"],
  tv: ["டிவி", "டிவியை", "टीवी", "టీవీ", "ಟಿವಿ", "ടിവി", "television", "televisions", "tvs"],
  speaker: ["ஸ்பீக்கர்", "स्पीकर", "స్పీకర్", "ಸ್ಪೀಕರ್", "സ്പീക്കർ", "speakers"],
  shirt: ["சட்டை", "ஷர்ட்", "शर्ट", "చొక్కా", "షర్ట్", "ಶರ್ಟ್", "ഷർട്ട്", "shirts"],
  dress: ["டிரெஸ்", "ட்ரெஸ்", "ड्रेस", "డ్రెస్", "ಡ್ರೆಸ್", "ഡ്രസ്", "dresses", "frock"],
  refrigerator: ["ஃபிரிட்ஜ்", "பிரிட்ஜ்", "ஃப்ரிட்ஜ்", "फ्रिज", "ఫ్రిజ్", "ಫ್ರಿಡ್ಜ್", "ഫ്രിഡ്ജ്", "fridge", "fridges"],
  camera: ["கேமரா", "कैमरा", "కెమెరా", "ಕ್ಯಾಮೆರಾ", "ക്യാമറ", "cameras"],
  tablet: ["டேப்லெட்", "டேப்ளட்", "टैबलेट", "టాబ్లెట్", "ಟ್ಯಾಬ್ಲೆಟ್", "ടാബ്ലെറ്റ്", "tablets"],
  jeans: ["ஜீன்ஸ்", "जीन्स", "జీన్స్", "ಜೀನ್ಸ್", "ജീൻസ്"],
  washing: ["வாஷிங்", "वाशिंग", "వాషింగ్", "ವಾಷಿಂಗ್", "വാഷിംഗ്"],
  book: ["புத்தகம்", "புக்", "किताब", "बुक", "పుస్తకం", "ಪುಸ್ತಕ", "പുസ്തകം", "books"],
  // --- added for the Grocery / Toys / Sports / Computers / Mobile Accessories catalogue (Tamil script -> canonical English tag)
  tea: ["தேநீர்", "டீ", "டீத்தூள்", "தேயிலை", "चाय"],
  coffee: ["காபி", "காஃபி", "कॉफी"],
  rice: ["அரிசி", "चावल"],
  milk: ["பால்", "दूध"],
  oil: ["எண்ணெய்", "எண்ணை", "तेल"],
  sugar: ["சர்க்கரை", "சீனி", "चीनी"],
  salt: ["உப்பு", "नमक"],
  dal: ["பருப்பு", "दाल"],
  honey: ["தேன்", "शहद"],
  butter: ["வெண்ணெய்", "मक्खन"],
  toy: ["பொம்மை", "பொம்மைகள்", "खिलौना"],
  ball: ["பந்து", "गेंद"],
  football: ["கால்பந்து", "फुटबॉल"],
  cricket: ["கிரிக்கெட்", "क्रिकेट"],
  cycle: ["சைக்கிள்", "साइकिल"],
  charger: ["சார்ஜர்", "चार्जर"],
  keyboard: ["கீபோர்டு", "கீபோர்ட்", "कीबोर्ड"],
  mouse: ["மவுஸ்", "माउस"],
  case: ["கவர்", "கேஸ்", "कवर"],
  shampoo: ["ஷாம்பு", "शैम्पू"],
  soap: ["சோப்பு", "साबुन"],
  bag: ["பை", "பேக்", "बैग"],
  bottle: ["பாட்டில்", "बोतल"],
  cooker: ["குக்கர்", "कुकर"],
  router: ["ரவுட்டர்", "ரூட்டர்", "राउटर"],
  monitor: ["மானிட்டர்", "मॉनिटर"],
  printer: ["பிரிண்டர்", "प्रिंटर"],
};

// ---------------------------------------------------------------------------
// 3. Build lookup tables (single words + multi-word phrases)
// ---------------------------------------------------------------------------
const WORD_ACT = new Map(); // single word -> act
const WORD_TERM = new Map(); // single word -> canonical english noun
const WORD_NUM = new Map();
const WORD_ORD = new Map();
const PHRASES = []; // [{ text, marker }]
const INDIC_PREFIXES = []; // [{ key, kind, value }]  for inflected Indic words

const register = (word, kind, value) => {
  const w = strip(word).toLowerCase();
  const target = { act: WORD_ACT, term: WORD_TERM, num: WORD_NUM, ord: WORD_ORD }[kind];
  if (/\s/.test(w)) {
    PHRASES.push({ text: w, kind, value });
  } else {
    if (!target.has(w)) target.set(w, value);
    if (hasIndic(w) && w.length >= 3) INDIC_PREFIXES.push({ key: w, kind, value });
  }
};

for (const [act, words] of Object.entries(ACTS)) words.forEach((w) => register(w, "act", act));
for (const [noun, words] of Object.entries(NOUNS)) words.forEach((w) => register(w, "term", noun));
for (const [n, words] of Object.entries(NUMBER_WORDS)) words.forEach((w) => register(w, "num", Number(n)));
for (const [n, words] of Object.entries(ORDINALS)) words.forEach((w) => register(w, "ord", Number(n)));
PHRASES.sort((a, b) => b.text.length - a.text.length);
INDIC_PREFIXES.sort((a, b) => b.key.length - a.key.length);

const phraseMarker = (kind, value) => `zz${kind}${String(value).replace(/\W/g, "")}zz`;

// ---------------------------------------------------------------------------
// 4. Reply templates (always answers in the shopper's language)
// ---------------------------------------------------------------------------
const T = {
  "en-US": {
    greeting: "Hello! I'm your VoiceShop assistant. You can search products, add items to your cart or wishlist, open your cart, or track orders.",
    thanks: "You're welcome! Happy shopping.",
    searchFound: (n, subject) => `I found ${n} ${n === 1 ? "result" : "results"} for ${subject}.`,
    searchNone: (subject) => `Sorry, I couldn't find anything for ${subject}. Try a different word.`,
    addedToCart: (name, qty) => `Done! ${qty > 1 ? `${qty} × ` : ""}${name} added to your cart.`,
    addedToWishlist: (name) => `Done! ${name} added to your wishlist.`,
    alreadyWishlist: (name) => `${name} is already in your wishlist.`,
    removedFromCart: (name) => `Removed ${name} from your cart.`,
    removedFromWishlist: (name) => `Removed ${name} from your wishlist.`,
    notInCart: "I couldn't find that item in your cart.",
    notInWishlist: "I couldn't find that item in your wishlist.",
    notFoundProduct: "I couldn't find that product. Could you say the name again?",
    askProduct: "Which product do you mean? Say the product name, for example iPhone 15.",
    outOfStock: (name) => `Sorry, ${name} is out of stock right now.`,
    cartCleared: "Your cart is now empty.",
    wishlistCleared: "Your wishlist is now empty.",
    openCart: "Opening your cart.",
    openWishlist: "Opening your wishlist.",
    checkout: "Taking you to checkout.",
    buyNow: (name) => `${name} added. Taking you to checkout.`,
    myOrders: "Here are your orders.",
    cancelHelp: "Open the order from your orders page and tap Cancel Order.",
    goHome: "Going to the home page.",
    openProfile: "Opening your profile.",
    loginRequired: "Please log in first, then I can do that for you.",
    stopListening: "Okay, hands-free mode is off. Tap the mic whenever you need me.",
    fallback: "Sorry, I didn't get that. Try: search laptops under 60000, add iPhone 15 to cart, add to wishlist, or open my cart.",
  },
  "ta-IN": {
    greeting: "வணக்கம்! நான் உங்கள் VoiceShop உதவியாளர். பொருட்களைத் தேடலாம், கார்ட் அல்லது விஷ்லிஸ்ட்டில் சேர்க்கலாம், ஆர்டர்களைப் பார்க்கலாம்.",
    thanks: "மகிழ்ச்சி! ஷாப்பிங்கை தொடருங்கள்.",
    searchFound: (n, subject) => `${subject} க்கு ${n} முடிவுகள் கிடைத்தன.`,
    searchNone: (subject) => `மன்னிக்கவும், ${subject} க்கு எதுவும் கிடைக்கவில்லை.`,
    addedToCart: (name, qty) => `சரி! ${qty > 1 ? `${qty} × ` : ""}${name} உங்கள் கார்ட்டில் சேர்க்கப்பட்டது.`,
    addedToWishlist: (name) => `சரி! ${name} உங்கள் விஷ்லிஸ்ட்டில் சேர்க்கப்பட்டது.`,
    alreadyWishlist: (name) => `${name} ஏற்கனவே உங்கள் விஷ்லிஸ்ட்டில் உள்ளது.`,
    removedFromCart: (name) => `${name} கார்ட்டில் இருந்து நீக்கப்பட்டது.`,
    removedFromWishlist: (name) => `${name} விஷ்லிஸ்ட்டில் இருந்து நீக்கப்பட்டது.`,
    notInCart: "அந்த பொருள் உங்கள் கார்ட்டில் இல்லை.",
    notInWishlist: "அந்த பொருள் உங்கள் விஷ்லிஸ்ட்டில் இல்லை.",
    notFoundProduct: "அந்த பொருளை கண்டுபிடிக்க முடியவில்லை. பெயரை மீண்டும் சொல்லுங்கள்.",
    askProduct: "எந்த பொருள்? பொருளின் பெயரைச் சொல்லுங்கள், உதாரணமாக ஐபோன் 15.",
    outOfStock: (name) => `மன்னிக்கவும், ${name} இப்போது ஸ்டாக்கில் இல்லை.`,
    cartCleared: "உங்கள் கார்ட் காலி செய்யப்பட்டது.",
    wishlistCleared: "உங்கள் விஷ்லிஸ்ட் காலி செய்யப்பட்டது.",
    openCart: "உங்கள் கார்ட்டை திறக்கிறேன்.",
    openWishlist: "உங்கள் விஷ்லிஸ்ட்டை திறக்கிறேன்.",
    checkout: "செக்அவுட் பக்கத்திற்கு அழைத்துச் செல்கிறேன்.",
    buyNow: (name) => `${name} சேர்க்கப்பட்டது. செக்அவுட்டுக்கு அழைத்துச் செல்கிறேன்.`,
    myOrders: "இதோ உங்கள் ஆர்டர்கள்.",
    cancelHelp: "ஆர்டர்கள் பக்கத்தில் ஆர்டரைத் திறந்து கேன்சல் பட்டனை அழுத்துங்கள்.",
    goHome: "முகப்பு பக்கத்திற்கு செல்கிறேன்.",
    openProfile: "உங்கள் ப்ரொஃபைலை திறக்கிறேன்.",
    loginRequired: "முதலில் லாகின் செய்யுங்கள், அப்புறம் நான் செய்கிறேன்.",
    stopListening: "சரி, ஹேண்ட்ஸ்-ஃப்ரீ மோட் நிறுத்தப்பட்டது.",
    fallback: "மன்னிக்கவும், புரியவில்லை. உதாரணம்: ஐபோன் 15 கார்ட்டில் சேர், விஷ்லிஸ்ட்டில் சேர், கார்ட் திற.",
  },
  "hi-IN": {
    greeting: "नमस्ते! मैं आपका VoiceShop सहायक हूँ। आप प्रोडक्ट खोज सकते हैं, कार्ट या विशलिस्ट में जोड़ सकते हैं और ऑर्डर देख सकते हैं।",
    thanks: "स्वागत है! खरीदारी जारी रखें।",
    searchFound: (n, subject) => `${subject} के लिए ${n} परिणाम मिले।`,
    searchNone: (subject) => `माफ़ कीजिए, ${subject} के लिए कुछ नहीं मिला।`,
    addedToCart: (name, qty) => `हो गया! ${qty > 1 ? `${qty} × ` : ""}${name} आपके कार्ट में जोड़ दिया गया।`,
    addedToWishlist: (name) => `हो गया! ${name} आपकी विशलिस्ट में जोड़ दिया गया।`,
    alreadyWishlist: (name) => `${name} पहले से आपकी विशलिस्ट में है।`,
    removedFromCart: (name) => `${name} कार्ट से हटा दिया गया।`,
    removedFromWishlist: (name) => `${name} विशलिस्ट से हटा दिया गया।`,
    notInCart: "वह आइटम आपके कार्ट में नहीं मिला।",
    notInWishlist: "वह आइटम आपकी विशलिस्ट में नहीं मिला।",
    notFoundProduct: "वह उत्पाद नहीं मिला। कृपया नाम दोबारा बताएं।",
    askProduct: "कौन सा प्रोडक्ट? प्रोडक्ट का नाम बताइए, जैसे आईफोन 15।",
    outOfStock: (name) => `माफ़ कीजिए, ${name} अभी स्टॉक में नहीं है।`,
    cartCleared: "आपका कार्ट खाली कर दिया गया।",
    wishlistCleared: "आपकी विशलिस्ट खाली कर दी गई।",
    openCart: "आपका कार्ट खोल रहा हूँ।",
    openWishlist: "आपकी विशलिस्ट खोल रहा हूँ।",
    checkout: "चेकआउट पर ले जा रहा हूँ।",
    buyNow: (name) => `${name} जोड़ दिया। चेकआउट पर ले जा रहा हूँ।`,
    myOrders: "ये रहे आपके ऑर्डर।",
    cancelHelp: "ऑर्डर पेज पर ऑर्डर खोलकर कैंसिल बटन दबाएं।",
    goHome: "होम पेज पर जा रहा हूँ।",
    openProfile: "आपकी प्रोफाइल खोल रहा हूँ।",
    loginRequired: "कृपया पहले लॉगिन करें, फिर मैं यह कर दूँगा।",
    stopListening: "ठीक है, हैंड्स-फ्री मोड बंद हो गया।",
    fallback: "माफ़ कीजिए, समझ नहीं आया। जैसे: आईफोन 15 कार्ट में जोड़ो, विशलिस्ट में जोड़ो, कार्ट खोलो।",
  },
  "te-IN": {
    greeting: "నమస్కారం! నేను మీ VoiceShop సహాయకుడిని. ఉత్పత్తులను వెతకవచ్చు, కార్ట్ లేదా విష్‌లిస్ట్‌లో చేర్చవచ్చు, ఆర్డర్లు చూడవచ్చు.",
    thanks: "స్వాగతం! షాపింగ్ కొనసాగించండి.",
    searchFound: (n, subject) => `${subject} కోసం ${n} ఫలితాలు దొరికాయి.`,
    searchNone: (subject) => `క్షమించండి, ${subject} కోసం ఏమీ దొరకలేదు.`,
    addedToCart: (name, qty) => `అయింది! ${qty > 1 ? `${qty} × ` : ""}${name} మీ కార్ట్‌కి జోడించబడింది.`,
    addedToWishlist: (name) => `అయింది! ${name} మీ విష్‌లిస్ట్‌కి జోడించబడింది.`,
    alreadyWishlist: (name) => `${name} ఇప్పటికే మీ విష్‌లిస్ట్‌లో ఉంది.`,
    removedFromCart: (name) => `${name} కార్ట్ నుండి తీసివేయబడింది.`,
    removedFromWishlist: (name) => `${name} విష్‌లిస్ట్ నుండి తీసివేయబడింది.`,
    notInCart: "ఆ వస్తువు మీ కార్ట్‌లో కనబడలేదు.",
    notInWishlist: "ఆ వస్తువు మీ విష్‌లిస్ట్‌లో కనబడలేదు.",
    notFoundProduct: "ఆ ఉత్పత్తి కనబడలేదు. దయచేసి పేరు మళ్ళీ చెప్పండి.",
    askProduct: "ఏ ఉత్పత్తి? ఉత్పత్తి పేరు చెప్పండి, ఉదాహరణకు ఐఫోన్ 15.",
    outOfStock: (name) => `క్షమించండి, ${name} ప్రస్తుతం స్టాక్‌లో లేదు.`,
    cartCleared: "మీ కార్ట్ ఖాళీ చేయబడింది.",
    wishlistCleared: "మీ విష్‌లిస్ట్ ఖాళీ చేయబడింది.",
    openCart: "మీ కార్ట్‌ని తెరుస్తున్నాను.",
    openWishlist: "మీ విష్‌లిస్ట్‌ని తెరుస్తున్నాను.",
    checkout: "చెక్‌అవుట్‌కి తీసుకువెళ్తున్నాను.",
    buyNow: (name) => `${name} జోడించాను. చెక్‌అవుట్‌కి తీసుకువెళ్తున్నాను.`,
    myOrders: "ఇవి మీ ఆర్డర్లు.",
    cancelHelp: "ఆర్డర్ల పేజీలో ఆర్డర్ తెరిచి క్యాన్సిల్ నొక్కండి.",
    goHome: "హోమ్ పేజీకి వెళ్తున్నాను.",
    openProfile: "మీ ప్రొఫైల్ తెరుస్తున్నాను.",
    loginRequired: "దయచేసి ముందు లాగిన్ అవ్వండి, తర్వాత నేను చేస్తాను.",
    stopListening: "సరే, హ్యాండ్స్-ఫ్రీ మోడ్ ఆపివేయబడింది.",
    fallback: "క్షమించండి, అర్థం కాలేదు. ఉదాహరణ: ఐఫోన్ 15 కార్ట్‌లో చేర్చు, విష్‌లిస్ట్‌లో చేర్చు, కార్ట్ తెరువు.",
  },
  "ml-IN": {
    greeting: "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ VoiceShop അസിസ്റ്റന്റ് ആണ്. ഉൽപ്പന്നങ്ങൾ തിരയാം, കാർട്ടിലോ വിഷ്‌ലിസ്റ്റിലോ ചേർക്കാം, ഓർഡറുകൾ കാണാം.",
    thanks: "സ്വാഗതം! ഷോപ്പിംഗ് തുടരൂ.",
    searchFound: (n, subject) => `${subject} ന് ${n} ഫലങ്ങൾ കണ്ടെത്തി.`,
    searchNone: (subject) => `ക്ഷമിക്കണം, ${subject} ന് ഒന്നും കണ്ടെത്തിയില്ല.`,
    addedToCart: (name, qty) => `ശരി! ${qty > 1 ? `${qty} × ` : ""}${name} നിങ്ങളുടെ കാർട്ടിൽ ചേർത്തു.`,
    addedToWishlist: (name) => `ശരി! ${name} നിങ്ങളുടെ വിഷ്‌ലിസ്റ്റിൽ ചേർത്തു.`,
    alreadyWishlist: (name) => `${name} ഇതിനകം നിങ്ങളുടെ വിഷ്‌ലിസ്റ്റിലുണ്ട്.`,
    removedFromCart: (name) => `${name} കാർട്ടിൽ നിന്ന് നീക്കം ചെയ്തു.`,
    removedFromWishlist: (name) => `${name} വിഷ്‌ലിസ്റ്റിൽ നിന്ന് നീക്കം ചെയ്തു.`,
    notInCart: "ആ ഇനം നിങ്ങളുടെ കാർട്ടിൽ കണ്ടെത്താനായില്ല.",
    notInWishlist: "ആ ഇനം നിങ്ങളുടെ വിഷ്‌ലിസ്റ്റിൽ കണ്ടെത്താനായില്ല.",
    notFoundProduct: "ആ ഉൽപ്പന്നം കണ്ടെത്താനായില്ല. പേര് വീണ്ടും പറയൂ.",
    askProduct: "ഏത് ഉൽപ്പന്നം? പേര് പറയൂ, ഉദാഹരണത്തിന് ഐഫോൺ 15.",
    outOfStock: (name) => `ക്ഷമിക്കണം, ${name} ഇപ്പോൾ സ്റ്റോക്കില്ല.`,
    cartCleared: "നിങ്ങളുടെ കാർട്ട് ഒഴിവാക്കി.",
    wishlistCleared: "നിങ്ങളുടെ വിഷ്‌ലിസ്റ്റ് ഒഴിവാക്കി.",
    openCart: "നിങ്ങളുടെ കാർട്ട് തുറക്കുന്നു.",
    openWishlist: "നിങ്ങളുടെ വിഷ്‌ലിസ്റ്റ് തുറക്കുന്നു.",
    checkout: "ചെക്ക്ഔട്ടിലേക്ക് കൊണ്ടുപോകുന്നു.",
    buyNow: (name) => `${name} ചേർത്തു. ചെക്ക്ഔട്ടിലേക്ക് കൊണ്ടുപോകുന്നു.`,
    myOrders: "ഇതാ നിങ്ങളുടെ ഓർഡറുകൾ.",
    cancelHelp: "ഓർഡർ പേജിൽ ഓർഡർ തുറന്ന് ക്യാൻസൽ അമർത്തൂ.",
    goHome: "ഹോം പേജിലേക്ക് പോകുന്നു.",
    openProfile: "നിങ്ങളുടെ പ്രൊഫൈൽ തുറക്കുന്നു.",
    loginRequired: "ദയവായി ആദ്യം ലോഗിൻ ചെയ്യൂ, എന്നിട്ട് ഞാൻ ചെയ്യാം.",
    stopListening: "ശരി, ഹാൻഡ്സ്-ഫ്രീ മോഡ് നിർത്തി.",
    fallback: "ക്ഷമിക്കണം, മനസ്സിലായില്ല. ഉദാഹരണം: ഐഫോൺ 15 കാർട്ടിൽ ചേർക്കൂ, വിഷ്‌ലിസ്റ്റിൽ ചേർക്കൂ, കാർട്ട് തുറക്കൂ.",
  },
  "kn-IN": {
    greeting: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ VoiceShop ಸಹಾಯಕ. ಉತ್ಪನ್ನಗಳನ್ನು ಹುಡುಕಬಹುದು, ಕಾರ್ಟ್ ಅಥವಾ ವಿಶ್‌ಲಿಸ್ಟ್‌ಗೆ ಸೇರಿಸಬಹುದು, ಆರ್ಡರ್‌ಗಳನ್ನು ನೋಡಬಹುದು.",
    thanks: "ಸ್ವಾಗತ! ಶಾಪಿಂಗ್ ಮುಂದುವರಿಸಿ.",
    searchFound: (n, subject) => `${subject} ಗಾಗಿ ${n} ಫಲಿತಾಂಶಗಳು ಸಿಕ್ಕಿವೆ.`,
    searchNone: (subject) => `ಕ್ಷಮಿಸಿ, ${subject} ಗಾಗಿ ಏನೂ ಸಿಗಲಿಲ್ಲ.`,
    addedToCart: (name, qty) => `ಆಯಿತು! ${qty > 1 ? `${qty} × ` : ""}${name} ನಿಮ್ಮ ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಲಾಗಿದೆ.`,
    addedToWishlist: (name) => `ಆಯಿತು! ${name} ನಿಮ್ಮ ವಿಶ್‌ಲಿಸ್ಟ್‌ಗೆ ಸೇರಿಸಲಾಗಿದೆ.`,
    alreadyWishlist: (name) => `${name} ಈಗಾಗಲೇ ನಿಮ್ಮ ವಿಶ್‌ಲಿಸ್ಟ್‌ನಲ್ಲಿದೆ.`,
    removedFromCart: (name) => `${name} ಕಾರ್ಟ್‌ನಿಂದ ತೆಗೆದುಹಾಕಲಾಗಿದೆ.`,
    removedFromWishlist: (name) => `${name} ವಿಶ್‌ಲಿಸ್ಟ್‌ನಿಂದ ತೆಗೆದುಹಾಕಲಾಗಿದೆ.`,
    notInCart: "ಆ ವಸ್ತು ನಿಮ್ಮ ಕಾರ್ಟ್‌ನಲ್ಲಿ ಸಿಗಲಿಲ್ಲ.",
    notInWishlist: "ಆ ವಸ್ತು ನಿಮ್ಮ ವಿಶ್‌ಲಿಸ್ಟ್‌ನಲ್ಲಿ ಸಿಗಲಿಲ್ಲ.",
    notFoundProduct: "ಆ ಉತ್ಪನ್ನ ಸಿಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಹೆಸರನ್ನು ಮತ್ತೆ ಹೇಳಿ.",
    askProduct: "ಯಾವ ಉತ್ಪನ್ನ? ಹೆಸರು ಹೇಳಿ, ಉದಾಹರಣೆಗೆ ಐಫೋನ್ 15.",
    outOfStock: (name) => `ಕ್ಷಮಿಸಿ, ${name} ಈಗ ಸ್ಟಾಕ್‌ನಲ್ಲಿಲ್ಲ.`,
    cartCleared: "ನಿಮ್ಮ ಕಾರ್ಟ್ ಖಾಲಿ ಮಾಡಲಾಗಿದೆ.",
    wishlistCleared: "ನಿಮ್ಮ ವಿಶ್‌ಲಿಸ್ಟ್ ಖಾಲಿ ಮಾಡಲಾಗಿದೆ.",
    openCart: "ನಿಮ್ಮ ಕಾರ್ಟ್ ತೆರೆಯುತ್ತಿದ್ದೇನೆ.",
    openWishlist: "ನಿಮ್ಮ ವಿಶ್‌ಲಿಸ್ಟ್ ತೆರೆಯುತ್ತಿದ್ದೇನೆ.",
    checkout: "ಚೆಕ್‌ಔಟ್‌ಗೆ ಕರೆದೊಯ್ಯುತ್ತಿದ್ದೇನೆ.",
    buyNow: (name) => `${name} ಸೇರಿಸಿದೆ. ಚೆಕ್‌ಔಟ್‌ಗೆ ಕರೆದೊಯ್ಯುತ್ತಿದ್ದೇನೆ.`,
    myOrders: "ಇಲ್ಲಿವೆ ನಿಮ್ಮ ಆರ್ಡರ್‌ಗಳು.",
    cancelHelp: "ಆರ್ಡರ್ ಪುಟದಲ್ಲಿ ಆರ್ಡರ್ ತೆರೆದು ಕ್ಯಾನ್ಸಲ್ ಒತ್ತಿ.",
    goHome: "ಹೋಮ್ ಪುಟಕ್ಕೆ ಹೋಗುತ್ತಿದ್ದೇನೆ.",
    openProfile: "ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ತೆರೆಯುತ್ತಿದ್ದೇನೆ.",
    loginRequired: "ದಯವಿಟ್ಟು ಮೊದಲು ಲಾಗಿನ್ ಮಾಡಿ, ನಂತರ ನಾನು ಮಾಡುತ್ತೇನೆ.",
    stopListening: "ಸರಿ, ಹ್ಯಾಂಡ್ಸ್-ಫ್ರೀ ಮೋಡ್ ನಿಲ್ಲಿಸಲಾಗಿದೆ.",
    fallback: "ಕ್ಷಮಿಸಿ, ಅರ್ಥವಾಗಲಿಲ್ಲ. ಉದಾಹರಣೆ: ಐಫೋನ್ 15 ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸು, ವಿಶ್‌ಲಿಸ್ಟ್‌ಗೆ ಸೇರಿಸು, ಕಾರ್ಟ್ ತೆರೆ.",
  },
};

/** en-IN etc. share the English templates. */
export const baseLang = (lang) => (lang && T[lang] ? lang : lang && lang.startsWith("en") ? "en-US" : T[lang] ? lang : "en-US");

export const translate = (lang, key, ...args) => {
  const table = T[baseLang(lang)] || T["en-US"];
  const entry = table[key] ?? T["en-US"][key];
  return typeof entry === "function" ? entry(...args) : entry;
};

/** Language to REPLY in: the script the shopper used wins; otherwise their selected language. */
export const resolveReplyLang = (message, selected = "en-US") => detectScriptLang(strip(message)) || baseLang(selected);

// ---------------------------------------------------------------------------
// 5. FAQ (answered in the shopper's language)
// ---------------------------------------------------------------------------
const FAQ = [
  {
    keywords: ["delivery", "shipping", "deliver", "டெலிவரி", "डिलीवरी", "డెలివరీ", "ಡೆಲಿವರಿ", "ഡെലിവറി"],
    answers: {
      "en-US": "Standard delivery takes 3 to 5 days and is free above ₹999. Express delivery takes 1 to 2 days and costs ₹149.",
      "ta-IN": "வழக்கமான டெலிவரி 3 முதல் 5 நாட்களில் வரும், ₹999க்கு மேல் இலவசம். எக்ஸ்பிரஸ் டெலிவரி 1 முதல் 2 நாட்கள், ₹149.",
      "hi-IN": "सामान्य डिलीवरी 3 से 5 दिनों में होती है, ₹999 से ऊपर मुफ़्त है। एक्सप्रेस डिलीवरी 1 से 2 दिन में, ₹149।",
      "te-IN": "సాధారణ డెలివరీ 3 నుండి 5 రోజుల్లో, ₹999 పైన ఉచితం. ఎక్స్‌ప్రెస్ డెలివరీ 1 నుండి 2 రోజులు, ₹149.",
      "ml-IN": "സാധാരണ ഡെലിവറി 3 മുതൽ 5 ദിവസം, ₹999 ന് മുകളിൽ സൗജന്യം. എക്സ്പ്രസ് ഡെലിവറി 1 മുതൽ 2 ദിവസം, ₹149.",
      "kn-IN": "ಸಾಮಾನ್ಯ ಡೆಲಿವರಿ 3 ರಿಂದ 5 ದಿನ, ₹999 ಮೇಲೆ ಉಚಿತ. ಎಕ್ಸ್‌ಪ್ರೆಸ್ ಡೆಲಿವರಿ 1 ರಿಂದ 2 ದಿನ, ₹149.",
    },
  },
  {
    keywords: ["return", "refund", "exchange", "ரிடர்ன்", "ரீஃபண்ட்", "रिटर्न", "रिफंड", "రిటర్న్", "రీఫండ్", "ರಿಟರ್ನ್", "ರಿಫಂಡ್", "റിട്ടേൺ", "റീഫണ്ട്"],
    answers: {
      "en-US": "Orders can be cancelled before they ship from the Order Details page. Refunds for prepaid orders are processed automatically.",
      "ta-IN": "ஆர்டர் அனுப்பப்படுவதற்கு முன் ஆர்டர் விவரங்கள் பக்கத்தில் ரத்து செய்யலாம். முன்பணம் செலுத்திய ஆர்டர்களுக்கு பணம் தானாகத் திரும்பும்.",
      "hi-IN": "शिप होने से पहले ऑर्डर डिटेल्स पेज से ऑर्डर रद्द किया जा सकता है। प्रीपेड ऑर्डर का रिफंड अपने आप हो जाता है।",
      "te-IN": "షిప్ కావడానికి ముందు ఆర్డర్ వివరాల పేజీ నుండి ఆర్డర్‌ను రద్దు చేయవచ్చు. ప్రీపెయిడ్ ఆర్డర్లకు రీఫండ్ ఆటోమేటిక్‌గా వస్తుంది.",
      "ml-IN": "ഷിപ്പ് ചെയ്യുന്നതിന് മുമ്പ് ഓർഡർ വിശദാംശ പേജിൽ നിന്ന് റദ്ദാക്കാം. പ്രീപെയ്ഡ് ഓർഡറുകൾക്ക് റീഫണ്ട് സ്വയം ലഭിക്കും.",
      "kn-IN": "ಶಿಪ್ ಆಗುವ ಮೊದಲು ಆರ್ಡರ್ ವಿವರಗಳ ಪುಟದಿಂದ ರದ್ದುಗೊಳಿಸಬಹುದು. ಪ್ರೀಪೇಡ್ ಆರ್ಡರ್‌ಗಳಿಗೆ ರಿಫಂಡ್ ಸ್ವಯಂಚಾಲಿತ.",
    },
  },
  {
    keywords: ["payment", "cod", "upi", "pay", "பேமெண்ட்", "பணம்", "भुगतान", "पेमेंट", "చెల్లింపు", "పేమెంట్", "ಪಾವತಿ", "ಪೇಮೆಂಟ್", "പേയ്മെന്റ്", "പണം"],
    answers: {
      "en-US": "We accept Cash on Delivery, UPI, cards and other online payment methods.",
      "ta-IN": "Cash on Delivery, UPI, கார்டு மற்றும் ஆன்லைன் பேமெண்ட் முறைகள் ஏற்கப்படுகின்றன.",
      "hi-IN": "हम Cash on Delivery, UPI, कार्ड और अन्य ऑनलाइन भुगतान स्वीकार करते हैं।",
      "te-IN": "మేము Cash on Delivery, UPI, కార్డ్ మరియు ఇతర ఆన్‌లైన్ చెల్లింపులను అంగీకరిస్తాము.",
      "ml-IN": "ഞങ്ങൾ Cash on Delivery, UPI, കാർഡ്, മറ്റ് ഓൺലൈൻ പേയ്‌മെന്റുകൾ സ്വീകരിക്കുന്നു.",
      "kn-IN": "ನಾವು Cash on Delivery, UPI, ಕಾರ್ಡ್ ಮತ್ತು ಇತರ ಆನ್‌ಲೈನ್ ಪಾವತಿಗಳನ್ನು ಸ್ವೀಕರಿಸುತ್ತೇವೆ.",
    },
  },
  {
    keywords: ["coupon", "promo", "offer", "discount code", "குபன்", "கூப்பன்", "ஆஃபர்", "कूपन", "ऑफर", "కూపన్", "ఆఫర్", "ಕೂಪನ್", "ಆಫರ್", "കൂപ്പൺ", "ഓഫർ"],
    answers: {
      "en-US": "Use coupon code WELCOME10 at checkout for 10% off your order!",
      "ta-IN": "செக்அவுட்டில் WELCOME10 கூப்பன் கோடை பயன்படுத்தி 10% தள்ளுபடி பெறுங்கள்!",
      "hi-IN": "चेकआउट पर WELCOME10 कूपन कोड डालकर 10% छूट पाएं!",
      "te-IN": "చెక్‌అవుట్‌లో WELCOME10 కూపన్ కోడ్ వాడి 10% తగ్గింపు పొందండి!",
      "ml-IN": "ചെക്ക്ഔട്ടിൽ WELCOME10 കൂപ്പൺ കോഡ് ഉപയോഗിച്ച് 10% കിഴിവ് നേടൂ!",
      "kn-IN": "ಚೆಕ್‌ಔಟ್‌ನಲ್ಲಿ WELCOME10 ಕೂಪನ್ ಕೋಡ್ ಬಳಸಿ 10% ರಿಯಾಯಿತಿ ಪಡೆಯಿರಿ!",
    },
  },
];

const matchFaq = (rawText, lang) => {
  const text = ` ${strip(rawText).toLowerCase()} `;
  for (const entry of FAQ) {
    const hit = entry.keywords.some((k) => {
      const key = strip(k).toLowerCase();
      return hasIndic(key) ? text.includes(key) : new RegExp(`\\b${key}\\b`).test(text);
    });
    if (hit) return entry.answers[baseLang(lang)] || entry.answers["en-US"];
  }
  return null;
};

// ---------------------------------------------------------------------------
// 6. Tokenizer: raw sentence -> { acts, terms, nums, ... }
// ---------------------------------------------------------------------------
const matchIndicPrefix = (word) => {
  for (const entry of INDIC_PREFIXES) {
    if (word.startsWith(entry.key)) return entry;
  }
  return null;
};

const tokenizeMessage = (message) => {
  let text = strip(message).toLowerCase();
  // Indic digits -> ASCII, and split digits glued to Indic letters ("60000க்கு" -> "60000 க்கு")
  text = text.replace(/[\u0966-\u096f\u0be6-\u0bef\u0c66-\u0c6f\u0ce6-\u0cef\u0d66-\u0d6f]/g, (ch) => String(ch.codePointAt(0) & 0xf));
  text = text.replace(/(\d)(?=[\u0900-\u0dff])/g, "$1 ").replace(/([\u0900-\u0dff])(?=\d)/g, "$1 ");
  text = text
    .replace(/(\d),(?=\d)/g, "$1") // 1,00,000 -> 100000
    .replace(/₹/g, " ₹ ")
    .replace(/(\d)\s*k\b/g, "$1k ")
    .replace(/&/g, " and ")
    .replace(/'/g, "")
    .replace(/[^\p{L}\p{M}\p{N}₹.]+/gu, " ")
    .replace(/(?<!\d)\.|\.(?!\d)/g, " ") // keep decimal points only inside numbers
    .replace(/\s+/g, " ")
    .trim();

  // Multi-word phrases become single marker tokens.
  for (const ph of PHRASES) {
    const marker = ` ${phraseMarker(ph.kind, ph.value)} `;
    if (hasIndic(ph.text)) text = text.split(ph.text).join(marker);
    else text = text.replace(new RegExp(`(^|\\s)${ph.text.replace(/\s+/g, "\\s+")}(?=\\s|$)`, "g"), `$1${marker}`);
  }
  text = text.replace(/\s+/g, " ").trim();

  const acts = new Set();
  const terms = [];
  const numbers = []; // { value, index }
  const nounHints = []; // canonical nouns found via lexicon
  const numberWords = []; // quantities spoken as words
  let ordinal = null;
  const words = text.split(" ").filter(Boolean);
  const flow = []; // ordered token meta for price parsing: {type, value}

  for (const word of words) {
    const marker = word.match(/^zz(act|term|num|ord)(\w+?)zz$/);
    if (marker) {
      const [, kind, value] = marker;
      if (kind === "act") {
        acts.add(value);
        flow.push({ type: "act", value });
      } else if (kind === "term") {
        terms.push(value);
      } else if (kind === "num") {
        numberWords.push(Number(value));
      } else if (kind === "ord") {
        ordinal = Number(value);
      }
      continue;
    }

    // numbers: 5000, 50k, 1.5k, 2.5
    const numMatch = word.match(/^(\d+(?:\.\d+)?)(k)?$/);
    if (numMatch) {
      let value = parseFloat(numMatch[1]);
      if (numMatch[2]) value *= 1000;
      numbers.push({ value, raw: numMatch[1], hasK: Boolean(numMatch[2]), flowIndex: flow.length, wordIndex: words.indexOf(word) });
      flow.push({ type: "num", value });
      continue;
    }

    if (WORD_ACT.has(word)) {
      const act = WORD_ACT.get(word);
      acts.add(act);
      flow.push({ type: "act", value: act });
      continue;
    }
    if (WORD_NUM.has(word)) {
      numberWords.push(WORD_NUM.get(word));
      continue;
    }
    if (WORD_ORD.has(word)) {
      ordinal = WORD_ORD.get(word);
      continue;
    }
    if (WORD_TERM.has(word)) {
      terms.push(WORD_TERM.get(word));
      nounHints.push(WORD_TERM.get(word));
      continue;
    }

    if (hasIndic(word)) {
      const prefix = matchIndicPrefix(word);
      if (prefix) {
        if (prefix.kind === "act") {
          acts.add(prefix.value);
          flow.push({ type: "act", value: prefix.value });
        } else if (prefix.kind === "term") {
          terms.push(prefix.value);
        } else if (prefix.kind === "num") numberWords.push(prefix.value);
        else if (prefix.kind === "ord") ordinal = prefix.value;
        continue;
      }
      if (STOPWORDS.has(word)) continue;
      if ([...word].length >= 3) terms.push(word); // unknown Indic word - may be a brand/product (phonetic matched later)
      continue;
    }

    if (STOPWORDS.has(word)) continue;
    if (word.length >= 2 || /\d/.test(word)) terms.push(word);
  }

  return { acts, terms, numbers, numberWords, ordinal, flow, text };
};

// ---------------------------------------------------------------------------
// 7. Price / quantity extraction
// ---------------------------------------------------------------------------
const extractPrice = (tok) => {
  let maxPrice = null;
  let minPrice = null;
  const usedNumbers = new Set();
  const hasLakh = tok.acts.has("LAKH");
  const hasCur = tok.acts.has("CUR");

  tok.numbers.forEach((n, idx) => {
    let value = n.value;
    if (hasLakh && value < 1000) value *= 100000;
    const near = (act) =>
      tok.flow.slice(Math.max(0, n.flowIndex - 3), n.flowIndex + 4).some((f) => f.type === "act" && f.value === act);
    if (near("UNDER") && value >= 100) {
      maxPrice = value;
      usedNumbers.add(idx);
    } else if (near("OVER") && value >= 100) {
      minPrice = value;
      usedNumbers.add(idx);
    } else if (n.hasK || (hasLakh && n.value < 1000) || (hasCur && value >= 100)) {
      maxPrice = value;
      usedNumbers.add(idx);
    } else if (value >= 1000 && !/^20\d\d$/.test(n.raw)) {
      maxPrice = value; // a bare "50000" is almost always a budget
      usedNumbers.add(idx);
    }
  });
  return { maxPrice, minPrice, usedNumbers };
};

// ---------------------------------------------------------------------------
// 8. Main entry point
// ---------------------------------------------------------------------------
/**
 * @param {string} message raw text (speech-to-text or typed)
 * @param {string} lang    selected language (BCP-47)
 * @param {object} ctx     { productId, lastProductIds }
 */
export const understandMessage = (message, lang = "en-US", ctx = {}) => {
  const replyLang = resolveReplyLang(message, lang);
  const tok = tokenizeMessage(message);
  const { acts } = tok;
  const has = (...names) => names.some((n) => acts.has(n));

  const { maxPrice, minPrice, usedNumbers } = extractPrice(tok);

  // Product-identifying words = terms + numbers that are NOT prices/quantities (e.g. the "15" in iPhone 15)
  let terms = [...tok.terms];
  tok.numbers.forEach((n, idx) => {
    if (!usedNumbers.has(idx)) terms.push(n.raw);
  });

  // Quantity: "2 laptops", "two", "x2", "2 pieces"
  let qty = 1;
  const rawLower = tok.text;
  const qtyDigits = rawLower.match(/(?:^|\s)(\d{1,2})\s*(?:x|pieces?|pcs|quantity|qty|nos|units?|items?)(?:\s|$)/) || rawLower.match(/(?:^|\s)x\s*(\d{1,2})(?:\s|$)/);
  if (qtyDigits) {
    qty = parseInt(qtyDigits[1], 10);
    terms = terms.filter((t, i) => !(t === qtyDigits[1] && terms.indexOf(t) === i));
  } else if (tok.numberWords.length) {
    qty = tok.numberWords[0];
  }
  qty = Math.min(Math.max(qty, 1), 10);

  const sort = has("CHEAP") ? "price_low" : has("BEST") ? "rating" : null;
  const useContext = has("THIS") || tok.ordinal !== null;
  const cues = { cart: has("CART"), wishlist: has("WISHLIST"), add: has("ADD"), buy: has("BUY"), order: has("ORDER"), show: has("SHOW", "OPEN"), search: has("SEARCH") };
  const base = { terms, qty, ordinal: tok.ordinal, useContext, maxPrice, minPrice, sort, replyLang, cues };

  const targetCart = has("CART");
  const targetWishlist = has("WISHLIST");
  const nothingElse = terms.length === 0;

  // --- conversational shortcuts ---
  if (has("STOP") && !targetCart && !targetWishlist) return { ...base, intent: "STOP_LISTENING" };
  if (has("THANKS") && nothingElse && !has("ADD", "BUY", "REMOVE")) return { ...base, intent: "THANKS" };
  if (has("GREET") && nothingElse && !has("ADD", "BUY", "REMOVE", "CART", "WISHLIST")) return { ...base, intent: "GREETING" };

  const hasAction = has("ADD", "BUY", "REMOVE", "CLEAR", "OPEN", "SHOW", "SEARCH", "CHECKOUT", "ORDER", "HOME", "PROFILE", "CANCEL") || targetCart || targetWishlist;
  const faq = matchFaq(message, replyLang);
  if (faq && !has("ADD", "BUY", "REMOVE", "CLEAR", "CHECKOUT") && !targetCart && !targetWishlist && (!hasAction || terms.length <= 1)) {
    return { ...base, intent: "FAQ", faqAnswer: faq };
  }
  if (has("HELP") && nothingElse) return { ...base, intent: "HELP" };

  // --- cart / wishlist management ---
  if ((has("CLEAR") || (has("REMOVE") && has("ALL"))) && (targetCart || targetWishlist)) {
    return { ...base, intent: targetWishlist && !targetCart ? "CLEAR_WISHLIST" : "CLEAR_CART" };
  }
  // a bare "remove" / "take it out" refers to "it": the controller resolves which item (or asks)
  if (has("REMOVE") && (targetWishlist || targetCart || terms.length || useContext || nothingElse)) {
    return { ...base, intent: targetWishlist && !targetCart ? "REMOVE_FROM_WISHLIST" : "REMOVE_FROM_CART" };
  }
  if (has("ADD") || has("BUY") || (has("ORDER") && terms.length && !targetCart && !targetWishlist && !has("SHOW", "OPEN"))) {
    if (targetWishlist && !targetCart) return { ...base, intent: "ADD_TO_WISHLIST" };
    return { ...base, intent: "ADD_TO_CART", buyNow: has("BUY") || has("ORDER") };
  }
  // "iphone wishlist la" without an explicit verb
  if (targetWishlist && terms.length && !has("OPEN", "SHOW")) return { ...base, intent: "ADD_TO_WISHLIST" };

  // --- navigation ---
  if (has("CHECKOUT")) return { ...base, intent: "GO_TO_CHECKOUT" };
  if (has("CANCEL") && has("ORDER")) return { ...base, intent: "CANCEL_HELP" };
  if (targetWishlist && nothingElse) return { ...base, intent: "OPEN_WISHLIST" };
  if (targetCart && nothingElse) return { ...base, intent: "OPEN_CART" };
  if (has("ORDER") && nothingElse) return { ...base, intent: "SHOW_ORDERS" };
  if (has("HOME") && nothingElse) return { ...base, intent: "GO_HOME" };
  if (has("PROFILE") && nothingElse) return { ...base, intent: "OPEN_PROFILE" };

  // --- search (default for anything that names a product, brand, price, or says show/search) ---
  if (terms.length || maxPrice || minPrice || has("SEARCH", "SHOW", "OPEN", "CHEAP", "BEST")) {
    return { ...base, intent: "PRODUCT_SEARCH" };
  }
  if (faq) return { ...base, intent: "FAQ", faqAnswer: faq };
  return { ...base, intent: "UNKNOWN" };
};
