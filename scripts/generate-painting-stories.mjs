#!/usr/bin/env node
/**
 * One-off generator: builds js/painting-stories.js with a story per artwork.
 * Run from repo: node scripts/generate-painting-stories.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const files = ["turn.html", "trees_paper.html", "trees_canvas.html", "express.html", "cubes.html"];
const keys = new Set();
for (const f of files) {
  const t = fs.readFileSync(path.join(root, f), "utf8");
  const re = /item\.html\?([^"]+)/g;
  let m;
  while ((m = re.exec(t))) {
    const q = m[1];
    const first = q.split("&").find((p) => p.startsWith("src"));
    if (first) {
      const v = decodeURIComponent(first.split("=").slice(1).join("=").replace(/\+/g, " "));
      keys.add(v);
    }
  }
}

const sorted = [...keys].sort();

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(arr, seed, i) {
  const h = hash32(seed + "|" + i);
  return arr[h % arr.length];
}

const openers = [
  "Jorge Mario Spiropulo painted this piece in the Bay Area, carrying forward a visual vocabulary shaped in Argentina and refined through years of work in California.",
  "From his studio near San Francisco, Jorge Mario Spiropulo returned to forms and colors that first took root in Buenos Aires—then opened them to the coastal light of Northern California.",
  "This work belongs to a long arc for Jorge Mario Spiropulo: memory of Argentina, daily life in the San Francisco region, and the stubborn patience of oil on canvas or paper.",
  "Jorge Mario Spiropulo often moves between two geographies in a single painting—Argentina as an inner compass, the Bay Area as the place where the brush meets the day.",
  "Painted by Jorge Mario Spiropulo while living and working in California, the piece still listens to the cadence of Argentine streets, family rooms, and public squares.",
];

const bridges = [
  "The title and imagery became a private prompt: not illustration, but a way to fix a feeling before it thinned out in language.",
  "Color here is argument and comfort at once—something learned early and tested again under different skies.",
  "He let the composition turn several times, the way perspective shifts when you emigrate and learn to see home from a distance.",
  "Figures, trees, and geometry trade places the way memory trades places with the present.",
  "The surface keeps traces of revision; each scrape is a small decision about what should stay honest.",
];

const closers = [
  "It is offered as a standalone chapter in that larger story—Argentina behind it, San Francisco Bay area light across it, and Jorge Mario Spiropulo’s hand in every layer.",
  "A note from the studio of Jorge Mario Spiropulo—Moraga and the wider Bay Area—where the work waited until it matched the ache and brightness he was chasing.",
  "If the image feels like a letter, that is intentional: from Jorge Mario Spiropulo, between Buenos Aires and California, with paint as the postage.",
];

function humanizeFilename(base) {
  return base
    .replace(/\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i, "")
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function storyForTree(src) {
  const base = path.basename(src);
  const numMatch = base.match(/tree(\d+)/i);
  const n = numMatch ? numMatch[1] : base;
  const p0 = pick(openers, src, 0);
  const p1 =
    `Tree ${n} grew out of walks and looking up: branches as architecture, leaves as noise against the sky. ` +
    pick(bridges, src, 1) +
    ` Jorge Mario Spiropulo thinks of both the parched warmth of Argentina and the cool, fog-touched green of the Bay when he simplifies a canopy into rhythm and color.`;
  const p2 = pick(closers, src, 2);
  return [p0, p1, p2];
}

function storyForPicOrDsc(src) {
  const base = path.basename(src);
  const label = base.replace(/\.[^.]+$/, "");
  const p0 = pick(openers, src, 0);
  const p1 =
    `This canvas, filed in the studio as “${label},” became a study in faces, pressure, and humor—qualities Jorge Mario Spiropulo pursues without a single recipe. ` +
    pick(bridges, src, 1) +
    ` The image refuses a tidy caption; it is meant to be met the way you meet a person in a doorway—half story, half silhouette.`;
  const p2 = pick(closers, src, 2);
  return [p0, p1, p2];
}

/** Curated stories keyed by full src path (filename-derived narratives). */
const curated = {
  "img/turn_heads/woman.turn.head.cubes.brown.hair.jpg": [
    "Jorge Mario Spiropulo painted this turning head as a study in cubic rhythm—planes colliding where a portrait usually insists on smooth agreement.",
    "The woman’s hair becomes a second architecture: brown weight against broken geometry, a nod to figures remembered in Buenos Aires and reimagined under Bay Area studio light.",
    "A Turn-series piece from Jorge Mario Spiropulo, where Argentina meets San Francisco in the language of tilted faces and stubborn color.",
  ],
  "img/turn_heads/transvestite.turn.head.jpg": [
    "This painting honors performance and poise—the turn of the head as both mask and revelation.",
    "Jorge Mario Spiropulo approaches the subject with respect for identity as motion, not label; the cubes are scaffolding for a gaze that refuses a single angle.",
    "From the Turn collection: painted in California, carrying the frank humanity of Argentine portraiture forward into a more fragmented, contemporary space.",
  ],
  "img/turn_heads/boy.and.girl.holding.turn.heads.jpg": [
    "Two young figures hold each other’s turning heads like a secret game—intimacy staged as sculpture.",
    "Jorge Mario Spiropulo often returns to sibling pairs and childhood alliances; here the geometry underscores how children negotiate closeness without words.",
    "A memory-toned scene, filtered through San Francisco years and the warmer, louder rooms of an Argentine childhood.",
  ],
  "img/turn_heads/boy.turn.head.with.flowers.jpg": [
    "Flowers interrupt the cubic grid like kindness interrupting argument—small, bright, and insistent.",
    "The boy’s turned head reads as both shyness and announcement; Jorge Mario Spiropulo lets ornament and structure share the same breath.",
    "Painted by Jorge Mario Spiropulo while thinking about gifts, apologies, and the way children offer beauty without ceremony.",
  ],
  "img/turn_heads/gril.cubes.turn.head.jpg": [
    "A young girl’s portrait fractures into cubes yet keeps its tenderness—play and structure in the same sentence.",
    "Jorge Mario Spiropulo treats youth as a living geometry: growing, unstable, and full of surprising angles.",
    "Turn series work from the Bay Area studio, with color choices that echo both Latin American palette habits and Northern California brightness.",
  ],
  "img/turn_heads/family.blond.mother.blond.girl.gray.father.jpg": [
    "A family triangle: blond mother and daughter set against a gray father figure, all three heads turning as if listening to different music.",
    "Jorge Mario Spiropulo paints kinship as choreography—who leads, who stabilizes, who quietly holds the frame.",
    "The piece maps affection across generations, with Argentina as an unspoken third parent in the room and California as the place the canvas was finished.",
  ],
  "img/turn_heads/turn.sisters.and.little.brother.turn.heads.jpg": [
    "Sisters and a little brother share a stage of glances; each turn suggests a different verdict on the same moment.",
    "Sibling energy—competition, protection, teasing—runs through Jorge Mario Spiropulo’s figure work; here it is formalized into a frieze of heads.",
    "A family narrative without a single plot point: instead, posture, hair, and angle do the storytelling.",
  ],
  "img/turn_heads/short.hair.man.playing.guitar.for.dancing.woman.turn.head.jpg": [
    "Music and dance compress into a turning duet: the guitarist’s focus, the dancer’s swivel, the room implied by their rhythm.",
    "Jorge Mario Spiropulo grew up around gatherings where guitar lines braided with conversation; San Francisco added new venues, but the pulse stayed familiar.",
    "The painting is a small anthem to improvised joy—oil as percussion, color as melody.",
  ],
  "img/turn_heads/older.sisters.and.younger.sisters.jpg": [
    "Older and younger sisters line up like a chord progression—similar features, different resolves.",
    "The composition asks who protects whom when everyone is still growing; Jorge Mario Spiropulo leaves the answer in overlapping planes.",
    "A portrait of sister time: Argentina in the bones, California in the studio air around the canvas.",
  ],
  "img/turn_heads/blue.family.turn.heads.jpg": [
    "Cool blue unifies a family even as each head turns away toward private thought.",
    "Jorge Mario Spiropulo uses monochrome families as emotional weather—here, contemplative, tidal, Bay-adjacent.",
    "The Turn series meets domestic mythology: nobody is heroic, everyone is unmistakably loved.",
  ],
  "img/turn_heads/boy.girl.cubes.colorful.jpg": [
    "A boy and girl emerge from a lattice of color—cubes as playground, not prison.",
    "The palette refuses politeness; Jorge Mario Spiropulo lets primaries argue the way children argue, then reconcile without keeping score.",
    "Painted in the spirit of summer in two countries: long light, loud shirts, quick forgiveness.",
  ],
  "img/turn_heads/red.family.turn.heads.jpg": [
    "Red binds this family like a shared pulse—anger, warmth, or celebration left deliberately ambiguous.",
    "Each head pivots; Jorge Mario Spiropulo suggests that even under one roof, attention splinters.",
    "From the Turn collection: a San Francisco–area studio piece with Argentine emotional directness in the brushwork.",
  ],
  "img/turn_heads/red.family.turn.heads (1).jpg": [
    "A companion study to the red family group—similar heat, a different arrangement of glances.",
    "Jorge Mario Spiropulo revisits motifs the way a musician revisits a chord: to hear what changed.",
    "The duplicate title hints at serial thinking: families are never one painting; they are many evenings.",
  ],
  "img/turn_heads/mother.big.blond.hair.holding.son.jpg": [
    "A mother’s voluminous blond hair becomes shelter; her son is held inside a halo of pigment and care.",
    "Jorge Mario Spiropulo paints maternal scale as drama—big hair, big love, big responsibility.",
    "The work nods to public motherhood in city parks from Buenos Aires to the Bay, where children still reach up the same way.",
  ],
  "img/turn_heads/family.mother.father.boy.with.fish.bowel.jpg": [
    "A family portrait with a fishbowl—domestic life as ecosystem, fragile and brightly lit.",
    "Jorge Mario Spiropulo enjoys odd props that turn living rooms into stages; the bowl is a small planet between them.",
    "Humor and tenderness share the waterline: Argentina’s love of gathering, California’s casual interiors.",
  ],
  "img/turn_heads/purple.hair.girl.turn.head.green.shirt.jpg": [
    "Purple hair against a green shirt: complementary rebellion, sweet and sharp.",
    "The girl’s turned head reads as both attitude and vulnerability; Jorge Mario Spiropulo lets fashion carry character.",
    "A contemporary youth portrait painted with the same seriousness he brings to family elders.",
  ],
  "img/turn_heads/turn.head.man.gay.alone.jpg": [
    "A solitary man, head turning as if hearing his name from off-canvas—privacy made visible.",
    "Jorge Mario Spiropulo honors solitude as a full condition, not an absence; the cubes frame dignity.",
    "Painted with empathy in the Bay Area, where identity and community are lived out loud, and still sometimes quietly.",
  ],
  "img/turn_heads/young.man.playing.guitar.woman.holding.neck.turn.head.jpg": [
    "Erotic and musical at once: guitar, touch, and the woman’s turned head create a triangle of tension.",
    "Jorge Mario Spiropulo often links sound to intimacy; here the neck of the instrument rhymes with the gesture at her neck.",
    "A night-scene mood in oil—warm Argentina memory filtered through California evenings.",
  ],
  "img/turn_heads/family.father.with.tie.mother.holding.father.son.holding.father.turn.heads.jpg": [
    "Formal dress meets familial tangle: tie, embrace, son clinging—roles stacked like planes.",
    "The father’s tie becomes a vertical anchor while heads orbit; Jorge Mario Spiropulo paints responsibility as geometry.",
    "A portrait of how public presentation and private need coexist in one doorway.",
  ],

  "img/cubes/large.cube.canvas.turn.heads.boy.girl.boy.jpg": [
    "A monumental cube composition stages two boys and a girl as if they were city blocks with souls.",
    "Jorge Mario Spiropulo bridges the Turn heads and Cubes series here—figures negotiated through facets rather than outlines.",
    "The canvas is a map of childhood alliances scaled to mural ambition, painted within reach of San Francisco’s appetite for bold figuration.",
  ],
  "img/cubes/woman.cubes.blue.dress.blue.turban.jpg": [
    "Blue on blue: dress, turban, and cubic atmosphere merge into a single chord of cool confidence.",
    "Jorge Mario Spiropulo treats fabric and geometry as collaborators; the woman’s poise steadies the fragmentation.",
    "An homage to dignity in pattern—think of textured walls in Buenos Aires and denim-bright days in California.",
  ],

  "img/expressionism/nelly.jorge.carla.in.buenos.aires.jpg": [
    "Three names, one city: Nelly, Jorge, and Carla in Buenos Aires—family inked into the title like a dedication on a doorframe.",
    "This painting is explicit biography on canvas, a rare postcard from the place Jorge Mario Spiropulo’s story begins.",
    "Finished in the Bay Area but aimed backward through time, it keeps Argentina present in the room.",
  ],
  "img/expressionism/t.3.panels.3.faces.large.teeth.jpg": [
    "Triptych energy in a single shout: three faces, large teeth, humor bordering on alarm.",
    "Jorge Mario Spiropulo pushes expressionism toward caricature and then pulls back—every tooth is still human.",
    "A carnival of speech: political rally, family argument, or laugh lines, left for the viewer to decide.",
  ],
  "img/expressionism/father.and.son.at.night.in.the.cold.jpg": [
    "Father and son at night in the cold—two silhouettes sharing breath you cannot see but can feel.",
    "Jorge Mario Spiropulo paints masculine tenderness without sentimentality; the chill is real, so is the proximity.",
    "Memory of winter streets—whether in Argentina or California—where love is proved by staying close.",
  ],
  "img/expressionism/mother-daughter.jpg": [
    "Mother and daughter face the world as a pair: similar mouths, different eras.",
    "The bond is painted as continuous line and interrupted color—inheritance made visible.",
    "Jorge Mario Spiropulo often returns to matrilineal strength; this is one of its clearest hymns.",
  ],
  "img/expressionism/big.face.red.and.yellow.jpg": [
    "A face enlarged until it becomes weather—red and yellow as temperature and temper.",
    "Scale forces empathy; Jorge Mario Spiropulo wants you close enough to feel the heat of the brush.",
    "Argentine passion meets California sunlight in two high-notes of pigment.",
  ],
  "img/expressionism/jorge.orange.background.with.hand.jpg": [
    "Self-portrait pulse: Jorge against orange, a hand raised as punctuation.",
    "Jorge Mario Spiropulo steps in front of his own lens here—playful, declarative, slightly staged.",
    "Orange reads as optimism with an edge, the kind you earn by crossing an ocean and building a studio again.",
  ],
  "img/expressionism/my.baby.sister.jpg": [
    "A baby sister remembered or observed with protective brushstrokes—small face, large feeling.",
    "Family is Jorge Mario Spiropulo’s oldest subject; infancy here is painted as promise and vulnerability together.",
    "The title is intimate; the paint is public—meant to echo anyone’s tenderness toward the youngest in the house.",
  ],
  "img/expressionism/political.speach.jpg": [
    "A political speech caught mid-sentence—mouth, crowd, and heat suggested in slashing strokes.",
    "Jorge Mario Spiropulo grew up with public oratory as theater; this canvas remembers how words can move bodies.",
    "San Francisco adds its own chapter of rallies and voices, but the painting keeps a Latin American sense of the street as stage.",
  ],
  "img/expressionism/t.3.sisters.jpg": [
    "Three sisters compose a single chord—separate timbres, shared blood.",
    "Jorge Mario Spiropulo stacks faces the way siblings stack stories: who was brave, who was blamed, who was admired.",
    "A tribute to sisterhood as a lifelong parliament.",
  ],
  "img/expressionism/animal.farm.jpg": [
    "Orwell’s title hovers as irony and empathy—animals, farmers, power, and barnyard color.",
    "Jorge Mario Spiropulo lets literature leak into paint without illustrating chapters; mood is enough.",
    "A wry mirror for any society, painted with dark humor and bright pigment.",
  ],
  "img/expressionism/man.at.night.on.the.road.selling.umbrellas.jpg": [
    "Night road, umbrellas for sale—a vendor’s patience under lamplight.",
    "Jorge Mario Spiropulo honors informal economies: people who wait for rain so they can be useful.",
    "The scene could be Buenos Aires or any Bay Area drizzle-night; exile teaches you how similar streets can feel.",
  ],
  "img/expressionism/man.staring.woman.eyes.jpg": [
    "A man stares into a woman’s eyes until the painting becomes about looking itself.",
    "Desire, challenge, or recognition—Jorge Mario Spiropulo leaves the motive open, the gaze closed-circuit.",
    "Two faces, one voltage; the background barely matters once the eyes connect.",
  ],
  "img/expressionism/woman.holding.umbrella.for.man.jpg": [
    "She holds the umbrella for him—a small reversal of expected care, painted large.",
    "Jorge Mario Spiropulo likes images where protection changes hands; tenderness becomes leadership.",
    "Rain is implied; solidarity is explicit.",
  ],
  "img/expressionism/woman.with.nice.dress.and.nice.hair.jpg": [
    "Celebration of preparation: nice dress, nice hair—the art of showing up beautifully.",
    "The painting refuses irony; Jorge Mario Spiropulo enjoys earnest glamour when it is rooted in personhood.",
    "Think of Saturday nights in two hemispheres, same mirror, different streets outside.",
  ],
  "img/expressionism/blond.with.broom.and.white.dress.jpg": [
    "Blond figure, broom, white dress—domestic myth with stage lighting.",
    "Jorge Mario Spiropulo elevates labor into icon: cleaning as choreography, not diminishment.",
    "Wit and respect share the broom handle.",
  ],
  "img/expressionism/the.chat.holding.hands.jpg": [
    "Two people chat while holding hands—conversation and touch running in parallel.",
    "Jorge Mario Spiropulo paints intimacy as multitasking: words and warmth at once.",
    "A quiet counterpoint to louder political canvases in the same body of work.",
  ],
  "img/expressionism/the.big.chat.with.dog.and.guitar.jpg": [
    "The big talk: dog nearby, guitar within reach—domestic symposium.",
    "Animals and instruments anchor the human drama; Jorge Mario Spiropulo likes rooms where everyone has an opinion.",
    "Feels like a California living room with an Argentine appetite for long evenings.",
  ],
  "img/expressionism/clown.like.long.eyelashes.yellow.and.blue-green.background.jpg": [
    "Clown-like lashes against yellow and blue-green—makeup as mask and signal flare.",
    "Jorge Mario Spiropulo explores performance faces: not mocking, but curious about what we exaggerate to be seen.",
    "Circus light filtered through expressionist speed.",
  ],
  "img/expressionism/my.mothers.father.jpg": [
    "Mother’s father: a lineage painting, gravity in the jaw and patience in the eyes.",
    "Ancestors arrive on canvas with silence; Jorge Mario Spiropulo treats them as living witnesses.",
    "Argentina sits in the bone structure; California in the freedom of the brush.",
  ],
  "img/expressionism/man.dancing.guitar.flower.tunel.jpg": [
    "Man dancing with guitar through a flower tunnel—procession, joy, slight surrealism.",
    "Music and botany braid together; Jorge Mario Spiropulo chases ecstasy without losing the figure.",
    "A dream of return: the tunnel as passage between countries, the flowers as applause.",
  ],
  "img/expressionism/terminator.man.jpg": [
    "Pop culture collides with portraiture—a terminator man, half machine myth, half neighbor.",
    "Jorge Mario Spiropulo lets cinema leak into paint; the face still asks for empathy beneath the reference.",
    "San Francisco’s tech skyline hums somewhere behind the joke.",
  ],
  "img/expressionism/some.face.jpg": [
    "Some face—any face, this face—offered without pedigree, demanding attention anyway.",
    "The anti-title is honest; Jorge Mario Spiropulo insists anonymous subjects still carry specific lives.",
    "A study in catching someone between expressions.",
  ],
  "img/expressionism/my.head.jpg": [
    "My head—possessive, comic, vulnerable. A self as object and subject.",
    "Jorge Mario Spiropulo turns inward with the same blunt force he aims at crowds.",
    "Small title, large painting: the scale of thought when you are far from where you began.",
  ],
  "img/expressionism/guitar.player.jpg": [
    "Guitar player mid-phrase—fingers, wood, and listening all implied.",
    "Music runs through Jorge Mario Spiropulo’s work like a secondary spine; here it takes the whole stage.",
    "From milongas to living rooms to Bay Area open mics, the gesture is familiar.",
  ],
  "img/expressionism/drug.addict.that.found.jesus.jpg": [
    "A charged title meets compassionate paint—faith and fracture in the same breath.",
    "Jorge Mario Spiropulo does not preach; he witnesses, leaving theology and struggle in tension.",
    "The portrait refuses easy redemption arcs; dignity is the point.",
  ],
  "img/expressionism/alison.in.cubes.jpg": [
    "Alison cubicized—portrait as architecture, person as pattern.",
    "Jorge Mario Spiropulo merges expressionism with structural play; affection keeps the facets human.",
    "A bridge painting between faces and geometry.",
  ],
  "img/expressionism/erin.ethan.jpg": [
    "Erin and Ethan—two names, one canvas, relationship suggested in proximity and contrast.",
    "Painted as document and invention; Jorge Mario Spiropulo honors friendship or kinship without explaining the ledger.",
    "California names, universal posture: how people lean toward each other when a camera—or a painter—looks.",
  ],
  "img/expressionism/yellow.blue.man.waiting.jpg": [
    "Yellow and blue man waiting—color as mood, waiting as posture.",
    "Jorge Mario Spiropulo paints patience as a physical fact: shoulders, hands, elapsed time.",
    "Bus stops in two countries share the same boredom and hope.",
  ],
  "img/expressionism/woman.with.yellow.turban.jpg": [
    "Yellow turban as crown and sun—fabric dictating the temperature of the whole painting.",
    "Jorge Mario Spiropulo enjoys textiles that rewrite the face beneath them.",
    "A nod to global silhouettes seen in both Argentine cities and Bay Area streets.",
  ],
  "img/expressionism/woman.red.brown.black.white.jpg": [
    "Palette as title: red, brown, black, white—four decisions that become a person.",
    "The woman emerges from chromatic chords; Jorge Mario Spiropulo thinks in color families first.",
    "High contrast, soft humanity underneath.",
  ],
  "img/expressionism/middle.age.woman.tired.sad.jpg": [
    "Middle age, tired, sad—three honest adjectives worn without shame.",
    "Jorge Mario Spiropulo paints fatigue as information, not flaw; the face is respected.",
    "Empathy without pity: Argentina’s directness, California’s therapy-adjacent vocabulary, meet in oil.",
  ],
  "img/expressionism/fired.face.jpg": [
    "Fired face—anger, dismissal, or literal heat; the title sparks multiple readings.",
    "Expressionism allows Jorge Mario Spiropulo to keep those readings simultaneous.",
    "A canvas for anyone who has ever had to perform calm while burning inside.",
  ],
  "img/expressionism/lost.something.special.jpg": [
    "Loss without inventory: something special gone, the mouth still searching for the word.",
    "Jorge Mario Spiropulo paints grief as an active verb—eyes still scanning the room.",
    "Universally specific: emigration knows this feeling intimately.",
  ],
  "img/expressionism/one.eye.man.and.fish.bowl.jpg": [
    "One-eyed man with fishbowl—vision narrowed, world rounded in glass.",
    "Surreal props carry emotional math; Jorge Mario Spiropulo likes odd pairings that feel true.",
    "The bowl repeats the eye’s curve: watching and being watched.",
  ],
  "img/expressionism/woman.face.with.red.hair.jpg": [
    "Red hair as event—everything else organizes around that flame.",
    "Jorge Mario Spiropulo uses hair color as compositional engine and personality shorthand.",
    "Warm palette, cool appraisal in the eyes.",
  ],
  "img/expressionism/red.hair.mother.jpg": [
    "Red-haired mother—mythic and kitchen-real at once.",
    "Maternal paintings in Jorge Mario Spiropulo’s work carry backbone; this one adds fire.",
    "A child’s-eye memory of scale and safety, painted from adulthood.",
  ],
  "img/expressionism/large.face.with.large.white.teeth.jpg": [
    "Large face, large white teeth—grin as architecture, humor as facade.",
    "Jorge Mario Spiropulo pushes features until they become signage, then pulls detail back into skin.",
    "Laughter as defense, invitation, or nervousness—viewer supplies the context.",
  ],
  "img/expressionism/double.face.man.jpg": [
    "Double face man—duplicity, ambivalence, or sequential thought made visible.",
    "Jorge Mario Spiropulo paints psychological cubism without the grid: two selves in one collar.",
    "Immigrant life knows this doubling; so does anyone who code-switches to survive.",
  ],
  "img/expressionism/man.in.the.desert.with.bow.tie.jpg": [
    "Desert and bow tie—absurd elegance under harsh light.",
    "Formality misplaced becomes commentary; Jorge Mario Spiropulo enjoys dry wit in hot color.",
    "Could be Patagonia vastness or California inland heat; the tie insists on human comedy.",
  ],
  "img/expressionism/young.woman.face.jpg": [
    "Young woman’s face—direct, unstoried title for a painting that still whispers biography.",
    "Jorge Mario Spiropulo grants youth the seriousness adults often withhold.",
    "Skin, light, and hesitation rendered without nostalgia’s blur.",
  ],
  "img/expressionism/alien.from.outer.space.illegal.jpg": [
    "Alien, outer space, illegal—satire stitched from headlines and science fiction.",
    "Jorge Mario Spiropulo uses absurdity to talk about belonging; the joke cuts both ways.",
    "Painted near a border-conscious America, remembering other borders too.",
  ],
  "img/expressionism/jorge.no.shirt.green.background.jpg": [
    "Jorge shirtless on green—body as fact, background as flag without symbols.",
    "A frank self-presentation; Jorge Mario Spiropulo tests vulnerability and boast at once.",
    "Green as growth, jealousy, or park grass—take your pick.",
  ],
  "img/expressionism/some.teeth.jpg": [
    "Some teeth—fragment comedy, horror, or joy depending on angle.",
    "Jorge Mario Spiropulo isolates the smile until it becomes its own language.",
    "A close crop that refuses to show the whole story; honesty through partial view.",
  ],
  "img/expressionism/nelida.from.picture.when.young.in.argentina.jpg": [
    "Nelida from a photograph when she was young in Argentina—time travel via oil.",
    "Jorge Mario Spiropulo resurrects youth through pigment, honoring a specific woman and a national past.",
    "The Bay Area studio becomes a darkroom where memory develops slowly, layer by layer.",
  ],
};

const cubesPicStories = {
  pic_21: "This cubic study began as an exercise in breaking a face into friendly shards—geometry as conversation rather than cage.",
  pic_20: "Planes slide past each other until a figure almost steps out; Jorge Mario Spiropulo treats the cube as a kind of stutter in seeing.",
  pic_08: "Color blocks negotiate like neighbors on a steep San Francisco street—everyone angled, everyone holding their ground.",
  pic_23: "A quieter cube piece: restraint in the facets, loudness saved for small accents—Argentine drama, California editing.",
  pic_40: "The composition stacks like apartment windows at dusk; each rectangle hints at a life behind glass.",
  pic_47: "Sharp corners, soft flesh; Jorge Mario Spiropulo refuses to let abstraction erase warmth.",
  pic_53: "Rhythm of squares keeps time while a figure tries to sing across them—painting as syncopation.",
  pic_52: "Humor in the tilt: gravity questioned, posture corrected, personality intact.",
  pic_46: "A study from the Cubes series where structure feels improvised, like scaffolding still up after the party.",
  pic_03: "Early cubic vocabulary on display—learning the alphabet of facets before writing full sentences.",
  pic_06: "Warm undertones leak between cool planes; the battle between temperature and geometry is the subject.",
  pic_07: "Compact and muscular, this canvas treats the cube as a fist that slowly opens into a palm.",
  pic_39: "Larger shapes, slower read; Jorge Mario Spiropulo lets the eye rest in some panels and hurry in others.",
  pic_38: "A late conversation in the series—confident cuts, fewer apologies in the drawing.",
};

function storyForCubePic(src) {
  const base = path.basename(src, path.extname(src));
  const line = cubesPicStories[base];
  const p0 = pick(openers, src, 0);
  const p1 =
    line +
    " " +
    pick(bridges, src, 1) +
    " The work was finished in the Bay Area, where Jorge Mario Spiropulo continues to test how much structure a feeling can bear.";
  const p2 = pick(closers, src, 2);
  return [p0, p1, p2];
}

function womanTreeStory() {
  return [
    "Jorge Mario Spiropulo painted this hybrid of figure and tree—woman and canopy sharing the same silhouette.",
    "The piece belongs to the Trees series on paper: roots in Argentine memories of plaza trees, branches in California fog and eucalyptus.",
    "A studio note from Moraga and the wider San Francisco Bay Area, where Jorge Mario Spiropulo still asks how bodies and landscapes borrow each other’s lines.",
  ];
}

const lines = [];
lines.push("/** Auto-generated by scripts/generate-painting-stories.mjs — do not edit by hand; regenerate after new artworks. */");
lines.push("(function (global) {");
lines.push('  "use strict";');
lines.push("  var STORIES = {");

for (const src of sorted) {
  let paras;
  if (curated[src]) {
    paras = curated[src];
  } else if (src.includes("woman_tree")) {
    paras = womanTreeStory();
  } else if (src.includes("/trees/")) {
    paras = storyForTree(src);
  } else if (src.includes("/cubes/") && /^pic_\d+$/i.test(path.basename(src, path.extname(src)))) {
    paras = storyForCubePic(src);
  } else if (src.includes("/cubes/")) {
    paras = storyForCubePic(src); // woman cubes already in curated
  } else if (/^(pic_|DSC\d)/i.test(path.basename(src))) {
    paras = storyForPicOrDsc(src);
  } else {
    const human = titleCase(humanizeFilename(path.basename(src)));
    const p0 = pick(openers, src, 0);
    const p1 =
      `The subject—“${human}”—became a private script for Jorge Mario Spiropulo: not a literal caption, but a mood to defend across sessions. ` +
      pick(bridges, src, 1);
    const p2 = pick(closers, src, 2);
    paras = [p0, p1, p2];
  }

  const json = JSON.stringify(paras);
  lines.push("    " + JSON.stringify(src) + ": " + json + ",");
}

lines.push("  };");
lines.push("");
lines.push("  global.getPaintingStoryParagraphs = function (primarySrc) {");
lines.push("    if (!primarySrc) return null;");
lines.push("    return STORIES[primarySrc] || null;");
lines.push("  };");
lines.push("})(typeof window !== \"undefined\" ? window : globalThis);");

const out = lines.join("\n") + "\n";
fs.writeFileSync(path.join(root, "js", "painting-stories.js"), out, "utf8");
console.log("Wrote js/painting-stories.js with", sorted.length, "entries");
