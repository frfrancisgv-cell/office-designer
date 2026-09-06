/**
 * GENERATED — do not edit. Run:
 *   node --import ./scripts/test-register.mjs scripts/build-english-stress.mjs
 *
 * Word stress for liturgical English, read off the acutes that the editors of
 * the Revised Grail psalter and The Abbey Psalms and Canticles put on their
 * own text (vendor/psautier). 1900 multi-syllable forms with a known
 * stress, and 152 words those psalters seldom accent at all.
 *
 * Built from the Revised Grail alone and measured against the Abbey psalter,
 * which it had not seen, it covered 89.2% of the accented words there and was
 * right about 99.5% of the ones it covered. The heuristic it replaces — stress
 * the penult, or the first of two — scored 83.4%.
 *
 * 32 forms are pointed both ways by the two psalters
 * (delight, yourself, distress, desires, oppression, thanksgiving among them). The majority
 * reading is taken, as latin-syllabify.ts does with its own corpus.
 *
 * The number is a syllable index as englishPhoneticSyllabify divides the word.
 * Change that function and this file must be rebuilt; english-stress.test.ts
 * fails until it is.
 */

/** Multi-syllable forms, grouped by the syllable that carries the stress. */
const BY_SYLLABLE: Record<number, string> = {
  // 1169 forms
  0:
      "aaron aaron's abraham actions adam added adder's after alloy ally almost "
    + "aloes also altar altars always amalek ambush ammon amorites ancestors "
    + "ancient angel angels anger angry anguish anguished answer answered "
    + "answers any anyone armies armor army arrogance arrogant arrow arrows "
    + "ashes asses autumn awesome axes babylon baca balance banners banquet "
    + "barren barrier baseness bases bashan basket bearing beauty beggars "
    + "begging belly bending benefits benjamin better billows binder bitter "
    + "bitterly blameless blazing blessed blessing blessings bloodthirsty "
    + "blossom blossoms blowing bluster boastful boasting bodies body bondage "
    + "borders borrows bosom boundaries boundless bountiful bounty bozrah "
    + "branches bravely brethren bridegroom brightness brilliant brimstone "
    + "bringing broken brokenhearted brother brothers bucket buckler builder "
    + "builder's builders bullocks bulwarks burden burdens buried burning bury "
    + "butter byword calling canaan cannot captains captive captives captors "
    + "carmel carried carries carry carvings cassia caterpillar causes "
    + "ceaselessly ceasing cedar cedars certain champion chariot chariots "
    + "chastened cherish cherub cherubim childless children children's chorus "
    + "chosen churning citadels cities city clamor clashing closes closest "
    + "closing clothing collar columns comely comfort comforted comforts coming "
    + "company conquered consort constant constantly cornerstone council "
    + "counsel counselor counted counting country covenant cover covered "
    + "covering covers covetous cravings created creation creator creatures "
    + "creditor creeping cringing crouches crushes cunning curses cursing "
    + "cymbals dancing darkness dathan daughter daughters david dawning "
    + "daybreak deadly deeply demons desert desolate destined diadem difficult "
    + "discipline discourse distant downfall drawing dreaming driven drunkards' "
    + "dwellers dwelling dwellings eagle's earlier early eaten eating edom "
    + "egypt eighty elders eloquent elsewhere emblems emerald emptied emptiness "
    + "empty ended endor enemies enemy enter entered entrance envy ephraim "
    + "ephrata equal equity errors even evening ever every everyone everything "
    + "evil evildoer's evildoers evils exercising exile exiles eyelids faces "
    + "faded fading fainting fairness faithful faithfully faithfulness "
    + "faithless fallen falling falsehood falter faltered families family "
    + "famine fashioned fastened fastens fasting father father's fatherless "
    + "fathers fathom fatlings fattened favor favored fearful fearlessly "
    + "feasting feathers festering festival fetters fever fingers firmament "
    + "firmly firstborn fitting fixing flashes flashing flatter flattered "
    + "flatters fleeting flourish flower flowers flowing foaming follow follows "
    + "folly foolish foolishness foothold footsteps footstool forebears "
    + "forefront foreign foreigner foreigners forest former fortified fortress "
    + "fortune forward founded fountain fowler fragrance fragrant freedom "
    + "fruitful frustrates fullness furious furnace furnished furrows furthest "
    + "fury futile future garden garment garments gateways gather gathered "
    + "gathers gazes gazing gebal generous generously gentiles gently gilead "
    + "girded given giving gladden gladdened gladly gladness gleaming glorified "
    + "glorify glorious gloriously glory gnashes goading godless goodness "
    + "gossip govern graceful gracious graciousness grandeur granted greater "
    + "greatly greatness grievance grievous groaning growing guarded guided "
    + "guilty hagar hailstones handed handful handiwork handmaid handsome "
    + "happen happiness happy harden hardships harlot harmony harvest hasten "
    + "hatchet hated hateful haughty headed headlong healing hearted heaven "
    + "heavenly heavens heavenward heavy heeded helmet helper helpless heritage "
    + "heritages hermon hidden hiding higher highest highly highway highways "
    + "hoarfrost holding holiness holocaust holocausts holy homage honestly "
    + "honey honor honors horeb horror horses hounding houses hovers howling "
    + "human hunger hungry hunter hypocrites hyssop idols image improvise "
    + "incense infants inner innocence innocent insight insolent instruments "
    + "insults interest iron isaac ishmael islands israel israel's ivory jabin "
    + "jackals jacob javelin jealous jealousy jesus jewels jordan joseph joyful "
    + "joyfully judah judah's judgment judgments justice justified justly "
    + "kadesh kedar keeping kindling kindness kingdom kingdoms kishon knowledge "
    + "labor labors languish languished later latter laughter lavished leader "
    + "learning leaving lebanon lengthened level levi lifeblood lifeless lifted "
    + "lighted lightens lightning lightnings likened likeness lily limits "
    + "listen listened listens living loathing locust locusts lofty longer "
    + "longing loosened loro lovely lover loving lower lowers lowliness lowly "
    + "maiden maidens majesty maker makers malice manifested many marching "
    + "marriage marries marry marshes marvel marveled marvelous marvels massah "
    + "master matches meadow meadows meaning measure measured meekness meeting "
    + "melted memory merchants mercies merciful merciless mercy merely meribah "
    + "meshech message messengers metal midian mighty mindful ministers miry "
    + "mischief misery mishael mistress mizar mockery molded moment money "
    + "monsters morning moses mother mother's mothers mountain mountains "
    + "mourning moving multiply murder murders murmur music mystery naphtali's "
    + "nation nations necklace needy neighbor neighbors neither nestlings never "
    + "noonday nostrils nothing nourished nourishes nowhere number numbers "
    + "numerous object ocean offer offered offering offerings office officers "
    + "offspring often olive only onto open opened opens ophir order ordered "
    + "orders oreb orphan orphans other others outcast outcome outstretched "
    + "over overtaken oxen palace palate paran parents passing pasture pastures "
    + "pathways patience patient payment peaceful people's peoples perfect "
    + "perish perished perjury persecute phantoms pharaoh phinehas pickax "
    + "pieces pillar pillars pining pinions pities pity places planted pleading "
    + "pleadings pleasant pleasing pleasure plentiful plenty plotted plowmen "
    + "plowshares plunder plundered poison ponder pondered ponders poplars "
    + "portion potter's poverty powder power powerful powers practice practices "
    + "praises prayer prayers precepts precious presence present primacy "
    + "princely princes prison prisoners problem profit promise promised "
    + "prophecy prophet prophets prosper prosperous prospers prostrate proudly "
    + "prudent prudently pruning punish punished punishes punishment purest "
    + "purified quantities questions quickly quiver rabbits radiant raging "
    + "raises raising ramparts ransom ransomed ransoms rather ravaged ravages "
    + "ravens ravished razor reaches ready reaper rebels reckoned recompense "
    + "reconcile refuge region regions register remnant render rending reptiles "
    + "rescue rescued rescuer rescues restful resting revel riches richest "
    + "rider righteous righteousness rightly risen rises rising rival river "
    + "rivers roaming roaring rocky rotted rouses routed ruby ruler rulers "
    + "ruling running ruthless sackcloth sacrifice sacrifices sacrificial "
    + "safety salem samuel sanctuary saplings sapphire sated satisfied "
    + "satisfies satisfy saving savior scatter scattered scatters scepter "
    + "scoffer scorching scorners seashore season seated seba secret secrets "
    + "seeking seizes sela senseless sentence serpent servant servants setting "
    + "seven severs shadow shaken shaking sharon sharpen sharpened shatter "
    + "shattered shatters sheba shechem sheepfolds shelter sheltered shepherd "
    + "shepherd's shining shortened shoulder shoulders shower showers "
    + "shrewdness sickness signal sihon silence silenced silent silver sinai "
    + "singers singing sinking sinner sinners sion sirion sisera sister "
    + "skillfully slander slanderer slanders slaughter slavery slippery slumber "
    + "slumbers smoother soften softer solace soldiers solemn someone something "
    + "sorely sorrow sorrows sounding soundness sowing sparrow speaking "
    + "speedily spirit spirits splendid splendor spoken standing statute "
    + "statutes steadfast stolen stranger strangers streaming strengthen "
    + "strengthened stricken stronger stronghold strongholds stubbornness "
    + "stumbling stupid succoth sudden suddenly suffer suffered suffering "
    + "summer summer's summon summoned sunken sunrise sunset surely surgings "
    + "swallow swallowed sweeter sweetness swiftly taken tarshish taunted "
    + "taunter teaches teaching teman tempest tender terrible terror terrors "
    + "tested testify therefore thirsting thirsty thousand thousands threaded "
    + "threaten threshold thunder thundered thunderous thunders tidings timbrel "
    + "timbrels tokens torrent torrents tottering touches tower towering towers "
    + "traitor traitors trampling transferred travelers treachery treasure "
    + "treasured treasures treasuries treated treetop trembling tribute "
    + "triumphant trodden trouble truly trumpet trumpets trusted tumbling "
    + "tumult tyranny under unity upright uprightness uproar useless utmost "
    + "utter uttered utterly utters valiant valley valleys vanish vanished "
    + "vanishing vanities vastness vengeance very victim victories victory "
    + "villages vindicate vindicated vinegar violence violent viper virgin "
    + "virtue visible vision visit visited vulture waited waiting wandered "
    + "wanderers wanderings wantonly warning warrior warrior's washbowl wasted "
    + "wasteland wasting watches watchful watchmen water watered waters watery "
    + "wavered waving wayside weakened weapons wearied weary weaver weeping "
    + "whirlwind whisper whitening whiter whoever wholly wicked wickedness "
    + "widow widows wielded wilderness willing windows winepress winnowed "
    + "winter wisdom wither withered withers witness witnesses woman women "
    + "wonderful wonderfully wonders wondrous wooden working worship worshiped "
    + "worshippers worthless worthy wounded written yearim yearling yearlings "
    + "yearning yesterday yielded zalmon zebah zebulun's zion",
  // 695 forms
  1:
      "abandon abashed abhorred abide abides abiding abiram ablaze abode "
    + "abounding about above abundance abundant abyss accept accepted accepts "
    + "acclaim accomplish accomplished accord according account accounts accuse "
    + "accused accuser accusers acknowledge acknowledged acquit across address "
    + "admonished adoption adorned adulterers advance advanced afar affairs "
    + "afflicted affliction afraid again against aggressors ago ahead alarm "
    + "alas alike alive allotted allow allowed almighty aloft alone along aloof "
    + "aloud already although amen amend amidst among anew announce announces "
    + "announcing annul anoint anointed another apart appalled appeal appealed "
    + "appear appoint appointed apportioned approach arise arose around arouse "
    + "arranged arrived ascended ascribe ashamed aside asleep assail assailants "
    + "assailed assemble assembled assembly assistance assume assumed assured "
    + "assyria astray asunder attack attackers attain attend attentive attire "
    + "authority avenge avenger avenging averted avoid await awake away became "
    + "because become becomes bedecked bedew befallen befalls befell befits "
    + "before befriend beginning begot begotten begun beheld behind behold "
    + "believe believed belong belongs beloved below beneath beset besets "
    + "beside besides besiege besiegers bestow bestowed bestows betray betrayed "
    + "between blasphemes captivity collapse collects command commanded "
    + "commandments commands commit committed companion companions compare "
    + "compassion compassionate complained complaint complete completely "
    + "conceal concealed conceit conceived conceives concern condemn condemned "
    + "conducts confess confirm confirmed conforming confront confronted "
    + "confuse confusion congealed consider considered considers consigned "
    + "console consoled consolers consoling conspire consult consume consumed "
    + "consumes contain contempt contend contenders content continually "
    + "continue contrite conveys correction corrupt corruption decay deceit "
    + "deceitful deceitfully deceptive decide decision declare declared decree "
    + "decreed decrees defeat defeats defend defender defense defied defiled "
    + "defy delay delight delights deliver deliverance delivered delivers "
    + "demise depart departing departure depraved deride derides descend "
    + "descendants descended deserve designs desirable desire desired desires "
    + "despise despised despoiled destroy destroyed destroyer destruction "
    + "destructive detect deter detest detests devise devour devoured devouring "
    + "devours directed directs disaster discard discern discernment disdain "
    + "disease diseases disgrace disgraced dishonest dishonor dishonored "
    + "disjointed dismayed dismiss dispatch disperse display disputes distort "
    + "distress divide divided dividing divine domain dominion dominions "
    + "egyptians elect elite embittered embrace encamp encamped encircle "
    + "encircled enclosed endow endowed endure endured endures engulf engulfed "
    + "enjoyed enough enrobed enroll enthroned entrap entreat entrust entrusted "
    + "enwrapped equality escape escaped escorted espoused establish "
    + "established establishes eternal eternally eternity ethiopia ethiopian "
    + "exalt exalted exalts examine example exchanged exhausted exist exists "
    + "explain extend extol extolled exult exults fidelity forever forevermore "
    + "forgave forget forgetful forgets forgive forgiven forgiveness forgives "
    + "forgiving forgot forgotten forlorn forsake forsaken foundation "
    + "foundations fulfill fulfilling fulfills herself himself ihey illumine "
    + "illusion immensity immovable impart imparts implore imprisoned impurity "
    + "incited incline increase increased increases increasing indeed inflict "
    + "inflicted inform inhabit inhabitants inherit inheritance iniquities "
    + "iniquity injustice inquire inside inspects instead instruct instruction "
    + "insult insulted integrity intense intent invaded invades invincible "
    + "invisible invoke invoked jerusalem jerusalem's lament leviathan "
    + "leviathan's majestic malign manasseh mankind melchizedek memorial "
    + "midcourse misfortune musicians myself neglected obedient obey obeyed "
    + "oblation oblivion observe observed obtain occasion offense offenses "
    + "oppose oppress oppressed oppression oppressor oppressors ordained "
    + "ourselves outdo patrol perdition perfection performed persist perverse "
    + "philistia polluted possess possessed possession possessions posterity "
    + "prefer prepare prepared prepares preparing preserve preserved preserves "
    + "presumption prevail prevailed proceed procession proclaim proclaimed "
    + "proclaims produce production profaned professes profound prosperity "
    + "protect protection protects protrude provide provided provides provision "
    + "provoke provoked pursue pursued pursuers pursues rebel rebelled "
    + "rebellious rebuild rebuilt rebuke rebuked recall receive received "
    + "receiving recite recoil recoils recorded recount recounting recounts "
    + "redeem redeemed redeemer redeems redemption redress reduce reduced "
    + "refined reflections reflects refused refuses regard regarded reject "
    + "rejected rejects rejoice rejoiced rejoices rejoicing release released "
    + "relented relief relies relieve remain remains remember remembered "
    + "remembering remembers remembrance remitted remove removed renew renewing "
    + "renews renown renowned repaid repair repay repays repent reply repose "
    + "reprieve reproach reprove resist resound resounding resplendent restore "
    + "restored restrain restraining result retained retreat return returned "
    + "returning revealed reveals revere revered revile revive revives reward "
    + "rewarded salvation secure security severely sincere sincerity stability "
    + "stouthearted subdue subdued subdues subjection succeed success support "
    + "supports suppress surprise surround surrounded surrounding surrounds "
    + "survivors sustain sustains thanksgiving themselves therein throughout "
    + "today together tranquility transformed transgress transgressed "
    + "transgression transgressions transgressors traversed unable unborn "
    + "unbridle unceasing unending unfaithful unformed ungodly unharmed "
    + "unheeded unjust unjustly unknown unmoved unshaken unsheathed until "
    + "untoiled untroubled unwearied unwise upheld uphold upholds upon uproot "
    + "uprooted uprooting whatever whenever wherever withdraw withdrawn "
    + "withheld withhold within without yourself zalmunna",
  // 35 forms
  2:
      "alleluia anymore azariah comprehends consolation everlasting exaltation "
    + "foretold generation generations hananiah immortality intervened overcome "
    + "overflow overflowing overflows overrun overtake overtook overwhelm "
    + "overwhelms principalities recapitulate revelation supplication "
    + "tambourines understand understanding understands unintelligent "
    + "unprovoked vindication visitation wholeheartedly",
  // 1 forms
  3:
      "imagination",
};

/** word → the syllable that carries the stress. */
export const ENGLISH_STRESS: ReadonlyMap<string, number> = new Map(
  Object.entries(BY_SYLLABLE).flatMap(([syllable, words]) =>
    words.split(' ').map(word => [word, Number(syllable)] as [string, number]),
  ),
);

/**
 * Words the psalters accent less than 30% of the time,
 * out of at least 3 chances: the articles, prepositions,
 * conjunctions, auxiliaries, and every pronoun and possessive.
 *
 * A line of psalmody carries two or three accents out of about seven words, so
 * a word pointed one time in ten is one the cadence should pass over. Asking
 * instead whether a word is EVER accented gave a list of fourteen and put the
 * mediant's accents in the right place 32.7% of the time; this gives 81.0%.
 *
 * Consulted only for text that carries no acutes of its own.
 */
export const ENGLISH_RARELY_ACCENTED: ReadonlySet<string> = new Set(
  (
     "a after am amid an and are as at be bearing been both brings burnt but "
   + "by can commands could craved cut decrees despite did do does draw dry "
   + "each every fidelity finds finest for founded from gave give giving go "
   + "god's goes gushed had has have he her him his holds how i if in insects "
   + "into is it its keeps law lest let like loving makes making may me most "
   + "must my next no nor not o obey of often on ones or ot our over pilgrim "
   + "plains precepts promise provoked psalm rahab rained refused safely sat "
   + "shall she shed should skillful so some someone sought statutes stray "
   + "strayed stringed sworn takes than that the their them then these they "
   + "though through till to too toward underfoot until unto us very violate "
   + "we were what when where which while who whose will with without would "
   + "yes yet you your zoan"
  ).split(' '),
);
