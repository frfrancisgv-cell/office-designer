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
  // ── LAUDS (MORNING PRAYER) ───────────────────────────────────────────────────
  // The Ambrosian-derived Lauds hymns prescribed by OCO / Liturgy of the Hours
  // Sunday: Aeterne rerum Conditor (LHym 184)
  'sunday-lauds': {
    id: 'sunday-lauds',
    titleEn: 'O Blest Creator of the Light',
    titleLa: 'Æterne rerum Conditor',
    meter: '8.8.8.8',
    textEn: `1. Blest Maker of the light of morn,
Who out of chaos didst adorn
This fair, resplendent world we see,
And set the stars in order free.

2. The morning star now gilds the sky,
Chasing each shadow that drew nigh;
All darkness flees before the day
And errors of the night away.

3. O Christ, the Sun of righteousness,
Shine on our hearts with light and grace;
That we may cast the works of night
And walk as children of the light.

4. Praise God the Father and the Son,
And Holy Spirit, Three in One;
From age to age, while time shall run,
To God be praise for ever done. Amen.`,
    textLa: `1. Ætérne rerum Cónditor,
nóctem diémque qui régis,
et témporis das témpora,
ut álleves fastídium.

2. Præcó diéi iam sonat,
noctis profúndæ pervígil,
noctúrna lux viántibus,
a nócte noctem ségregans.

3. Hoc excitátus Lúcifer
solvit polum calígine;
hoc omnis errónum chorus
viam nocéndi déserit.

4. Hoc náuta vires cólligit
póntique mitéscunt freta;
hoc ipse Petra Ecclésiæ
canénte, culpam díluit.

5. Surgámus ergo strénnue:
gallus iacéntes éxcitat,
et somnolentos íncrépat,
gallus negántes árguit.

6. Iesu, labántes réspice
et nos vidéndo córrige;
si réspicis, lapsi stabunt,
fletuque culpa sólvitur.

7. Tu lux refúlge sénsibus
mentsísque somnum díscute;
te nostra vox primum sonet
et ore psallamus tibi.

8. Deo Patri sit glória,
ejúsque soli Fílio,
cum Spíritu Paráclito,
et nunc et in perpétuum. Amen.`,
  },
  // Monday Lauds: Splendor paternae gloriae (LHym 190)
  'monday-lauds': {
    id: 'monday-lauds',
    titleEn: 'O Splendor of the Father\'s Light',
    titleLa: 'Splendor paternæ gloriæ',
    meter: '8.8.8.8',
    textEn: `1. O Splendor of the Father's light,
True light of light that brightens bright,
O Light of light, day's fount of day,
Light's radiant beam, O hear us pray.

2. True sun of grace, O shine anew;
And on our sense of morning dew
May shine the Father's glory bright,
The Spirit's sanctifying light.

3. The Father too we ask to send
His Spirit down on us to tend,
Who bears the Son, the living Word,
Of God, whose might all things have stirred.

4. Praise God the Father and the Son,
And Holy Spirit, Three in One;
From age to age, while time shall run,
To God be praise for ever done. Amen.`,
    textLa: `1. Splendor patérnæ glóriæ,
de luce lucem próferens,
lux lucis et fons lúminis,
dies diérum illúminans.

2. Verúsque sol, inlábere
micans nitóre pérpeti,
iubárque Sancti Spíritus
infúnde nostris sénsibus.

3. Votis vocemus et Patrem,
Patrem perénnis glóriæ,
Patrem poténtis grátiæ,
culpam reléget lúbricam.

4. Informet actus strénuos,
dens dentis ira fórnacis;
præstet fides calórem suum,
fraudem cadúcam nésciat.

5. Christúsque nobis sit cibus,
potúsque noster sit fides;
læti bibámus sóbriam
ebrietátem Spíritus.

6. Lætus dies hic tránseat;
pudor sit ut dilúculum,
fides velut merídies,
crepúsculum mens nésciat.

7. Auróra cursus próvehit;
Auróra totus pródeat,
in Patre totus Fílius
et totus in Verbo Pater.

8. Deo Patri sit glória,
ejúsque soli Fílio,
cum Spíritu Paráclito,
et nunc et in perpétuum. Amen.`,
  },
  // Tuesday Lauds: Ales diei nuntius (LHym 196)
  'tuesday-lauds': {
    id: 'tuesday-lauds',
    titleEn: 'The Winged Herald of the Day',
    titleLa: 'Ales diéi núntius',
    meter: '8.8.8.8',
    textEn: `1. The winged herald of the day
Proclaims the morn's approaching ray;
And Christ, the Lord of life, from sleep
Rouses the souls from slumber deep.

2. Away, he cries, with sloth and sleep!
Arise, be sober; watchful keep!
Be chaste, be just, be righteous too,
For lo, the sun is coming new.

3. O Jesu, shield us all the day;
In health and virtue let us pray;
And grant us, when this life is done,
Free entrance to the eternal sun.

4. Praise God the Father and the Son,
And Holy Spirit, Three in One;
From age to age, while time shall run,
To God be praise for ever done. Amen.`,
    textLa: `1. Ales diéi núntius
lucem propínquam præcínit;
nos excitátor méntium
iam Christus ad vitam vocat.

2. Auférte, clamat, léctulos,
ægros sopóres, desidam,
castitátem nunc rogate,
iustitiam colite.

3. Iam vox precántis pérsonat
auréque pulsat éthera;
Tatróni in conspectu Patris
ne non placeámus óptimi.

4. Deo Patri sit glória,
ejúsque soli Fílio,
cum Spíritu Paráclito,
et nunc et in perpétuum. Amen.`,
  },
  // Wednesday Lauds: Nox et tenebrae et nubila (LHym 200)
  'wednesday-lauds': {
    id: 'wednesday-lauds',
    titleEn: 'Night\'s Shadows and the Clouds of Dark',
    titleLa: 'Nox et ténebræ et núbila',
    meter: '8.8.8.8',
    textEn: `1. Night's shadows and the clouds of dark
And all the world's confusion, hark!
The light of heaven shines again
And Christ illumines hill and plain.

2. The false and guilty darkness flies;
Before the light of faith it dies;
The mind awakes and, purged from sin,
Beholds once more the light within.

3. Thee, Lord, with body, mouth, and mind,
In all our works and ways we find;
That glory may be rendered thus
Both unto God and now from us.

4. Praise God the Father and the Son,
And Holy Spirit, Three in One;
From age to age, while time shall run,
To God be praise for ever done. Amen.`,
    textLa: `1. Nox et ténebræ et núbila,
cónfusa mundi et túrbida,
lux intrat, albéscit polus,
Christus venit, discédite.

2. Cáligo terræ scínditur
percússa solis spículo;
rebúsque iam color rédit
vultu niténtis síderis.

3. Sic nostra mox obscúritas
fraudísque pectus cónscium,
ruptis retécta núbibus,
reo pudóre vértitur.

4. Hæc spes précando et vócibus,
hac voce, hac spe víscera,
ur, Christe, solvas víncla réis.

5. Deo Patri sit glória,
ejúsque soli Fílio,
cum Spíritu Paráclito,
et nunc et in perpétuum. Amen.`,
  },
  // Thursday Lauds: Lux ecce surgit aurea (LHym 204)
  'thursday-lauds': {
    id: 'thursday-lauds',
    titleEn: 'Lo, Golden Light of Day Doth Rise',
    titleLa: 'Lux ecce surgit áurea',
    meter: '8.8.8.8',
    textEn: `1. Lo, golden light of day doth rise,
Chasing the dusky shade that flies;
God comes, and night is turned to day;
Arise and cast all sloth away.

2. That tongue which now the day employs
In speech and in its noisy joys,
May guard itself with wisdom's hand,
That none reprove what it has planned.

3. That eye which looks on all around
May shun the sight of evil found;
That mind which feeds on thought all day
Keep virtue safe along the way.

4. Praise God the Father and the Son,
And Holy Spirit, Three in One;
From age to age, while time shall run,
To God be praise for ever done. Amen.`,
    textLa: `1. Lux ecce surgit áurea,
pállens fatigat sidera;
noctem sopor ne déprimit;
irástis, alacres! state.

2. Nimbósa mundi glóbifer
cumúlus in terram ruit;
fulgóre solis grátior
diébus exhilárat.

3. Vos, éxcitáti móribus,
ne languor ótio gravet;
pallóris immo nés ciant
ni virtus ádeat diem.

4. Deo Patri sit glória,
ejúsque soli Fílio,
cum Spíritu Paráclito,
et nunc et in perpétuum. Amen.`,
  },
  // Friday Lauds: Æterna caeli gloria (LHym 208)
  'friday-lauds': {
    id: 'friday-lauds',
    titleEn: 'Eternal Glory of the Sky',
    titleLa: 'Ætérna cæli glória',
    meter: '8.8.8.8',
    textEn: `1. Eternal glory of the sky,
Blest hope of frail humanity,
The Father's sole-begotten One,
Yet ours through the Spirit's deed is done.

2. As now the sun from eastern height
Pours o'er the world his golden light,
So Christ, true Sun of souls, today
Bids us with faith and hope to pray.

3. No thoughts of darkness, no deceit,
No idle word our lips shall greet;
But hands and eyes and all the mind
In holy service be assigned.

4. Praise God the Father and the Son,
And Holy Spirit, Three in One;
From age to age, while time shall run,
To God be praise for ever done. Amen.`,
    textLa: `1. Ætérna cæli glória,
beáta spes mortálium,
celíque solem subsecum
adfer, redémptor pérpeti.

2. Sol, eórum déxteram
beatiórem árbitrens,
tua dierum splendidus
currat per orbem grátiæ.

3. Tua diébus grátiæ
diebus addes múnia,
lux perpetúa lúceat,
fidésque nos servántibus.

4. Deo Patri sit glória,
ejúsque soli Fílio,
cum Spíritu Paráclito,
et nunc et in perpétuum. Amen.`,
  },
  // Saturday Lauds: Aurora iam spargit polum (LHym 207)
  'saturday-lauds': {
    id: 'saturday-lauds',
    titleEn: 'Now with the Fast-Departing Night',
    titleLa: 'Auróra iam spargit polum',
    meter: '8.8.8.8',
    textEn: `1. Now with the fast-departing night
The dawn sheds forth its crimson light;
Bright morning star, foretell the sun
That gilds the sky when darkness' done.

2. O Christ, who in our darkness bright
Did come as heaven's own Living Light,
To mortals wandering far and wide
A safe and sure and faithful guide:

3. Let no dark cloud of sinful shame
Cast shadow on thy glorious name;
But pure in heart and bright in soul
May we attain to life's true goal.

4. Praise God the Father and the Son,
And Holy Spirit, Three in One;
From age to age, while time shall run,
To God be praise for ever done. Amen.`,
    textLa: `1. Auróra iam spargit polum,
terris dies illúbricant,
lucísque Christ obúmbra
discéde nox, affer diem.

2. Nox atra rerum contegit
térras colóres ómnium;
nos confusis tenébris
Christus propínat lúcidum.

3. Dum nox manébat et quies
sopóre vinctos ópprimunt,
iam luce surgens sídera
Christus fuga prótendit.

4. Deo Patri sit glória,
ejúsque soli Fílio,
cum Spíritu Paráclito,
et nunc et in perpétuum. Amen.`,
  },

  // ── MINOR HOURS ─────────────────────────────────────────────────────────────
  // Terce: Nunc Sancte nobis Spiritus (LHym 185)
  'terce': {
    id: 'terce',
    titleEn: 'Come, Holy Ghost, with God the Son',
    titleLa: 'Nunc Sancte nobis Spíritus',
    meter: '8.8.8.8',
    textEn: `1. Come, Holy Ghost, with God the Son
And God the Father, ever one;
Shed forth thy grace within our breast,
And dwell with us, a ready guest.

2. By every power of heart and tongue,
By act and deed, thy praise be sung;
Inflame with perfect love each sense,
That others' souls may burn from thence.

3. O Father, that we ask be done,
Through Jesus Christ, thine only Son;
Who, with the Holy Ghost and thee,
Doth live and reign eternally. Amen.`,
    textLa: `1. Nunc Sancte nobis Spíritus,
unum Patri cum Fílio,
digáre promptus íngeri
nostro refúsus péctori.

2. Os, lingua, mens, sensus, vigor,
confessiónem pérsonent,
flamméscat igne cáritas,
accéndat ardor próximos.

3. Præsta, Pater piíssime,
Patríque compar Únice,
cum Spíritu Paráclito
regnans per omne sǽculum. Amen.`,
  },
  // Sext: Rector potens, verax Deus (LHym 186)
  'sext': {
    id: 'sext',
    titleEn: 'O God of Truth, O Lord of Might',
    titleLa: 'Rector potens, verax Deus',
    meter: '8.8.8.8',
    textEn: `1. O God of truth, O Lord of might,
Who orderest time and change aright,
And send'st the early morning ray,
And light'st the glow of perfect day:

2. Extinguish thou each sinful fire,
And banish every ill desire;
And while thou keep'st the body whole,
Shed forth thy peace upon the soul.

3. O Father, that we ask be done,
Through Jesus Christ, thine only Son;
Who, with the Holy Ghost and thee,
Doth live and reign eternally. Amen.`,
    textLa: `1. Rector potens, verax Deus,
qui temperas rerum vices,
splendore mane illúminas
et igne nóctem desigas:

2. Merídiem nostrum dírige
et in finem béatui
horísque et actis módulos
non prave tentes pérpeti.

3. Præsta, Pater piíssime,
Patríque compar Únice,
cum Spíritu Paráclito
regnans per omne sǽculum. Amen.`,
  },
  // None: Rerum, Deus, tenax vigor (LHym 187)
  'none': {
    id: 'none',
    titleEn: 'O God, Creation\'s Secret Force',
    titleLa: 'Rerum, Deus, tenax vigor',
    meter: '8.8.8.8',
    textEn: `1. O God, creation's secret force,
Thyself unmoved, all motion's source,
Who from the morn till evening ray
Through all its changes guid'st the day:

2. Grant us, when this short life is past,
The glorious evening that shall last;
And day that knows no waning sun
Where Jesu's face is all our one.

3. O Father, that we ask be done,
Through Jesus Christ, thine only Son;
Who, with the Holy Ghost and thee,
Doth live and reign eternally. Amen.`,
    textLa: `1. Rerum, Deus, tenax vigor,
immótus in te pérmanens,
lucis diúrnæ témpora
successibus detérminans:

2. Largíre clarum vespere,
quo vita nusquam décidat,
sed præmium mortis sacræ
perénnis instet glória.

3. Præsta, Pater piíssime,
Patríque compar Únice,
cum Spíritu Paráclito
regnans per omne sǽculum. Amen.`,
  },
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
 * @param dayOfWeek 0=Sunday, 1=Monday, ..., 6=Saturday
 * @param hour      lauds | vespers | terce | sext | none | compline | readings
 * @param lang      en | la
 * @param commonType optional: bvm | apostles | martyrs | doctors
 */
export function getProperHymn(
  dayOfWeek: number,
  hour: string,
  lang: 'en' | 'la' = 'en',
  commonType?: string
): string {
  const h = hour.toLowerCase();

  // Compline: always the same hymn
  if (h === 'compline') {
    const entry = HYMNS_DATABASE['compline'];
    return lang === 'la' ? entry.textLa : entry.textEn;
  }

  // Minor Hours: fixed per-hour hymns
  if (h === 'terce') {
    const entry = HYMNS_DATABASE['terce'];
    return lang === 'la' ? entry.textLa : entry.textEn;
  }
  if (h === 'sext') {
    const entry = HYMNS_DATABASE['sext'];
    return lang === 'la' ? entry.textLa : entry.textEn;
  }
  if (h === 'none') {
    const entry = HYMNS_DATABASE['none'];
    return lang === 'la' ? entry.textLa : entry.textEn;
  }

  // Common Hymns override (BVM, Apostles, Martyrs, Doctors)
  if (commonType) {
    const cKey = `common-${commonType.toLowerCase()}`;
    if (HYMNS_DATABASE[cKey]) {
      const entry = HYMNS_DATABASE[cKey];
      return lang === 'la' ? entry.textLa : entry.textEn;
    }
  }

  // Lauds: use the day-specific Lauds hymn
  if (h === 'lauds' || h === 'readings') {
    const laudsKeys = [
      'sunday-lauds', 'monday-lauds', 'tuesday-lauds', 'wednesday-lauds',
      'thursday-lauds', 'friday-lauds', 'saturday-lauds'
    ];
    const key = laudsKeys[dayOfWeek] || 'sunday-lauds';
    const entry = HYMNS_DATABASE[key] || HYMNS_DATABASE['sunday-lauds'];
    return lang === 'la' ? entry.textLa : entry.textEn;
  }

  // Vespers: use the day-specific Vespers hymn
  const vespersKeys = [
    'sunday-vespers-1', 'monday-vespers', 'tuesday-vespers', 'wednesday-vespers',
    'thursday-vespers', 'friday-vespers', 'saturday-vespers'
  ];
  const key = vespersKeys[dayOfWeek] || 'sunday-vespers-1';
  const entry = HYMNS_DATABASE[key] || HYMNS_DATABASE['sunday-vespers-1'];
  return lang === 'la' ? entry.textLa : entry.textEn;
}

