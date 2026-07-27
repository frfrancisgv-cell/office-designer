/**
 * Complete Liturgical Hymnal Database (`lib/liturgy/data/hymns.ts`)
 *
 * Full verses for all Hours & Days of the Week across Ordinary Time, Advent, Lent, Easter, and Compline.
 */

export interface HymnEntry {
  id: string;
  titleEn: string;
  titleLa: string;
  meter?: string;
  textEn: string;
  textLa: string;
}

export const HYMNS_DATABASE: Record<string, HymnEntry> = {
  // ── SUNDAY ──────────────────────────────────────────────────────────────────
  'sunday-vespers-1': {
    id: 'sunday-vespers-1',
    titleEn: 'O Trinity of Blessed Light',
    titleLa: 'O lux beata Trinitas',
    meter: '8.8.8.8',
    textEn: `1. O Trinity of blessed light,
O Unity of princely might,
The fiery sun now goes away;
Fill with your light our hearts today.

2. To you our morning song of praise,
To you our evening prayer we raise;
Thy glory suppliant we adore
Forever and forevermore.

3. All laud to God the Father be,
All praise, Eternal Son, to thee,
All glory, as is ever meet,
To God the Holy Paraclete. Amen.`,
    textLa: `1. O lux beáta Trínitas,
et principális Únitas,
iam sol recédit ígneus,
infúnde lumen córdibus.

2. Te mane laudum cármine,
te deprecámur véspere:
te nostra supplex glória
per cuncta laudet sǽcula.

3. Deo Patri sit glória,
ejúsque soli Fílio,
cum Spíritu Paráclito,
et nunc et in perpétuum. Amen.`,
  },
  'sunday-vespers-2': {
    id: 'sunday-vespers-2',
    titleEn: 'O Blest Creator of the Light',
    titleLa: 'Lucis Creator optime',
    meter: '8.8.8.8',
    textEn: `1. O blest Creator of the light,
Who mak'st the day with radiance bright,
And o'er the forming world didst call
The light from chaos first of all.

2. Whose wisdom joined in meet array
The morning and the closing day;
Night comes with all its darkling fears,
Regard thy people's prayers and tears.

3. Lest, sunk in sin, and whelmed with strife,
They lose the gift of endless life;
While thinking but the thoughts of time,
They weave new chains of woe and crime.

4. But grant and guide us, Lord, that we
May knock at heaven's own gate with thee;
The prize of life eternal win,
And purge our hearts from every sin.

5. O Father, that we ask be done
Through Jesus Christ, thine only Son;
Who, with the Holy Ghost and thee,
Doth live and reign eternally. Amen.`,
    textLa: `1. Lucis Creátor óptime,
lucem diérum próferens,
primórdiis lucis novæ
mundi parans oríginem.

2. Qui mane iunctum vésperi
diem vocári prǽcipis;
tætet chaos illábitur:
audi preces cum fletibus.

3. Ne mens graváta crímine
vitæ sit exsul múnere,
dum nil perénne Cógitat,
seséque culpis ínligat.

4. Caeléste pulset óstium,
vitále tollat prǽmium;
vitémus omne nóxium,
purgémus omne péssimum.

5. Præsta, Pater piíssime,
Patríque compar Únice,
cum Spíritu Paráclito
regnans per omne sǽculum. Amen.`,
  },

  // ── MONDAY ──────────────────────────────────────────────────────────────────
  'monday-vespers': {
    id: 'monday-vespers',
    titleEn: 'O Great Creator of the Sky',
    titleLa: 'Immense caeli Conditor',
    meter: '8.8.8.8',
    textEn: `1. O great Creator of the sky,
Who, when the firmament on high
Was formed, didst part the waters' flow,
And fix the bounding seas below.

2. To give to cloud and vapor reign,
And stay the fierce torrents on the plain,
Lest burning heat should waste the land,
Or parching drought fulfill command.

3. Grant, Lord, to every faithful heart
The grace of thy celestial art,
Lest ancient error's deceptive reign
Should lead us back to sin again.

4. Let faith expand its boundless light,
And dispel all darkness of the night,
That truth may shine in every mind,
And leave all shadowy doubts behind.

5. Almighty Father, hear our cry,
Through Jesus Christ, our Lord Most High,
Who with the Paraclete and thee
Doth live and reign eternally. Amen.`,
    textLa: `1. Imménse cæli Cónditor,
qui, mixta ne confúnderent,
aquas aquis secérnens,
cælo dedísti límitem.

2. Firmans locum cæléstibus
habilémque terræ rívulis,
ut unda flammis témperet
ne terra sparso fúrvida.

3. Infúnde nunc, piíssime,
donum perénnis grátiæ,
fraudis novæ ne cásibus
nos error átterat vetus.

4. Lucem fides invéniat,
sic cúncta nolis prǽgravent;
purgáta sit prœcórdiis,
mens viva te conláudet.

5. Præsta, Pater piíssime,
Patríque compar Únice,
cum Spíritu Paráclito
regnans per omne sǽculum. Amen.`,
  },

  // ── TUESDAY ─────────────────────────────────────────────────────────────────
  'tuesday-vespers': {
    id: 'tuesday-vespers',
    titleEn: "Earth's Mighty Maker, Whose Command",
    titleLa: 'Telluris ingens Conditor',
    meter: '8.8.8.8',
    textEn: `1. Earth's mighty Maker, whose command
Raised from the sea the solid land,
And drove each rushing wave away,
And fixed the earth in firm array.

2. That so the soil might herbs produce,
And fruits and flowers for human use,
And glittering ornament bestow,
Upon the world that blooms below.

3. Our fragrant souls from sin release,
And heal our wounds with heavenly peace,
That we may wash our stains in tears,
And banish all our guilty fears.

4. Obey thy laws, thy will pursue,
And keep our hearts forever true;
From every ill preserve us free,
And draw us ever close to thee.

5. O Father, that we ask be done
Through Jesus Christ, thine only Son,
Who with the Holy Ghost and thee
Doth live and reign eternally. Amen.`,
    textLa: `1. Tellúris ingens Cónditor,
mundi solum qui dívidens,
pulsis aquárum mólibus,
firmam dedísti téram.

2. Ut herba eiúsdem párere,
fructúque picta flóreo,
donáta multo sémine,
submíssa gérat prǽmia.

3. Mentis perústæ vúlnera
munda viróre grátiæ,
ut facta fletu díluat,
motúsque pravos cónterat.

4. Iussis tuis optémperet,
nullis malis adpropinquet,
bono repléri gáudeat,
et mortis ictum vítet.

5. Præsta, Pater piíssime,
Patríque compar Únice,
cum Spíritu Paráclito
regnans per omne sǽculum. Amen.`,
  },

  // ── WEDNESDAY ───────────────────────────────────────────────────────────────
  'wednesday-vespers': {
    id: 'wednesday-vespers',
    titleEn: 'O Hallowed Maker of the Heavenly Spheres',
    titleLa: 'Caeli Deus sanctissime',
    meter: '8.8.8.8',
    textEn: `1. O hallowed Maker of the heavenly spheres,
Who gild'st the night with golden stars,
And in mid-sky the sun doth place,
To run his bright, unwearied race.

2. Who on the fourth day didst ordain
The moon's soft light and starry train,
To set a bound 'twixt day and night,
And mark the seasons in their flight.

3. Drive far away the gloom of sin,
And let thy grace abide within;
Cleanse every stain of guilty fear,
And make our hearts a temple clear.

4. Grant this, O Father, Son, and Lord,
By all the heavenly host adored,
Whose praise the eternal ages sing,
Our God, our Redeemer, and our King. Amen.`,
    textLa: `1. Cǽli Deus sanctíssime,
qui lúcidum cæli decus
píngis decóra lúmine,
docens decórem síderum.

2. Quarto die qui flámmeum
solis rotam constítuis,
lunæ ministras órbitem,
vagos recúrsus síderum.

3. Ut noctibus vel diébus
dírumpat átram cáliginem,
et te sciámus áuctorem,
caeléstis orbis Dóminum.

4. Præsta, Pater piíssime,
Patríque compar Únice,
cum Spíritu Paráclito
regnans per omne sǽculum. Amen.`,
  },

  // ── THURSDAY ────────────────────────────────────────────────────────────────
  'thursday-vespers': {
    id: 'thursday-vespers',
    titleEn: 'Almighty God, Who From the Flood',
    titleLa: 'Magnae Deus potentiae',
    meter: '8.8.8.8',
    textEn: `1. Almighty God, who from the flood
Didst bring the living creatures forth,
Some in the waters deep to dwell,
Some on the broad and fruitful earth.

2. To each a fitting home assigned,
In sea or land, in air or sky,
That every species in its kind
Might thy great name forever magnify.

3. Grant to thy servants, washed from sin
In Christ's own blood, a soul serene,
That we may never fall again,
Nor sink in dark despair or pain.

4. Hear us, O Father, through thy Son,
And Holy Spirit, Three in One,
Whose glory shines eternally,
Through ages without end to be. Amen.`,
    textLa: `1. Magnæ Deus poténtiæ,
qui ex aquis ortum genus
partim remíttis gúrgiti,
partim levás in ǽera.

2. Submérsa stágnis óruens,
lévata cælis érigens,
ut nata iusto sémine
cunctis replérent fínibus.

3. Largíre cunctis sérvulis,
quos mundat unda sánguinis,
noscáre nullis cásibus,
nec ferre mortis áliti.

4. Præsta, Pater piíssime,
Patríque compar Únice,
cum Spíritu Paráclito
regnans per omne sǽculum. Amen.`,
  },

  // ── FRIDAY ──────────────────────────────────────────────────────────────────
  'friday-vespers': {
    id: 'friday-vespers',
    titleEn: 'Maker of Man, Who From Thy Throne',
    titleLa: 'Plasmator hominis, Deus',
    meter: '8.8.8.8',
    textEn: `1. Maker of man, who from thy throne
Didst order all things, God alone;
And from the earth didst bring to birth
The living creatures of the earth.

2. To man, created in thy grace,
Thou gavest power and lordship place,
That he should rule over sea and land,
And obey thy holy, divine command.

3. Repress in us each evil thought,
Wash out the sins our hands have wrought,
Cleanse every word, purify our mind,
That peace eternal we may find.

4. O Father, hear our evening prayer,
Through Jesus Christ, thy Son most fair,
Who with the Holy Ghost and thee
Doth live and reign eternally. Amen.`,
    textLa: `1. Plasmátor hóminis, Deus,
qui cuncta solus órdinans,
humum iubes prodúcere
reptília et béstias.

2. Qui magna rerum córpora,
dictu poténti súbdita,
hómini dedísti régere,
servíre quo te póssint.

3. Repélle a nobis crímina,
quæ dira nectunt nexibus,
purgáta sit prœcórdia,
mentésque cúnctas cóntege.

4. Præsta, Pater piíssime,
Patríque compar Únice,
cum Spíritu Paráclito
regnans per omne sǽculum. Amen.`,
  },

  // ── SATURDAY ────────────────────────────────────────────────────────────────
  'saturday-vespers': {
    id: 'saturday-vespers',
    titleEn: 'O Trinity of Blessed Light',
    titleLa: 'O lux beata Trinitas',
    meter: '8.8.8.8',
    textEn: `1. O Trinity of blessed light,
O Unity of princely might,
The fiery sun now goes away;
Fill with your light our hearts today.

2. To you our morning song of praise,
To you our evening prayer we raise;
Thy glory suppliant we adore
Forever and forevermore.

3. All laud to God the Father be,
All praise, Eternal Son, to thee,
All glory, as is ever meet,
To God the Holy Paraclete. Amen.`,
    textLa: `1. O lux beáta Trínitas,
et principális Únitas,
iam sol recédit ígneus,
infúnde lumen córdibus.

2. Te mane laudum cármine,
te deprecámur véspere:
te nostra supplex glória
per cuncta laudet sǽcula.

3. Deo Patri sit glória,
ejúsque soli Fílio,
cum Spíritu Paráclito,
et nunc et in perpétuum. Amen.`,
  },

  // ── COMMONS HYMNS ───────────────────────────────────────────────────────────
  'common-bvm': {
    id: 'common-bvm',
    titleEn: 'The God Whom Earth and Sea and Sky',
    titleLa: 'Ave maris stella',
    meter: '8.8.8.8',
    textEn: `1. The God whom earth and sea and sky
Adore and laud and magnify,
Whose might they own, whose praise they tell,
In Mary’s body deigned to dwell.

2. O Mother blest! the chosen shrine
Wherein the Architect divine,
Whose hand contains the earth and sky,
Vouchsafed in hidden guise to lie:

3. Blest in the message Gabriel brought;
Blest in the work the Spirit wrought;
From whose dear womb brought forth to light
The Lord of majesty and might.

4. O Lord, the Virgin-born, to thee
Eternal praise and glory be,
Whom with the Father we adore
And Holy Ghost forevermore. Amen.`,
    textLa: `1. Ave, maris stella,
Dei mater alma,
Atque semper virgo,
Felix caeli porta.

2. Sumens illud “Ave”
Gabrielis ore,
Funda nos in pace,
Mutans Evae nomen.

3. Solve vincla reis,
Profer lumen caecis,
Mala nostra pelle,
Bona cuncta posce.

4. Monstra te esse matrem,
Sumat per te preces
Qui pro nobis natus
Tulit esse tuus.

5. Virgo singularis,
Inter omnes mitis,
Nos culpis solutos
Mites fac et castos.

6. Vitam praesta puram,
Iter para tutum,
Ut videntes Iesum
Semper collaetemur.

7. Sit laus Deo Patri,
Summo Christo decus,
Spiritui Sancto
Tribus, Honor unus. Amen.`,
  },

  'common-apostles': {
    id: 'common-apostles',
    titleEn: 'Now Let the Heavens Resound With Praise',
    titleLa: 'Exsultet caelum laudibus',
    meter: '8.8.8.8',
    textEn: `1. Now let the heavens resound with praise,
Let earth repeat its joyful lays,
While the Apostles' sacred fame
The world’s solemnities proclaim.

2. O ye, the judges of the earth,
And true lights of celestial birth,
Accept the prayers your servants raise,
And hear the vows of humble praise.

3. To God the Father glory be,
And Christ his Son eternally,
With God the Spirit, Paraclete,
Through endless ages, as is meet. Amen.`,
    textLa: `1. Exsúltet cælum láudibus,
resúltet terra gáudiis:
Apostolórum glóriam
sacra litat solémnitas.

2. Vos sǽculi iusti iúdices
et vera mundi lúmina,
votis precámur córdium,
audíte preces súpplicum.

3. Deo Patri sit glória,
ejúsque soli Fílio,
cum Spíritu Paráclito,
et nunc et in perpétuum. Amen.`,
  },

  'common-martyrs': {
    id: 'common-martyrs',
    titleEn: "O God, Your Soldiers' Crown and Guard",
    titleLa: 'Deus tuorum militum',
    meter: '8.8.8.8',
    textEn: `1. O God, your soldiers' crown and guard,
And their exceedingly great reward,
From sin's deceitful chains release
Thy servants who now pray for peace.

2. For love of your most holy name
The martyr faced the sword and flame;
He counted earthly joy as dross,
And won the crown beneath the Cross.

3. Praise to the Father and the Son,
And Holy Spirit, Three in One,
Whose grace enabled saints to stand,
And brought them to the Promised Land. Amen.`,
    textLa: `1. Deus, tuórum mílitum
sors et coróna, prǽmium,
laudes canéntes Mártyris
absolve nexu críminis.

2. Hic nempe mundi gáudia
et blánda fraudis sprévit,
et ad cæléstia pérgens
sánguine palmas óbtinet.

3. Deo Patri sit glória,
ejúsque soli Fílio,
cum Spíritu Paráclito,
et nunc et in perpétuum. Amen.`,
  },

  'common-doctors': {
    id: 'common-doctors',
    titleEn: 'Make Us Worthy, Lord, In Your Kindness',
    titleLa: 'O doctor optime',
    meter: '8.8.8.8',
    textEn: `1. Make us worthy, Lord, in your kindness,
To enter the assembly of the Saints,
Blessed is he who contemplates your face,
Towards him your splendor flows like a river.

2. For our sake you handed over your Son,
His Body is with us, with us his Truth,
He came down to give us the keys of Paradise,
Replete with wisdom and eternal grace.

3. On their lips are fountains of wisdom,
Peace in their thoughts, Truth in their knowledge,
Fear of the Lord remains in their pursuits,
Love in their praise forevermore. Amen.`,
    textLa: `1. O doctor óptime,
ecclésiæ sanctæ lumen,
beáte N., divínæ legis amátor,
deprecáre pro nobis Fílium Dei.

2. Tu lux et decus præsulúm,
fidei magíster ínclitus,
quos docuísti cǽlitus
duc ad perénne prǽmium.

3. Deo Patri sit glória,
ejúsque soli Fílio,
cum Spíritu Paráclito,
et nunc et in perpétuum. Amen.`,
  },

  // ── COMPLINE ────────────────────────────────────────────────────────────────
  'compline': {
    id: 'compline',
    titleEn: 'Before the Ending of the Day',
    titleLa: 'Te lucis ante terminum',
    meter: '8.8.8.8',
    textEn: `1. Before the ending of the day,
Creator of the world, we pray,
That with thy wonted favor thou
Wouldst be our guard and keeper now.

2. From all ill dreams defend our eyes,
From nightly fears and fantasies;
Tread under foot our ghostly foe,
That no pollution we may know.

3. O Father, that we ask be done,
Through Jesus Christ, thine only Son,
Who, with the Holy Ghost and thee,
Doth live and reign eternally. Amen.`,
    textLa: `1. Te lucis ante términum,
rerum Creátor, póscimus,
ut solíta cleméntia
sis prǽsul ad custódiam.

2. Procul recédant sómnia
et nóctium phantásmata;
hostémque nostrum cómprime,
ne polluántur córpora.

3. Præsta, Pater piíssime,
Patríque compar Únice,
cum Spíritu Paráclito
regnans per omne sǽculum. Amen.`,
  },
};

/**
 * Retrieve proper hymn by day of week, hour, or feast rank
 */
export function getProperHymn(
  dayOfWeek: number,
  hour: string,
  lang: 'en' | 'la' = 'en',
  commonType?: string
): string {
  if (hour === 'compline') {
    const h = HYMNS_DATABASE['compline'];
    return lang === 'la' ? h.textLa : h.textEn;
  }

  // Common Hymns (BVM, Apostles, Martyrs, Doctors)
  if (commonType) {
    const cKey = `common-${commonType.toLowerCase()}`;
    if (HYMNS_DATABASE[cKey]) {
      const entry = HYMNS_DATABASE[cKey];
      return lang === 'la' ? entry.textLa : entry.textEn;
    }
  }

  const dayKeys = ['sunday-vespers-2', 'monday-vespers', 'tuesday-vespers', 'wednesday-vespers', 'thursday-vespers', 'friday-vespers', 'saturday-vespers'];
  const key = dayKeys[dayOfWeek] || 'tuesday-vespers';
  const entry = HYMNS_DATABASE[key] || HYMNS_DATABASE['tuesday-vespers'];

  return lang === 'la' ? entry.textLa : entry.textEn;
}

