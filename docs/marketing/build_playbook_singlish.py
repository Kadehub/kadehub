"""Builds docs/marketing/KadeHub-Content-Creator-Playbook-Singlish.pdf (Singlish edition).

Run from anywhere:  python docs/marketing/build_playbook_singlish.py
Same facts and layout as the English edition (build_playbook.py); copy is Sinhala written
in English letters, mixed with English the way shop owners and creators actually talk.
App screen labels, product names and prices stay in English so creators can match the app.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playbook_kit import *  # noqa: E402,F401,F403
from playbook_kit import HERE, TEXT  # noqa: E402

TEXT.update({
    'doc_title': 'KadeHub Content Creator & Marketing Playbook (Singlish)',
    'tagline': 'POS  ·  COD  ·  TASKS   —   eka account ekai, business ekata ona hama tool ekama',
    'title': ('Content Creator &', 'Marketing Playbook'),
    'subtitle': ('KadeHub hariyata therum gannayi, hari audience eka hoyagannayi,',
                 'sales enna content hadannayi ona okkoma mekeh thiyenawa.'),
    'inside': 'ATHULE THIYENNE',
    'inside_lines': ('Product deep dives  ·  Niches saha personas  ·  Hooks 70+',
                     'Shoot karanna ready scripts 14  ·  Dawas 30 content calendar',
                     'Sales playbook  ·  Ad kit  ·  Filming guide  ·  KPIs'),
    'edition': f'Singlish edition  ·  {TODAY.strftime("%B %Y")}  ·  kadehub.com',
    'header': 'Content Creator & Marketing Playbook  ·  Singlish',
    'footer': 'KadeHub creators saha partners la walata. Price kiyanna kalin kadehub.com eke live prices check karanna.',
})

# ================================================================= CONTENT
story = [Spacer(1, 1), NextPageTemplate('body'), PageBreak()]

toc = TableOfContents()
toc.dotsMinLevel = 0
toc.levelStyles = [style('toc0', fontName='Seg', fontSize=10.5, leading=15, leftIndent=0, firstLineIndent=0, spaceAfter=1.5)]
story += [P('Contents', style('ct', fontName='Pop800', fontSize=24, leading=30, textColor=TEAL_D, spaceAfter=4)),
          P('Ona line ekak click karala e section ekata yanna. PDF eke side panel eke bookmarks-uth thiyenawa.', 'toc_note'),
          gap(8), toc]

# ================================================================= 01
story += section('Me playbook eka use karanne kohomada', 'Mehen patan ganna. Kiyawanna winadi 10i, content ideas jeewithe purama.')
story += [P('Me playbook eka thamai oyaage brief eka. KadeHub kiyanne mokakda, kaatada, mokakda kiyanna ona, mokakda film karanna ona '
            'kiyala okkoma mekeh thiyenawa. Mekeh thiyena hama feature ekakma ada product eke thiyenawa. Me book eke nathi deyak '
            'camera eke kiyanna kalin KadeHub team eken ahanna.', 'lead')]
story += table(['Oyata thiyenawa nam…', 'Meka kiyawanna', 'Ita passe meka karanna'], [
    ['Winadi 10', '02 KadeHub thathpara 60n, 07 Mulinma market karanna ona features', 'Section 11 eken hooks 3k thoragena screen-recording ekak film karanna.'],
    ['Paeyak', 'Ekka 04–06 Product deep dives saha 08 Niches', 'Oyaage strongest niche ekata section 12 eken scripts 2k shoot karanna.'],
    ['Dawasak', 'Okkoma, ekka demo account ekak athule winadi 20k play karanna', 'Section 13 calendar eken palaweni dawas 30 plan karanna.'],
    ['Sales call ekak hari kade visit ekak', '15 Sales strategy', 'Winadi 5 demo script ekai WhatsApp follow-ups ekai use karanna.'],
], [1, 2, 2.4], bold_first=True)
story += [H2('Golden rules 5')]
story += numbered([
    '<b>Slides newei, app eka pennanna.</b> Aththa sale ekak, order ekak, report ekak screen-record karapuwama ona graphic ekakata wada hondai.',
    '<b>Mulinma prashnaya, ita passe wisanduma.</b> “Thawama naya potha liyanawada?” kiyana eka “KadeHub eke credit module ekak thiyenawa” kiyanawata wada hondata wada karanawa.',
    '<b>Video ekakata eka idea ekai.</b> Eka feature ekak, eka niche ekak, eka call to action ekak.',
    '<b>Eyalage bhashawen kathakaranna.</b> English, Sinhala, Tamil, kade ayiyala saha sellers la aththatama katha karana widihata.',
    '<b>Hama welema free trial ekenma iwara karanna.</b> POS saha COD dawas 14k free, card ona naha. Tasks free.',
])
story += warn('Brand rule: kisima rateka nama kiyanna epa', [P(
    'KadeHub position karala thiyenne hama thanama growing businesses walata platform ekak widihata. Videos, captions, thumbnails, '
    'hashtags kisima thanaka, kisima bhashawakin rateka nama kiyanna hari liyanna hari epa. “Local kade”, “oyaage nagaraya”, '
    '“oyaage wage businesses” kiyala kiyanna. LKR prices, LANKAQR, Sinhala saha Tamil bhasha gana kathakaranna kamak naha.', 'small')])

# ================================================================= 02
story += section('KadeHub thathpara 60n', 'Kade ayiyata therena wachanawalin, meka mokakda.')
story += [P('Eka account ekai. Business ekata ona hama tool ekama.', 'quote'),
          P('KadeHub kiyanne eka login ekak share karana simple business apps set ekak. Ekak use karanna, nathnam okkoma ekata use karanna.',
            style('c', parent=S['lead'], alignment=TA_CENTER)), gap(4)]
story += table(['App', 'Address', 'Eka line ekakin', 'Hondama kaatada', 'Gana'], [
    ['<b>KadeHub POS</b>', 'pos.kadehub.com', 'Local kade walata point of sale, inventory saha CRM. Wikunanna, stock ganan karanna, naya track karanna, reports balanna.',
     'Grocery kade, pharmacies, hardware saha retail kade', 'LKR 2,999 / masayata idan. Dawas 14 free trial.'],
    ['<b>KadeHub COD</b>', 'cod.kadehub.com', 'Cash-on-delivery orders, landed costs saha invoices. Item ekakin aththatama labaya kiyada kiyala danaganna.',
     'Online sellers, importers saha social-media shops', 'LKR 3,500 / masayata idan. Dawas 14 free trial.'],
    ['<b>KadeHub Tasks</b>', 'tasks.kadehub.com', 'Task ekak post karanna, langa inna taskers la gen offers ganna. Nathnam wada karala salli hoyanna.',
     'Busy gewal, podi businesses saha skilled freelancers', 'Use karanna free.'],
], [1.1, 1.3, 2.6, 2, 1.5])
story += [H2('Elevator pitch eka (thathpara 15n kiyanna)')]
story += box(None, [P('“KadeHub kiyanne podi businesses walata ona phone ekaka hari computer ekaka hari wada karana simple apps. <b>KadeHub POS</b> '
                     'eken oyaage kade counter eka, stock eka, naya potha okkoma manage karanawa. <b>KadeHub COD</b> eken cash-on-delivery orders '
                     'run karala aththa labaya pennanawa. <b>KadeHub Tasks</b> eken langa inna aya hoyagena wada karaganna puluwan. Eka account ekai, '
                     'install karanna deyak naha, dawas 14 free trial ekakuth thiyenawa.”', style('ep', parent=S['body'], fontSize=10.5, leading=15.5))])
story += [H2('Wenas wenne ai?')]
story += table(['Promise eka', 'Customer ta eken wenne'], [
    ['Eka login ekai', 'Eka paarak sign in wela POS, COD, Tasks athara aye sign in nathuwa yanna puluwan.'],
    ['Install karanna deyak naha', 'Desktop, tablet, phone eke browser eke wada karanawa.'],
    ['Oyaage bhashawen', 'Hama app ekakama English saha Sinhala. KadeHub COD eka invoices, catalogs ekkama Tamil walinuth thiyenawa.'],
    ['Offline unath wikunanawa', 'Internet giyath KadeHub POS sales save karagena, aye online awama sync karanawa.'],
    ['Local payments', 'Cash, card, QR (LANKAQR) saha naya eka till ekakin. Prices LKR walin.'],
    ['Use karana ekata witharak gewanna', 'Hama app ekatama wena plan ekak saha free trial ekak. Ona welawata thawa app ekak add karanna.'],
    ['Oyaagema kade address ekak', 'POS kade walata yourshop.kadehub.com wage thamange web address ekak labenawa.'],
    ['Oyaage data oyaatama', 'Hama business ekakatama penne eyaage data witharai, hama app ekakama.'],
], [1.1, 3.4], bold_first=True)
story += [CondPageBreak(60 * mm), H2('Mascot wa adunaganna')]
mrow = Table([[mascot('capybara-happy.webp', 30 * mm),
               [P('KadeHub eke friendly <b>capybara</b> apps purama tips saha greetings ekka penawa: “Hi there! Welcome to KadeHub.” '
                  'Thumbnails, intros, stickers saha end cards walata meyawa use karanna. Calm, friendly capybara brand voice ekata '
                  'hariyatama galapenawa: business eka lesi, stress naha.'),
                P('<font face="Pop600">frontend/public/mascot</font> eke thiyena poses: happy, love, curious, celebrate, ekka work, grow, relax, '
                  'sleep scenes. Full-resolution files team eken illanna.', 'small')]]],
             colWidths=[36 * mm, CONTENT_W - 36 * mm])
mrow.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
story += [mrow]

# ================================================================= 03
story += section('Api wisandana prashna', 'Content patan ganne prashnayen. Me thiyenne api customers la ge aththa oluwa redenna.')
story += [P('Hondama KadeHub video eka patan ganne viewer jeewithe aththatama witheela thiyena moment ekakin. Meewa opening scene eka '
            'widihata use karala, ita passe app eken eka hadana hati pennanna.', 'lead')]
story += [H2('Kade ayiyala (KadeHub POS)')]
story += table(['Prashnaya (eyalage wachanawalin)', 'Eken wena paduwa', 'KadeHub wisanduma'], [
    ['“Rata drawer eke salli kawadawath ganan hariyanne naha.”', 'Stress, staff ekka randu, salli nikanma nathi wenawa.', 'Opening cash, closing cash ekka shifts open/close karala shift report eka balanna.'],
    ['“Badu iwara wela thiyenawa kiyala danaganne customer ahapuwama.”', 'Sales nathi wenawa, customer langa kadeta yanawa.', 'Live stock levels saha low-stock alerts.'],
    ['“Internet giya, queue eka nawathuna.”', 'Wadima busy welawe sales nathi wenawa.', 'Offline unath wikunanawa. Aye online awama sales sync wenawa.'],
    ['“Aye expire wechcha behet box ekak visi kala.”', 'Pirisidu paduwak, pharmacy walata risk ekak.', '“Expiring soon” saha “expired” lists ekka batch saha expiry tracking.'],
    ['“Bhagayak customers la naya ganne, potha awul.”', 'Kawadawath ekathu karanna bari salli.', 'Customer ta link wechcha credit sales, outstanding, partial, paid status ekka.'],
    ['“Suppliers la gen phone eken order karanawa, mokakda order kale kiyala amathaka wenawa.”', 'Wadiyen stock, aduwen stock, randu.', 'Purchase orders. Order eka receive karapuwama stock eka automatically wadi wenawa.'],
    ['“Aththatama salli hambenne mona badu walinda kiyala danne naha.”', 'Anumana walin thiranayan.', 'Top products, category anuwa revenue, peak selling hours, stock value saha potential profit.'],
], [2, 1.7, 2.2])
story += [H2('Online saha cash-on-delivery sellers (KadeHub COD)')]
story += table(['Prashnaya', 'Eken wena paduwa', 'KadeHub wisanduma'], [
    ['“Orders WhatsApp, Messenger, notebook eka purama wisiri wela.”', 'Orders maga harinawa, deparak yawanawa, customers tharaha wenawa.', 'Eka order pipeline ekak: pending, confirmed, ongoing, delivered, returned, cancelled.'],
    ['“Godak wikunanawa, eth labayak thiyenawada kiyala danne naha.”', 'Nodanuwathma paduwata wikunanawa.', 'Item ekakata landed cost (buying price, exchange rate, shipping, customs) saha unit ekakata labaya.'],
    ['“Ekama customer aye aye orders return karanawa.”', 'Returns walata delivery gana nikan yanawa.', 'Customer trust badge: ekama phone number ekata delivered saha returned ganan.'],
    ['“Invoices ekin eka hadanna godak welawa yanawa.”', 'Sathiyakata paya ganan nathi wenawa.', 'Logo ekka automatic numbered invoices, print karanna hari PDF share karanna ready.'],
    ['“Hama order message ekakma WhatsApp eke type karala mahansi.”', 'Reply parakku wenawa, waradi enawa.', 'Eka tap ekakin order message eka liyala WhatsApp open wenawa.'],
    ['“Product photos, prices okkoma tharaha wela.”', 'Weak, unprofessional look ekak.', 'Catalog generator: oyaage brand colour eken lassana PDF hari JPG catalog ekak.'],
    ['“Business salli, mage salli okkoma pataleela.”', 'Aththatama kiyada hambenne kiyala danne naha.', 'Owner-only personal expense log, monthly budget saha “net remaining cash”.'],
], [2, 1.7, 2.2])
story += [H2('Gewal saha freelancers (KadeHub Tasks)')]
story += table(['Prashnaya', 'KadeHub wisanduma'], [
    ['“Plumber kenek hari cleaner kenek ona, eth trust karanna puluwan kenek danne naha.”', 'Task eka free post karanna, offers compare karanna, ratings saha iwara karapu jobs balanna.'],
    ['“Mage number eka internet eka purama yanna ona naha.”', 'Kenek thoraganna kal phone numbers saha emails public eke hangila thiyenawa.'],
    ['“Skills thiyenawa, free time thiyenawa, eth customers la naha.”', 'Tasker profile ekak hadala, langa thiyena tasks balala, offers dala reviews ekathu karanna.'],
], [2, 3])

# ================================================================= 04 POS
story += section('Product deep dive: KadeHub POS', 'pos.kadehub.com — “A fast counter, a tidy stockroom.”')
story += [P('<b>Positioning:</b> “Thathpara ganankin sale eka danna, hama badu ekakma ganan karala thiyaganna, kade wahanna kalin '
            'ada dawasa kohomada giye kiyala balanna.” <b>Landing headline:</b> “Smart retail, simplified.”', 'lead')]
story += [H2('Features, benefits saha film karanna ona dewal')]
story += table(['Feature', 'Benefit (meka kiyanna)', 'Screen eke pennanna ona deya'], [
    ['<b>Fast checkout</b>', 'Thathpara ganankin sale eka iwarai.', 'Product ekak search karanna (F2 eken search ekata yanawa), cart ekata add karala payment ganna, receipt eka enawa.'],
    ['<b>Barcode scanning</b>', 'Beep, beep, iwarai. Type karanna ona naha.', 'Scan mode eke USB barcode scanner ekakin items cart ekata add wena hati.'],
    ['<b>Cash, card, QR, naya</b>', 'Hama widiyema payment eka till ekakin.', 'Payment buttons 4. Eka sale ekak QR walin, ilanga eka naya walin.'],
    ['<b>Offline unath wikunanawa</b>', 'Internet naddi? Thawama wikunanna.', 'Wi-Fi off karala sale ekak danna (“Offline: Sale queued”), on karanna, “Synced 1 offline sale”.'],
    ['<b>Receipts + WhatsApp</b>', 'Bill eka customer ge phone ekata yawanna.', 'Customer receipt eka print karala WhatsApp share tap karanna.'],
    ['<b>Live stock + low-stock alerts</b>', 'Best sellers kawadawath iwara wenne naha.', 'In-stock, low-stock, out-of-stock badges ekka inventory list eka.'],
    ['<b>CSV product import</b>', 'Mulu kadema winadi walin setup karanna.', 'Products 500k dakwa CSV ekak upload karanna; list eka purawenawa.'],
    ['<b>Batch saha expiry</b>', 'Expire wenna kalin wikunanna, passe newei.', '“Expiring soon (30 days)” tab eka days-left labels ekka.'],
    ['<b>Customers saha loyalty</b>', 'Ena yana aya regular customers la karanna.', 'Customer profile: purchase history saha loyalty points (LKR 100kata point 1).'],
    ['<b>Naya potha (credit)</b>', 'Kauda kiyada naya kiyala hariyatama danaganna.', 'Credit page: total outstanding, ita passe partial payment ekak record karanna.'],
    ['<b>Discounts</b>', 'Calculator nathuwa promotions run karanna.', 'Minimum purchase saha dates ekka “Weekend 10% Off” hadanna.'],
    ['<b>Suppliers + purchase orders</b>', 'Smart widihata order karanna, eka click eken receive.', 'PO ekak hadala Receive click karanna, stock eka wadi wena hati balanna.'],
    ['<b>Expenses</b>', 'Sales witharak newei, labaya balanna.', 'Category anuwa rent, current bill log karanna; category summary.'],
    ['<b>Staff saha shifts</b>', 'Hama shift ekakama salli ganan hariyanawa.', 'Opening cash ekka shift open karala, close karala, shift report eka open karanna.'],
    ['<b>Audit log + roles</b>', 'Kauda mokakda kale kiyala danaganna.', 'Admin vs cashier access; date anuwa filter karapu audit log.'],
    ['<b>Reports</b>', 'Mokakda wikunenne, kawadda kiyala danaganna.', 'Top products, revenue trend, paya anuwa sales (“peak selling times”), stock value.'],
    ['<b>Oyaagema kade address ekak</b>', 'Mul dawase idanma professional.', 'Sign-up: kade nama type karama “yourshop.kadehub.com is available” penawa.'],
    ['<b>English saha Sinhala</b>', 'Staff ta eyalage bhashawen use karanna puluwan.', 'EN / සිං switch eka tap karanna; mulu screen ekama maru wenawa.'],
], [1.45, 1.6, 2.9])
story += [H2('POS plans')]
story += table(['Plan', 'Masayata', 'Awurudde', 'Staff', 'Athule thiyenne'], [
    ['Starter', 'LKR 2,999', 'LKR 29,990', '3 dakwa', 'POS checkout, inventory, basic reports. Email support.'],
    ['Pro  (Most popular)', 'LKR 4,999', 'LKR 49,990', '10 dakwa', 'Starter + customers saha loyalty, suppliers, expenses. Priority support.'],
    ['Enterprise', 'LKR 9,999', 'LKR 99,990', 'Unlimited', 'Okkoma: + analytics, staff saha shifts, naya, discounts, batches saha expiry. Dedicated support.'],
], [1.3, 1, 1, 0.8, 3.3], bold_first=True)
story += bullets([
    '<b>Hama module ekakma unlock karapu dawas 14 free trial.</b> Patan ganna salli ona naha.',
    'Awurudda gane gewuwoth 17%k witara ithuru (masa dekak free).',
    'Palaweni paid subscription ekath ekka eka paarak LKR 25,000 registration fee ekak thiyenawa. Ahuwoth awankawa kiyanna; section 15 objection handling balanna.',
    'Payment eka bank transfer (slip eka upload karanna) hari online card payment.',
])
story += tip('Selling tip: plan ladder eka', [P(
    'Demo ekedi kade ayiyala wadiyenma excite wena features (naya potha, batches saha expiry, shifts, analytics) thiyenne '
    '<b>Enterprise</b> plan eke. Trial eke okkoma labenawa. Content eke full experience eka pennala, sales calls waladi '
    'trial ekedi eyala aththatama use karapu dewal walata galapena plan eka kiyanna.', 'small')])

# ================================================================= 05 COD
story += section('Product deep dive: KadeHub COD', 'cod.kadehub.com — “Every cash-on-delivery order, under control.”')
story += [P('“Item ekak aththatama kiyada yanawada kiyala danaganna, orders pending idan delivered dakwa genayanna, invoices customer ta eka tap ekakin yawanna.” '
            'Cash-on-delivery sellers aththatama wada karana widihata hadala thiyenne: <b>ganna, list karanna, orders ganna, deliver karanna, salli ekathu karanna.</b>', 'lead')]
story += table(['Feature', 'Benefit (meka kiyanna)', 'Screen eke pennanna ona deya'], [
    ['<b>Winadi 5n setup</b>', 'Wikunanne mokakda kiyala thorala ready.', 'Step 3 wizard eka: business types 12n ekak (fashion, beauty, electronics, food…) saha brand colour ekak thoranna.'],
    ['<b>Landed cost calculator</b>', 'Hama item ekakama aththa cost eka balanna.', 'USD hari CNY walin buying price, exchange rate, shipping, customs danna; profit saha margin penawa.'],
    ['<b>Stage 6 order pipeline</b>', 'Hama order ekakma eka thanaka.', 'Counts saha totals ekka status cards; order ekak pending idan delivered dakwa genayanna.'],
    ['<b>Stock orders pitupasse yanawa</b>', 'Stock eka hama welema hari.', 'Delivered mark karama stock adu wenawa. Returned mark karama stock aye enawa.'],
    ['<b>Automatic invoices</b>', 'Eka tap ekakin professional invoices.', 'Logo saha brand colour ekka A4 invoice ekak (INV-2026-0001).'],
    ['<b>WhatsApp sharing</b>', 'Customers la hama welema update.', 'WhatsApp tap karama order message eka liyala chat eka open wenawa.'],
    ['<b>Customer trust badge</b>', 'Orders return karana customers la allaganna.', '“This customer has returned 2 or more orders.” warning eka.'],
    ['<b>Shipping labels</b>', 'Wada ikmanata pack karanna.', 'Labels page ekak print karanna (A4 sheet ekakata 8i, orders 80 dakwa).'],
    ['<b>Catalog generator</b>', 'Loku brand ekak wage penenna.', 'Prices saha “Only 2 left” badges ekka PDF hari JPG catalog ekak hadala share karanna.'],
    ['<b>Naya saha reminders</b>', 'Wholesale aya dena thiyena salli ekathu karanna.', 'Customer anuwa balances, overdue bucket, WhatsApp payment reminder.'],
    ['<b>Expenses</b>', 'Thathpara walin wiyadam log karanna.', 'Quick amount chips saha duplicate warning ekka keypad entry.'],
    ['<b>Reports saha labaya</b>', 'Aththa labaya danaganna.', 'Ona date range ekakata revenue, cost of goods, expenses, net profit.'],
    ['<b>Personal saha cash view</b>', 'Aththatama ithuru wenne kiyada kiyala danaganna.', 'Owner-only “Net remaining cash” saha “Pay yourself first” wage tips.'],
    ['<b>Search saha filters</b>', 'Ona order ekak ikmanata hoyaganna.', 'Invoice, customer hari phone eken search; date saha status anuwa filter.'],
    ['<b>Bhasha 3</b>', 'Customer ge bhashawen invoices.', 'Sinhala hari Tamil walata maru karanna; invoices saha catalogs eka pitupassen enawa.'],
    ['<b>Staff access</b>', 'Staff ta orders ganna puluwan, oyaage labaya penne naha.', 'Cashier role: costs, profit, expenses, reports penne naha.'],
], [1.45, 1.6, 2.9])
story += [H2('COD plans')]
story += table(['Plan', 'Masayata', 'Items', 'Orders / masayata', 'Highlights'], [
    ['Free (trial plan)', 'LKR 0', '20', '30', 'Dawas 14 trial, printable invoices, basic dashboard.'],
    ['Pro  (Most popular)', 'LKR 3,500', '300', '500', 'Expenses saha reports, Premium (bulk status changes, per-item units, trend charts), priority support.'],
    ['Business', 'LKR 9,500', 'Unlimited', 'Unlimited', 'High-volume sellers la walata. Pro eke okkoma.'],
], [1.4, 0.9, 0.8, 1, 3.3], bold_first=True)
story += bullets(['Hama aluth business ekakma patan ganne <b>dawas 14 free trial</b> ekakin, card ona naha.',
                  'Masa gane hari awurudda gane. Bank transfer hari online card (OnePay) walin gewanna.',
                  'Data eka thiyenawa: “Your items, orders and settings stay exactly as you left them.”'])

# ================================================================= 06 TASKS
story += section('Product deep dive: KadeHub Tasks', 'tasks.kadehub.com — “Get anything done by people near you.”')
story += [P('Local marketplace ekak. Minissu jobs post karanawa; taskers la offers yawanawa; post karapu kena ekak thoraganawa. '
            '<b>Post karanna free. Join wenna free.</b> Wada iwara unama tasker ta kelinma gewanawa.', 'lead')]
story += table(['Feature', 'Benefit (meka kiyanna)', 'Screen eke pennanna ona deya'], [
    ['<b>Free post karanna</b>', 'Wistharaya liyala, budget eka dala, iwarai.', 'Step 3 post wizard eka: title, details, photos, budget (LKR 500 idan), date.'],
    ['<b>Offers oyata enawa</b>', 'Prices langin langa compare karanna.', 'Price, rating, message ekka offers godak thiyena task ekak.'],
    ['<b>Eka click eken accept</b>', 'Ekagathwechcha gana lock wenawa.', 'Offer ekak accept karanna; anith ewa automatically close wenawa.'],
    ['<b>Public Q&amp;A</b>', 'Uththara hamotama penawa.', 'Tasker prashnayak ahanawa, post karapu kena uththara denawa.'],
    ['<b>Contact details araksha karala</b>', 'Oyaage number eka private.', 'Public text eke phone number ekak “[contact hidden]” walin replace wela.'],
    ['<b>Private chat</b>', 'Thoragaththata passe details katha karanna.', 'Post karapu kena saha assign karapu tasker athara private messages.'],
    ['<b>Aththa reviews witharai</b>', 'Ratings aththa jobs walin.', 'Job eka iwara unama dennama 1–5 stars denawa.'],
    ['<b>Tasker profile</b>', 'Thamange welawata salli hoyanna.', 'Skills, completed jobs, reviews saha “Phone verified” badge ekka profile eka.'],
    ['<b>Remote hari in person</b>', 'Local jobs hari online wada.', 'Filters: in person, remote, district anuwa, budget anuwa.'],
    ['<b>Categories 17</b>', 'Godak dewal walata udaw.', 'Cleaning, moving, handyman, plumbing, tutoring, design, data entry saha thawath.'],
], [1.45, 1.6, 2.9])
story += info('Mulu brand ekatama Tasks wadagath ai?', [P(
    'Tasks free nisa KadeHub eke lesima “ow” eka meka. KadeHub accounts saha brand awareness wadi karanna meka use karala, '
    'sign up wena business owners la ta POS saha COD introduce karanna. Kade ayiyala ta deliveries, shelf stacking, signage, '
    'design wage wada walata udaw ganna Tasks use karanna puluwan.', 'small')])

# ================================================================= 07
story += section('Mulinma market karanna ona features', 'Viewer kenek free-trial sign-up ekak karanna thiyena wegaya anuwa rank karala.')
story += [P('Hama feature ekakma ekaama widihata wikunenne naha. Mewa thamai “money features”: thathpara 15n pennanna lesi, '
            'hama dawasema danena prashnayakata sambandai, notebook ekakin hari Excel walin hari wenas.', 'lead')]
story += table(['#', 'Feature', 'App', 'Wikunenne ai', 'Hondama video format eka'], [
    ['1', 'Offline unath wikunanawa', 'POS', 'Internet giyama sales nathi wena baya hamotama thiyenawa. Hondatama penawa: Wi-Fi off, sale eka thawama wada.', '“Other system vs KadeHub” side-by-side, 15s.'],
    ['2', 'Landed cost saha item ekakata aththa labaya', 'COD', 'Godak online sellers la eyalage aththa margin eka danne naha. Loku “aha” moment ekak.', 'Aththa product ekak ekka calculator walk-through, 30s.'],
    ['3', 'Naya potha (credit)', 'POS + COD', 'Hama kadakama naya potha prashnayak thiyenawa. Ekapaarata relate wenawa.', 'Notebook vs app comedy skit, 20s.'],
    ['4', 'Eka tap ekakin WhatsApp order message saha invoice', 'COD', 'Sellers jeewath wenne WhatsApp eke. Hama order ekakadima welawa ithuru wenawa.', 'Speed challenge: type karanawa vs eka tap, 15s.'],
    ['5', 'Batch saha expiry alerts', 'POS', 'Pharmacies saha grocery kade expiry walin aththa salli nathi karanawa.', 'POV pharmacy owner, 20s.'],
    ['6', 'Stock orders pitupasse / low-stock alerts', 'POS + COD', 'Wadiyen wikunana eka saha nathi wena sales nawathwanawa.', 'Zoom-ins ekka screen recording, 20s.'],
    ['7', 'Shift cash reconciliation', 'POS', 'Hama raatriyema “salli koheda giye?” randuwa iwarai.', 'Rata kade wahana story eka, 30s.'],
    ['8', 'Return-risk customer badge', 'COD', 'Nikan yana delivery gana ithuru karanawa. Sellers la godak kamathi.', 'Storytime: “me customer orders 3k return kala…”, 20s.'],
    ['9', 'Catalog generator', 'COD', 'Podi sellers la loku brands wage penenna salaswanawa. Share karanna puluwan result ekak.', 'Before/after reveal, 15s.'],
    ['10', 'Hama app ekatama eka account + free trial', 'Okkoma', 'Risk adui, patan ganna lesi.', 'Hama video ekakama end card eka.'],
], [0.3, 1.6, 0.8, 2.6, 1.7])
story += tip('Demos dinana feature combo eka', [P(
    '<b>POS:</b> offline sale → WhatsApp receipt → low-stock alert → credit sale → dawase report eka. '
    '<b>COD:</b> landed cost → aluth order → WhatsApp message → delivered mark karanawa (stock adu wenawa) → profit report. '
    'Hama combo ekakma thathpara 60 screen recording ekakata ahuwenawa.', 'small')])
story += warn('Kiyanna EPA claims (ada product eke naha)', bullets([
    'SMS messages hari SMS receipts (WhatsApp sharing thiyenawa, SMS naha).',
    'Phone camera eken barcodes scan karana eka (POS eke thiyenne USB/keyboard barcode scanners walata support).',
    'KadeHub POS hari Tasks eke Tamil (Tamil sampurnayenma thiyenne KadeHub COD eke witharai).',
    'Till eke automatic discounts (discounts hadanne Discounts page eke; cashier discount amount eka manually danawa).',
    'Eka dashboard ekakin branches / kade godak manage karana eka.',
    'Courier integration hari automatic tracking (COD eke thiyenne oya type karana tracking number eka witharai).',
    'App store eken download karana mobile app ekak (KadeHub wada karanne browser eke: “install karanna deyak naha”).',
    '“Kade 10,000k KadeHub use karanawa” wage boru numbers hari hadapu testimonials.',
], 'small'))

# ================================================================= 08
story += section('Niches saha target audiences', 'Kaata kathakaranna ona da, mokakda redenne, scroll eka nawaththana angle eka mokakda.')
story += [P('<b>Video ekakata eka niche ekai</b> thoranna. “Pharmacy owners la” ta video ekak “businesses” walata video ekakata wada hondai. '
            'Priority eken kiyanne patan ganna ona thana: A = dan patan ganna, B = deweni rella, C = passe test karanna.', 'lead')]
NICHES = [
    ['A', 'Grocery kade saha mini-marts', 'POS', 'Naya potha awul, salli ganan hariyanne naha, stock iwara wenawa, internet yanawa.', 'Naya potha, offline sales, low stock, shifts.', 'Facebook, TikTok', '“Oyaage kade naya potha oyata salli nathi karanawa.”'],
    ['A', 'Social-media sellers (Facebook, Instagram, TikTok shops)', 'COD', 'Orders chats wala wisiri, labaya danne naha, returns.', 'Order pipeline, WhatsApp share, return badge, profit report.', 'TikTok, Instagram, FB groups', '“Masayata orders 200k wikunuwa. Labayak hambuneda?”'],
    ['A', 'Importers (pitarata gena methana wikunana aya)', 'COD', 'Exchange rates, shipping, customs nisa aththa cost eka pehedili naha.', 'Landed cost calculator, item ekakata margin.', 'YouTube, Facebook', '“Customs amathaka unu nisa oyaage price eka waradi.”'],
    ['A', 'Pharmacies', 'POS', 'Expired stock paduwa, batch tracking, ikman checkout.', 'Batch saha expiry, barcode, stock.', 'Facebook, LinkedIn, WhatsApp', '“Me awurudde expire wechcha behet kiyada visi kale?”'],
    ['B', 'Fashion saha beauty sellers', 'COD', 'Items godai, sizes godai, podi orders godai, lassana catalog ekak ona.', 'Business-type presets, catalog generator, logo ekka invoices.', 'Instagram, TikTok', '“Oyaage podi shop eka loku brand ekak wage pennanna.”'],
    ['B', 'Hardware, bookshops, stationery, phone accessory kade', 'POS', 'Podi badu dahas ganan, suppliers, builders la ta saha schools walata naya.', 'CSV import, barcode, purchase orders, naya.', 'Facebook, YouTube', '“Podi badu 3,000i. Stock eke mokada thiyenne kiyala danne naha?”'],
    ['B', 'Naya walata wikunana wholesale sellers', 'COD', 'Retailers parakku wela gewanawa; mathak karanna lajjai.', 'Credit balances, due buckets, WhatsApp reminder.', 'WhatsApp, Facebook', '“Salli pitupasse duwanna epa. Eka tap ekakin polite reminder ekak yawanna.”'],
    ['B', 'Gedara idan karana food, cake saha gift businesses', 'COD', 'Message walin orders, wiyadam ganan karanne naha, invoices naha.', 'Food business type, orders, expenses, profit.', 'Instagram, TikTok', '“Oyaage cake business eka aththa business ekak. Ehema run karanna.”'],
    ['B', 'Udaw ona gewal', 'Tasks', 'Trust karanna puluwan cleaners, movers, repair aya hoyaganna amarui.', 'Free posting, offers, reviews, hidden contacts.', 'Facebook, TikTok', '“Senasurada wenakota plumber kenek ona? Eyalawa oya langata enna denna.”'],
    ['B', 'Students, freelancers saha skilled workers', 'Tasks', 'Thamange welawata extra income ekak ona.', 'Tasker profile, tasks balanna, reviews.', 'TikTok, Instagram', '“Weekend side hustle: thiyena skills walatama salli.”'],
    ['C', 'Accountants saha business consultants (partners)', 'POS + COD', 'Clients la awul potha genawa.', 'Reports, expenses, profit, audit log.', 'LinkedIn', '“Clients la pitupasse duwanne nathuwa clean numbers ganna.”'],
    ['C', 'Wenas welawata udaw ona podi businesses', 'Tasks', 'Podi jobs: deliveries, signage, shelf stacking, design.', 'Task ekak post karanna, offers compare karanna.', 'Facebook, LinkedIn', '“Awuruddakata newei, havasakata udaw ganna.”'],
]
story += table(['Pri.', 'Niche', 'App', 'Main prashna', 'Eka hadana features', 'Platforms', 'Hook angle'], NICHES,
               [0.35, 1.3, 0.55, 1.6, 1.5, 0.9, 1.6], font_size=7.8)
story += [H2('Content-creator meta-niches (oyaage audience dan inna thana)')]
story += table(['Meta-niche', 'Content style', 'KadeHub galapenne kohomada'], [
    ['Small business tips', 'Quick tips, “waradi 3k”, checklists', 'Tip eka pitupasse thiyena tool eka KadeHub.'],
    ['Online selling saha side hustles', 'Storytime, “mama mage shop eka run karana hati”, behind the scenes', 'Online shop ekaka back office eka COD; side income walata Tasks.'],
    ['Salli saha personal finance', 'Budgeting, “mage salli koheda yanne?”', 'COD eke personal saha cash view; sales vs labaya.'],
    ['Day-in-the-life / POV', 'Kade ayiya kenekuge hari seller kenekuge vlog', 'Dawasa athara app eka natural widihata penawa.'],
    ['Tech made simple', 'App reviews saha tutorials', 'Screen-record karapu walk-throughs, “winadi 5n setup”.'],
    ['Comedy saha relatable skits', 'Kade ayiya vs customer, boss vs cashier', '“Naya potha” saha “salli ganan hariyanne naha” jokes.'],
], [1.4, 1.8, 2.6], bold_first=True)
story += [H2('Thama galapenne nathi aya')]
story += bullets(['Table service, kitchen tickets, menu modifiers ona restaurants.',
                  'Eka dashboard ekakin branches godak manage karanna ona loku chains.',
                  'App store eken native app ekak ona businesses.'], 'bullet')
story += [P('Me audiences walata ads target karanna epa. Galapenne nathi customers la ikmanata nawathinawa, naraka reviews danawa.', 'small')]
story += [H2('Niche anuwa top objections saha uththara')]
story += table(['Niche', 'Eyala kiyanawa…', 'Oya kiyanna…'], [
    ['Grocery', '“Mata mage potha athi.”', '“Dawas 60k idan kauda naya kiyala hari, seeni iwara wenna yanawa kiyala hari oyaage potha kiyanne naha. Dawas 14 free try karanna, potha ekath thiyaganna.”'],
    ['Grocery', '“Methana internet naraka.”', '“KadeHub POS offline unath wikunanawa, passe sync karanawa. Demo eke Wi-Fi off karala balanna.”'],
    ['Pharmacy', '“Mata batch numbers ona.”', '“Hama batch ekakatama number ekak, manufactured date, expiry date, ekka expiring-soon list ekak thiyenawa.”'],
    ['Online sellers', '“Mama WhatsApp witharai use karanne.”', '“Thawama WhatsApp use karanna. KadeHub oyata order message eka liyala, hama order ekakma eka list ekaka thiyanawa.”'],
    ['Importers', '“Mage cost eka mama danawa.”', '“Eke exchange rate, shipping, customs unit ekakata thiyenawada? KadeHub hama item ekakatama eka hadanawa.”'],
    ['Taskers', '“Meka araksha da?”', '“Oyawa thoragannakal contact details hangila thiyenawa, ekata wada karapu aya witharai ekiyanta review karanna puluwan.”'],
], [0.9, 1.4, 3.6], bold_first=True)

# ================================================================= 09
story += section('Customer personas', 'Eka paarakata eka kenekuta liyanna, film karanna.')
PERSONAS = [
    ('Saman, 46 — grocery kade owner', 'POS', [
        '<b>Kade:</b> gama langa grocery ekak, udaw karuwek ekkenai, ude 6 idan raa 10 dakwa. Regular aya ta naya ta denawa.',
        '<b>Dawasak:</b> kade arinawa, suppliers 4 dena gen badu gannawa, naya notebook eke liyanawa, raa salli ganan karanawa, godak welawata ganan hariyanne naha.',
        '<b>Ona:</b> kauda mokakda dena thiyenne kiyala danaganna, best sellers iwara wena eka nawaththanna.',
        '<b>Baya:</b> “computers amarui”, internet yana eka, masika gana.',
        '<b>Inna thana:</b> Facebook, YouTube, WhatsApp groups. Sinhala videos balanawa.',
        '<b>Wada karana message eka:</b> “Oyaage naya pothai salli drawer ekai eka screen ekaka hariyata. Internet nathi unath wada.”']),
    ('Dilani, 38 — pharmacy owner', 'POS', [
        '<b>Kade:</b> assistants dennek ekka busy pharmacy ekak.',
        '<b>Dawasak:</b> customers la ta ikmanata serve karanawa, expiry dates athin check karanawa, distributors la gen order karanawa.',
        '<b>Ona:</b> expired stock zero, barcodes ekka ikman billing, staff accountability.',
        '<b>Inna thana:</b> Facebook, LinkedIn, professional WhatsApp groups.',
        '<b>Wada karana message eka:</b> “Ilanga dawas 30 athuladi expire wena hama batch ekakma, paduwak wenna kalin balanna.”']),
    ('Fathima, 27 — Instagram fashion seller', 'COD', [
        '<b>Business eka:</b> Instagram saha TikTok eke dresses, accessories wikunanawa, cash on delivery, sathiyakata orders 15–40.',
        '<b>Dawasak:</b> DMs walata reply karanawa, order details liyanawa, parcels pack karanawa, returns pitupasse yanawa.',
        '<b>Ona:</b> professional widihata penenna, chats wala orders nathi wena eka nawaththanna, aththa labaya danaganna.',
        '<b>Inna thana:</b> Instagram, TikTok, Facebook seller groups. Raa reels balanawa.',
        '<b>Wada karana message eka:</b> “Oyaage shop eka Instagram eke, back office eka KadeHub eke. Orders, invoices, labaya eka thanaka.”']),
    ('Kasun, 31 — gadget importer', 'COD', [
        '<b>Business eka:</b> phone accessories import karala online saha podi kade walata naya ta wikunanawa.',
        '<b>Dawasak:</b> exchange rates, shipping, customs spreadsheet ekaka track karanawa; wholesale payments pitupasse duwanawa.',
        '<b>Ona:</b> item ekakata hariyatama landed cost saha margin, gewanne nathi balances walata reminders.',
        '<b>Inna thana:</b> YouTube, Facebook, TikTok.',
        '<b>Wada karana message eka:</b> “USD hari CNY walin ganna, shipping customs eka paarak danna, unit ekakata aththa labaya balanna.”']),
    ('Nirosha, 35 — busy parent (Tasks poster)', 'Tasks', [
        '<b>Ona:</b> family event ekakata kalin cleaner kenek, kaanu wena tap ekakata handyman kenek, lamayata tutor kenek.',
        '<b>Ona deya:</b> trust karanna puluwan aya, sadharana gana, privacy.',
        '<b>Wada karana message eka:</b> “Free post karanna. Offers ganna. Hondama reviews thiyena kena thoranna.”']),
    ('Ravi, 22 — student saha tasker', 'Tasks', [
        '<b>Skills:</b> design, computer help, weekend wala furniture move karana eka.',
        '<b>Ona:</b> thamange welawata extra salli saha wadena reputation ekak.',
        '<b>Wada karana message eka:</b> “Oyaage free weekend eka langa thiyena paid wadak karanna.”']),
]
for name, app, lines in PERSONAS:
    card = Table([[Paragraph(name, style('pn', fontName='Pop700', fontSize=11, textColor=WHITE, spaceAfter=0)),
                   Paragraph(app, style('pa', fontName='Pop700', fontSize=9, textColor=AMBER, alignment=2, spaceAfter=0))],
                  [bullets(lines, style('pb', parent=S['bullet'], fontSize=9, leading=12.8)), '']],
                 colWidths=[CONTENT_W * 0.8, CONTENT_W * 0.2])
    card.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), TEAL), ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#F8FAFC')),
                              ('SPAN', (0, 1), (1, 1)), ('BOX', (0, 0), (-1, -1), 0.6, LINE),
                              ('LEFTPADDING', (0, 0), (-1, -1), 9), ('RIGHTPADDING', (0, 0), (-1, -1), 9),
                              ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]))
    story += [KeepTogether([card]), gap(9)]
story += [P('Personas illustrative witharai, aththa customers la newei. Aththa customers la awama, avasara aragena eyalage story eka film karanna.', 'small')]

# ================================================================= 10
story += section('Messaging framework', 'Hama video, caption, ad ekakatama eka voice ekak.')
story += [H2('Positioning statement')]
story += box(None, [P('Notebooks, wisiri chats saha labaya anumana karana eken mahansi wechcha <b>kade ayiyala saha online sellers la</b> ta, '
                     '<b>KadeHub</b> kiyanne eka login ekak thiyena simple business apps set ekak. Eken oyaage counter eka, cash-on-delivery orders, '
                     'business eka watee wada okkoma run karanawa. Amaru hari pitarata software wage newei, KadeHub oyaage bhashawen, local payments ekka, '
                     'offline unath wikunanawa, free trial ekakin patan gannawa.', style('ps', parent=S['body'], fontSize=10.3, leading=15))])
story += [H2('Taglines (product eken approve wechcha)')]
story += table(['Use karanne', 'Tagline'], [
    ['Brand / KadeHub hub', '“One account. Every tool your business needs.”'],
    ['Brand alternative', '“Three apps. One KadeHub.”'],
    ['KadeHub POS', '“Smart retail, simplified.”  /  “A fast counter, a tidy stockroom.”'],
    ['KadeHub COD', '“Every cash-on-delivery order, under control.”'],
    ['KadeHub Tasks', '“Get anything done by people near you.”'],
    ['Closing line', '“Start with the app you need today.”'],
], [1.3, 3.7], bold_first=True)
story += [P('Brand taglines English walinma thiyaganna. Video eke Singlish ekata translate karanna ona nam, pahala thiyena ewa use karanna.', 'small')]
story += [H2('Test karanna aluth Singlish taglines')]
story += bullets(['“Oyaage kade, hariyata.”', '“Anumana epa. Danaganna.”', '“Notebook eken KadeHub ekata.”',
                  '“Wadiyen wikunanna. Adu stress.”', '“Hama rupiyalakma ganan karala.”', '“Oyaage back office eka, oyaage pocket eke.”',
                  '“Aththa labaya danaganna.” (COD)', '“Internet giya. Sales giye naha.” (POS)'])
story += [H2('Value pillars 3')]
story += table(['Pillar', 'Message', 'Product eke proof'], [
    ['<b>Simple</b>', 'Ona kenekuta, eyalage bhashawen, ona device ekaka use karanna puluwan.', 'Browser-based, English saha Sinhala (+ COD eke Tamil), winadi walin setup, CSV import.'],
    ['<b>Control eka oya athe</b>', 'Stock, salli, labaya ekapaarata danaganna.', 'Low-stock alerts, naya potha, shift reports, landed cost, profit reports.'],
    ['<b>Local business walata hadapu</b>', 'Local kade saha sellers aththatama wada karana widihata hadala.', 'LKR, LANKAQR, cash-on-delivery, WhatsApp sharing, offline sales.'],
], [1.1, 2.2, 3])
story += [H2('Tone of voice')]
story += table(['Api', 'Api newei'], [
    ['Friendly, udaw karana ahalwasiyek wage', 'Corporate hari salesy'],
    ['Simple: podi wachana, podi sentences', 'Technical: “cloud”, “SaaS”, “multi-tenant”, “JWT” epa'],
    ['Confident saha awanka', 'Wadi karala kiyana eka hari boru claims'],
    ['Podi businesses walata gauravaya', 'Notebooks use karana aya ta hinahenna (eyath ekka hinawenna, eyala ta newei)'],
    ['Local saha unusum (code-mixing hondai)', 'Rata nam hari deshapalanaya'],
], [1, 1])
story += [H2('Use karanna ona wachana saha epa wachana')]
story += table(['Use karanna', 'Epa'], [
    ['kade, counter, till, stock, naya potha, orders, labaya', 'ERP, SaaS, multi-tenant, cloud-native, enterprise solution'],
    ['“free trial, card ona naha”', '“free forever” (POS saha COD dawas 14n passe paid)'],
    ['“phone eke wada, install karanna deyak naha”', '“api app eka download karanna”'],
    ['“offline unath wikunanawa”', '“100% offline wada” (aye online awama sync wenawa)'],
    ['“aththa labaya balanna”', '“sales guarantee”, “income eka double karanawa”'],
], [1, 1])

# ================================================================= 11
story += section('Hook library', 'Scroll eka nawaththana first lines 70+. Ekak thathpara 3ta adui.')
story += [P('Hook eka kiyanne palaweni thathpara 1–3: kiyana line eka + screen eke text + shakthimath palaweni visual ekak. '
            'Hama hook ekakatama galapena visual ekak danna (notebook ekak, salli drawer ekak, parcels godak, chats wala purawechcha phone ekak). '
            'Oyaage niche ekata galapena widihata wachana maru karanna.', 'lead')]
n = 1
groups = [
    ('Prashna (pain) hooks', TEAL, TEAL_L, [
        'Thawama customer naya notebook eke liyanawada?',
        'Iye raath drawer eke salli ganan hariyanne naha neda?',
        'Internet giya, queue eka nawathuna. Aye.',
        'Me masaye expire wechcha badu kiyada visi kala?',
        'Orders WhatsApp, Messenger, notebook eke. Prashnaya eka thamai.',
        'Badu iwarai kiyala danaganne customer ahapuwama.',
        'Me masaye orders 200k wikunuwa. Oyaage labaya kiyada kiyala danawada?',
        'E customer thunweni order ekath return kala. Aye delivery gana gewwa.',
        'Dawasakata ekama order message eka 40 paarak type karanawada? Nawaththanna.',
        'Dawasakata paya 14k kade wada karanawa, eth salli koheda yanne kiyala danne naha.',
    ]),
    ('Curiosity hooks', BLUE, BLUE_L, [
        'Me kade ayiya Wi-Fi off kala… eth thawama wikunuwa.',
        'Mage kade salli nathi wenne ai kiyala hoyagaththa. Meka thamai.',
        'Kade wahanna kalin hama kade ayiya ma balanna ona eka screen eka.',
        'Me podi badge eka seller kenekuta dahas ganan delivery gana ithuru kala.',
        'Me order eka delivered kiyala mark karama wena de balanna.',
        'Godak online sellers la me number eka danne naha. Oya danawada?',
        'Mage kadeta professional catalog ekak thathpara 30n haduwa.',
        'Avurudu 22 kenek giya weekend eke langa podi jobs walin hamba kala salli.',
    ]),
    ('Salli saha numbers hooks', AMBER_D, AMBER_L, [
        'KadeHub POS dawasakata LKR 100k witarai. Expire wena eka box ekak wadi.',
        'Oyaage item eka 900 newei, 1,200i. Meka thamai hethuwa.',
        'Oyaage naya potha aththatama oyata yana gana meka.',
        'Dollar walin gannawa, rupiyal walin wikunanawa? Mulinma me ganan hadanna.',
        'Hama kade ayiya ma hama raatriyema danaganna ona numbers 3k.',
        'Sales kiyanne labaya newei. Thathpara 20n wenasa pennannam.',
        'Return wena eka order ekak orders 3ka labaya kanawa. Meka nawaththana hati.',
    ]),
    ('Comparison saha before/after hooks', TEAL, TEAL_L, [
        'Notebook vs KadeHub. Race ekak yamu.',
        'Invoice ekak type karanawa vs eka tap. Kauda dinanne?',
        'KadeHub ta kalin mage kade… saha passe.',
        'Excel sheet ekak vs aththa order pipeline ekak.',
        'Loku supermarket ekak stock check karana hati vs oyata ada idanma karanna puluwan hati.',
        'Ekama kade, ekama dawasa: low-stock alerts ekka saha nathuwa.',
    ]),
    ('POV saha storytelling hooks', BLUE, BLUE_L, [
        'POV: oya pharmacy owner kenek, me alert eka penawa.',
        'POV: raa 10i, salli ganan anthimata hariyanawa.',
        'POV: oya bedroom eke idan online shop ekak run karanawa.',
        'Notebook eka nawaththapu kade ayiya kenekuge dawasak.',
        'Storytime: masa 4k mata naya una customer.',
        'POV: udaw karuwa till eke, oya gedara. Eth hama sale ekakma oya danawa.',
        'Kade ayiya kenekuge gen ahuwa wadiyenma stress mokakda kiyala. Uththaraya…',
    ]),
    ('Challenge, tutorial saha list hooks', AMBER_D, AMBER_L, [
        'Mulu kadema winadi 5n setup karamu. Timer eka patan.',
        'Oyaage kadeta POS system ekak ona kiyana lakshana 3k.',
        'Cash on delivery ekka online sellers karana waradi 5k.',
        'Eka tap ekakin WhatsApp walin invoice ekak yawana hati.',
        'Item ekakata aththa labaya danaganna hati (save karaganna).',
        'Kade ayiyala ta thathpara 30 end-of-day routine eka.',
        'Stock nathi wena eka nawaththanna ada idanma karanna puluwan free dewal 3k.',
        'Products 20k catalog ekak karana hati balanna.',
    ]),
    ('Myth-busting hooks', TEAL, TEAL_L, [
        '“POS systems supermarkets walata witharai.” Waradi.',
        '“Mekata computer ekak ona.” Ona naha. Phone eka athi.',
        '“Shop software godak ganan.” Ganan hadala balamu.',
        '“Mage staff ta apps use karanna ba.” Meka Sinhala walin.',
        '“Internet giyoth wikunanna ba.” Dan ehema naha.',
        '“Cash on delivery organise karanna ba.” Meka balanna.',
    ]),
    ('Direct call-out hooks', BLUE, BLUE_L, [
        'Grocery kade ayiyala, scroll karana eka nawaththanna.',
        'Instagram eke cash on delivery ekka wikunanawa nam, meka oyata.',
        'Pharmacy owners la, me eka feature eka oyata.',
        'Importers la: oyaage items waradi gana walata danna epa.',
        'Me sathiye cleaner kenek, plumber kenek, mover kenek ona da?',
        'Athin wada hondata karanna puluwanda? Langa inna aya oyata gewai.',
        'Gedara idan business ekak run karanawada? Ilanga order ekata kalin meka balanna.',
    ]),
    ('Tamil / Tanglish hooks, KadeHub COD saha Tasks walata (native speaker kenek lawa polish karanna)', AMBER_D, AMBER_L, [
        'Innum order ellam WhatsApp-la theduringala?  (Thawama orders WhatsApp eke hoyanawada?)',
        'Ungal unmaiyana laabam evvalavu theriyuma?  (Oyaage aththa labaya danawada?)',
        'Invoice Tamil-la, oru tap-la!  (Tamil walin invoice, eka tap ekakin!)',
        'Kadan kanakku innum notebook-la-va?  (Naya ganan thawama notebook eke da?)',
    ]),
]
for title, col, bgc, hooks in groups:
    flow, n = hook_list(title, hooks, col, bgc, n)
    story += flow
story += tip('Hook formula eka', [P('<b>[Call-out hari prashnaya] + [specific detail ekak] + [wisandumaka promise eka].</b>  Udaharanayak: “Pharmacy owners la (call-out), '
                                    'e expire wechcha behet box eka (detail) wenna ona une naha (promise).” Palaweni wachanaya thathpara 0.5 athuladi screen eke thiyenna ona.', 'small')])
story += info('Sinhala akuru walin liyanawa nam', [P('Me hooks Singlish walin thiyenne. Captions walata Sinhala akuru (සිංහල) ona nam, native speaker kenek lawa '
                                                    'liyawala check karaganna. Screen eke Singlish saha Sinhala akuru dekama haduwoth audience dekatama yanawa.', 'small')])

# ================================================================= 12
story += section('Shoot karanna ready video scripts', 'Short videos 12 (15–60s) saha YouTube outlines 2. Film karanna, edit karanna, post karanna.')
story += [P('Format: vertical 9:16, 1080×1920. Screen recordings ganne realistic sample data thiyena demo account ekakin '
            '(KadeHub team eken illanna). Hama video ekakatama captions. Welawan guide ekak witharai. App eke labels English walin '
            'thiyena nisa screen text eke ewa ehemama thiyanna.', 'lead')]
SCRIPTS = [
    ('Internet giya. Sales giye naha.', 'POS · 20s · Reels / TikTok / Shorts · Grocery, ona kadak',
     'Mage kade internet dan giya… meka balanna.',
     [['0–3s', 'Kade counter eka. Owner phone eke Wi-Fi icon eka off karanawa. “Offline” close-up.', 'Mage kade internet dan giya… meka balanna.', 'Internet OFF'],
      ['3–9s', 'Screen recording: items 3k cart ekata dala cash payment ganna. “Offline: Sale queued”.', 'Customer balan inne. Mama mukuth une naha wage thawama wikunanawa.', 'Thawama wikunanawa'],
      ['9–15s', 'Wi-Fi aye on. Toast: “Synced 1 offline sale(s)”. Sale eka reports wala penawa.', 'Internet aawa, KadeHub hama sale ekakma thaniwa sync karanawa.', 'Auto-synced'],
      ['15–20s', 'Owner camera ekata hinawenawa, logo end card.', 'KadeHub POS. Dawas 14 free. Link eka bio eke.', 'pos.kadehub.com · dawas 14 free']],
     'pos.kadehub.com eken dawas 14 free trial eka patan ganna. Card ona naha.', 'Authentic widihata phone eka athe thiyagena film karala, clean screen recording ekakata cut karanna.'),
    ('Notebook vs KadeHub: naya potha race eka', 'POS · 25s · TikTok / Reels · Grocery, hardware',
     'Mata naya kauda? Notebook vs KadeHub. Go.',
     [['0–3s', 'Split screen: wamata parana naya notebook ekak, dakunata KadeHub thiyena phone ekak. Timer graphic.', 'Mata naya kauda? Notebook vs KadeHub. Go.', 'NOTEBOOK vs KADEHUB'],
      ['3–12s', 'Wama: pituwa peraliyanawa, lines kapanawa. Dakuna: total outstanding saha list eka ekka Credit page.', '…', 'Timer eka duwanawa'],
      ['12–18s', 'Dakuna: customer kenek tap karala partial payment ekak record karanawa, status eka partial wenawa.', 'Thathpara dekai. Methanama payment ekak record karannath puluwan.', 'Paid: partial'],
      ['18–25s', 'Wama: thawama peraliyanawa. Owner notebook eka wahala hinawenawa.', 'Notebook ekata vishramaya denna. KadeHub dawas 14 free try karanna.', 'Free try · pos.kadehub.com']],
     '“BOOK” kiyala comment karanna, api link eka yawannam.', 'Comedy wada karanawa: notebook amaruwa wadi karala pennanna, eth karunawanthawa.'),
    ('Oyaage item eka oya hithanawata wada ganan', 'COD · 35s · Reels / TikTok / YouTube Shorts · Importers, online sellers',
     'Meka LKR 1,500ta wikunanawa. Eth oyata yana gana eeta wada wadi.',
     [['0–3s', 'Product ekak camera ekata allanawa; “LKR 1,500” price tag sticker eka.', 'Meka 1,500ta wikunanawa. Eth oyata yana gana eeta wada wadi.', 'Aththa cost = ?'],
      ['3–14s', 'Screen: item ekak add karanna. USD walin buying price, exchange rate, shipping, customs, other cost.', 'Dollar walin buying price, exchange rate, shipping, customs, packing…', 'USD → LKR + shipping + customs'],
      ['14–24s', 'Landed cost, unit ekakata profit saha margin zoom karanna.', 'KadeHub COD hama item ekakatama landed cost ekai aththa labayai hadanawa.', 'Unit ekakata profit: penawa'],
      ['24–35s', 'Product eka ekka talking head.', 'Viswasayen price danna. KadeHub COD dawas 14 free patan ganna.', 'cod.kadehub.com']],
     'cod.kadehub.com eken dawas 14 free trial eka patan ganna.', 'Aththa wage udaharanayak use karanna; screen eke numbers hariyatama ekathu wenna ona.'),
    ('Eka tap ekakin WhatsApp', 'COD · 15s · TikTok / Reels · Social-media sellers',
     'Hama order message ekakma WhatsApp eke type karanawada? Nawaththanna.',
     [['0–3s', 'Phone keyboard eke ikmanata type karanawa, speed up karala, kalakiriyen.', 'Hama order message ekakma WhatsApp eke type karanawada? Nawaththanna.', 'Type karana eka STOP'],
      ['3–10s', 'Screen: order ekak open karala WhatsApp tap karanna; full message eka liyala chat eka open wenawa. Send.', 'Eka tap ekai. Message eka liyala iwarai. Invoice PDF ekath.', 'Tap 1i'],
      ['10–15s', 'Customer reply bubble “Thank you!”. End card.', 'KadeHub COD. Dawas 14 free.', 'cod.kadehub.com']],
     'Link eka bio eke: KadeHub COD free try karanna.', None),
    ('POV: pharmacy owner saha expiry alert eka', 'POS · 25s · Reels / Facebook · Pharmacies',
     'POV: oya pharmacy owner kenek, me list eka penawa.',
     [['0–3s', 'Counter eka pitupasse pharmacist tablet ekak balala puduma wenawa.', 'POV: oya pharmacy owner kenek, me list eka penawa.', 'Dawas 30n expire wenawa'],
      ['3–13s', 'Screen: Batches → Expiring soon tab, “12 days left” ekka batch numbers.', 'Hama batch ekakma, hama expiry date ekakma, expire wenna yana ewa okkoma.', 'Batch + expiry tracking'],
      ['13–20s', 'Pharmacist e boxes issaraha shelf ekata / discount ekata danawa.', 'Expire wenna kalin wikunanna, passe newei.', 'Expired paduwa naha'],
      ['20–25s', 'End card.', 'Pharmacies walata KadeHub POS. Dawas 14 free.', 'pos.kadehub.com']],
     'Pharmacy owners la: dawas 14 free try karanna.', 'Aththa patient hari prescription thorathuru pennanna epa.'),
    ('Raa 10 salli ganan karana eka', 'POS · 30s · Facebook / Reels · Staff inna kade',
     'Raa 10i, salli ganan hariyanne naha. Aye.',
     [['0–4s', 'Andura kade, owner notes ganan karanawa, sussum helanawa.', 'Raa 10i, salli ganan hariyanne naha. Aye.', 'Aye?!'],
      ['4–14s', 'Screen: Staff → Shifts: opening cash ekka shift open karanawa; passe closing cash saha notes ekka close karanawa.', 'KadeHub eke hama shift ekakma salli ganan karala open wela close wenawa.', 'Open shift · Close shift'],
      ['14–24s', 'Shift report saha cashier performance.', 'Shift report ekai hama cashier kenekuge sales ekai penawa.', 'Shift report'],
      ['24–30s', 'Owner lights off karanawa, sahanayen. End card.', 'Kade wahanna. Salli gana baya nathuwa. KadeHub POS free try karanna.', 'Dawas 14 free']],
     'KadeHub POS dawas 14 free try karanna.', 'Staff saha shifts thiyenne Enterprise plan eke; trial eke okkoma thiyenawa.'),
    ('Me badge eka mage delivery gana beruwa', 'COD · 20s · TikTok · Online sellers',
     'Me customer orders 3k return karala. Hathara weni eka yawanawada?',
     [['0–3s', 'Screen: phone number ekka aluth order ekak; rathu warning badge eka penawa.', 'Me customer orders 3k return karala. Hathara weni eka yawanawada?', 'Return risk!'],
      ['3–12s', 'E phone eke delivered vs returned counts zoom karanna.', 'KadeHub COD hama phone number ekakma oyaage parana orders ekka check karanawa.', 'Delivered vs returned'],
      ['12–20s', 'Seller mulinma customer ta call karala confirm karanawa. End card.', 'Mulinma confirm karanna, delivery salli beraganna. Dawas 14 free.', 'cod.kadehub.com']],
     'Link eka ganna “COD” kiyala comment karanna.', 'Hama aththa phone number ekakma blur karanna.'),
    ('Awul chats walin thathpara 30n catalog ekak', 'COD · 20s · Instagram · Fashion saha beauty',
     'Mage mulu shop ekatama catalog ekak thathpara 30n haduwa.',
     [['0–3s', 'Awul product photo gallery ekak scroll karanawa.', 'Mage mulu shop ekatama catalog ekak thathpara 30n haduwa.', 'Thathpara 30 catalog'],
      ['3–14s', 'Screen: Catalog → card size, accent colour, show prices, “Only 2 left” badges thoranawa. PDF download.', 'Style ekak thorala, prices saha stock pennala, download.', 'PDF hari JPG'],
      ['14–20s', 'Iwara karapu catalog pages swipe karala customer kenekuta share karanawa.', 'Dan mage podi shop eka loku brand ekak wage.', 'Loku brand ekak wage']],
     'KadeHub COD dawas 14 free try karanna.', 'Demo shop eke brand colour eka use karanna; reveal eka satisfying karanna.'),
    ('Winadi 5n oyaage kade setup karanna', 'POS · 45–60s · YouTube Shorts / TikTok · Ona kadak',
     'Timer eka on. Mulu kadema winadi 5n setup karamu.',
     [['0–4s', 'Loku on-screen timer eka patan gannawa.', 'Timer eka on. Mulu kadema winadi 5n setup karamu.', '5:00'],
      ['4–15s', 'Sign-up: kade nama; “yourshop.kadehub.com is available”.', 'Kade nama danawa, mata mage kade address ekath labenawa.', 'yourshop.kadehub.com'],
      ['15–30s', 'Products → sample file ekka Import CSV; product list eka purawenawa.', 'Sheet ekakin mage products import karanawa. Siya ganan ekapaarata.', 'CSV import'],
      ['30–45s', 'POS: palaweni sale eka, receipt.', 'Mage palaweni sale eka. Iwarai.', 'Palaweni sale eka'],
      ['45–60s', 'Timer eka kalin nawathinawa. End card.', 'Winadi 5ta adui. Dan oyaage warak, dawas 14 free.', 'pos.kadehub.com']],
     'Free patan ganna, card ona naha.', 'Kammali kotas 2–4× speed up karanna; reveals normal speed eke thiyanna.'),
    ('Sales kiyanne labaya newei', 'COD · 30s · Reels / TikTok · Sellers, home businesses',
     'Sales 300,000k kala. Eth athata ithuru une kiyada?',
     [['0–4s', 'Talking head, screen eke loku number ekak.', 'Sales 300,000k kala. Eth athata ithuru une kiyada?', 'Sales ≠ Labaya'],
      ['4–18s', 'Screen: Reports → me masaye revenue, cost of goods, expenses, net profit.', 'Items walata giya gana, ads, delivery, kuliya adu kalama…', 'Revenue − costs − expenses'],
      ['18–26s', 'Personal and Cash tab: “Net remaining cash”.', 'Oyata aththatama ithuru wenne meka.', 'Oyata ithuru wena eka'],
      ['26–30s', 'End card.', 'Aththa labaya danaganna. KadeHub COD.', 'cod.kadehub.com']],
     'Meka save karala free try karanna.', 'Round demo numbers use karanna; avasara nathuwa aththa customer kenekuge finances pennanna epa.'),
    ('Me weekend eke wadak karaganna ona da?', 'Tasks · 20s · Facebook / TikTok · Gewal',
     'Me weekend eke cleaner kenek ona da? Eyalawa oya langata enna denna.',
     [['0–3s', 'Awul kamarayak / kaanu wena tap ekak close-up.', 'Me weekend eke cleaner kenek ona da? Eyalawa oya langata enna denna.', 'Free post karanna'],
      ['3–12s', 'Screen: task ekak post karala budget, date danawa; ratings ekka offers enawa.', 'Free post karanna. Langa inna taskers la offers yawanawa.', 'Offers compare karanna'],
      ['12–20s', 'Ekak accept karama private chat eka open wenawa. Clean kamaraya reveal.', 'Hondama kena thorala, private chat karala, wada karaganna.', 'tasks.kadehub.com']],
     'tasks.kadehub.com eke palaweni task eka free post karanna.', None),
    ('Thiyena skills walatama salli ganna', 'Tasks · 20s · TikTok / Reels · Students, freelancers',
     'Laptop ekak hadanna puluwanda? Langa inna aya ekata gewai.',
     [['0–3s', 'Tharuna kenek laptop ekak hadanawa / furniture assemble karanawa.', 'Laptop ekak hadanna puluwanda? Langa inna aya ekata gewai.', 'Langa idan salli'],
      ['3–13s', 'Screen: category saha district anuwa tasks balala price ekai message ekai ekka offer ekak yawanawa.', 'Langa thiyena jobs balala, oyaage price eka yawala, reviews hadaganna.', 'Offer ekak danna'],
      ['13–20s', 'Completed jobs saha stars ekka profile eka. End card.', 'KadeHub Tasks ekata join wenna. Free.', 'tasks.kadehub.com']],
     'Free tasker profile ekak hadanna.', 'Remote jobs-uth pennanna (design, writing, data entry).'),
]
for i, (t, meta, hook, shots, cta, note) in enumerate(SCRIPTS, 1):
    story += script(i, t, meta, hook, shots, cta, note)

story += [CondPageBreak(120 * mm), H2('Long-form YouTube outline 1: “KadeHub POS ekka podi kadeyak run karana hati” (winadi 8–12)')]
story += table(['Chapter', 'Kiyanna ona dewal', 'Pennanna'], [
    ['0:00 Hook', '“Thawama naya saha stock walata notebook ekak use karanawa nam, me video eka sathiyakata paya ganan ithuru karai.”', 'Notebook vs dashboard B-roll'],
    ['0:30 Kaatada', 'Grocery, pharmacy, hardware, retail. Eka account ekai, phone saha computer eke wada.', 'Hub page, pos.kadehub.com'],
    ['1:30 Sign up', 'Kade nama, oyaagema kade address eka, hama ekakma unlock karapu dawas 14 free trial.', 'Register screen'],
    ['2:30 Products add karanna', 'Manual add (barcode, cost, price, reorder level) saha CSV import.', 'Products page'],
    ['4:00 Sales danna', 'Search, barcode scan, cash / card / QR / naya, receipt, WhatsApp share, offline demo.', 'POS screen'],
    ['6:00 Stock saha suppliers', 'Low-stock alerts, purchase order, stock receive, batches saha expiry.', 'Inventory, Suppliers, Batches'],
    ['7:30 Customers saha naya', 'Loyalty points, credit sales, payments record karana eka.', 'Customers, Credit'],
    ['8:30 Dawasa iwara', 'Shift close, reports: top products, peak hours, stock value.', 'Staff, Reports'],
    ['10:00 Plans saha trial', 'Starter, Pro, Enterprise; trial; gewanne kohomada.', 'Pricing'],
    ['10:45 CTA', 'Free patan ganna; description eke link; udaw walata WhatsApp.', 'End screen'],
], [1, 3, 1.4], bold_first=True)
story += [H2('Long-form YouTube outline 2: “Cash-on-delivery business: mulu system eka” (winadi 8–12)')]
story += table(['Chapter', 'Kiyanna ona dewal', 'Pennanna'], [
    ['0:00 Hook', '“Godak COD sellers la eyalage aththa labaya danne naha. Me video eka iwara weddi oya danaganni.”', 'Parcels + phone B-roll'],
    ['0:30 Setup', 'Business type, brand colour, logo, “I buy stock from abroad” toggle eka.', 'Register wizard, Settings'],
    ['2:00 Items saha landed cost', 'USD/CNY walin buying price, exchange rate, shipping, customs; profit saha margin.', 'Items'],
    ['3:30 Orders', 'Order ekak hadanawa, phone check, return-risk badge, invoice number, WhatsApp message.', 'Orders'],
    ['5:00 Pipeline', 'Pending → confirmed → ongoing → delivered; returns walin stock aye enawa; labels.', 'Orders list, print labels'],
    ['6:30 Naya customers', 'Wholesale naya, due dates, reminders.', 'Credit'],
    ['7:30 Expenses saha reports', 'Ikman expense entry, net profit, personal saha cash view.', 'Expenses, Reports, Dashboard'],
    ['9:00 Catalog', 'Catalog ekak hadala share karana eka.', 'Catalog'],
    ['10:00 Plans', 'Free trial, Pro, Business; bhasha (English, Sinhala, Tamil).', 'Billing'],
    ['10:45 CTA', 'cod.kadehub.com eken free patan ganna.', 'End screen'],
], [1, 3, 1.4], bold_first=True)

# ================================================================= 13
story += section('Content pillars saha dawas 30 calendar', 'Balance mix ekak audience eka wadi karala, sales genenawa.')
story += table(['Pillar', 'Posts walin', 'Target eka', 'Udaharana'], [
    ['<b>Educate</b> (owners saha sellers la ta tips)', '30%', 'Trust saha saves', '“Hama raatriyema check karanna ona numbers 3”, “import items walata price danna hati”'],
    ['<b>Demo</b> (feature eka wada karana hati)', '30%', 'Product eka pennanna', 'Offline sale, landed cost, WhatsApp eka tap'],
    ['<b>Relate</b> (skits, POV, memes)', '20%', 'Reach saha shares', 'Notebook vs KadeHub, raa 10 salli ganan'],
    ['<b>Proof</b> (customer stories, results)', '10%', 'Sandeha thiyena aya convert karanna', 'Aththa customer walk-through (avasara aragena)'],
    ['<b>Offer</b> (direct CTA)', '10%', 'Sign-ups', '“Dawas 14 free, patan ganna hati meka”'],
], [1.8, 0.8, 1.1, 2.6])
CAL = [
    ('1', 'Relate', 'POS', 'Reel', 'Notebook vs KadeHub naya race (Script 02)'),
    ('2', 'Educate', 'COD', 'Carousel', '“COD sellers karana waradi 5”'),
    ('3', 'Demo', 'POS', 'Reel', 'Internet giya, sales giye naha (Script 01)'),
    ('4', 'Demo', 'COD', 'Reel', 'Import item ekaka aththa cost eka (Script 03)'),
    ('5', 'Educate', 'POS', 'Talking head', '“Hama kade ayiya ma raata check karanna ona numbers 3”'),
    ('6', 'Relate', 'Tasks', 'Reel', 'Me weekend eke wadak karaganna ona da? (Script 11)'),
    ('7', 'Offer', 'Hub', 'Story + post', 'Eka account, apps 3, free trial'),
    ('8', 'Demo', 'COD', 'Reel', 'Eka tap ekakin WhatsApp (Script 04)'),
    ('9', 'Demo', 'POS', 'Reel', 'Pharmacy expiry alert (Script 05)'),
    ('10', 'Educate', 'COD', 'Talking head', 'Sales kiyanne labaya newei (Script 10)'),
    ('11', 'Relate', 'POS', 'Skit', 'Raa 10 salli ganan (Script 06)'),
    ('12', 'Demo', 'COD', 'Reel', 'Thathpara 30n catalog (Script 08)'),
    ('13', 'Educate', 'Tasks', 'Reel', 'Skills walata salli (Script 12)'),
    ('14', 'Offer', 'POS', 'Live / long video', 'YouTube outline 1, live Q&amp;A'),
    ('15', 'Demo', 'POS', 'Reel', 'Winadi 5n kade setup (Script 09)'),
    ('16', 'Demo', 'COD', 'Reel', 'Return-risk badge (Script 07)'),
    ('17', 'Educate', 'POS', 'Carousel', '“Best sellers iwara wena eka nawaththana hati”'),
    ('18', 'Relate', 'COD', 'POV', 'POV: oya bedroom eke idan online shop ekak run karanawa'),
    ('19', 'Proof', 'POS', 'Interview', 'Aththa kade ayiya kenek, thathpara 60 walk-through'),
    ('20', 'Demo', 'POS', 'Reel', 'Receipt eka WhatsApp ekata + loyalty points'),
    ('21', 'Offer', 'COD', 'Story + post', 'Dawas 14 free, card ona naha'),
    ('22', 'Educate', 'COD', 'Carousel', '“Salli politely illana hati” (credit reminders)'),
    ('23', 'Demo', 'POS', 'Reel', 'Purchase order, eka click eken stock receive'),
    ('24', 'Relate', 'POS', 'Myth-bust', '“POS supermarkets walata witharai.” Waradi.'),
    ('25', 'Demo', 'COD', 'Reel', 'Orders 40kata shipping labels eka print ekakin'),
    ('26', 'Proof', 'COD', 'Interview', 'Aththa seller: “dan mama mage labaya danna hati”'),
    ('27', 'Educate', 'Hub', 'Reel', 'Phone eke wada, install karanna deyak naha'),
    ('28', 'Demo', 'COD', 'Long video', 'YouTube outline 2'),
    ('29', 'Relate', 'Tasks', 'Skit', 'Parana widihata plumber kenek hoyanawa vs Tasks'),
    ('30', 'Offer', 'Okkoma', 'Recap reel', 'Masaye best ewa + free-trial CTA'),
]
story += [H2('Dawas 30 calendar (dawasakata post 1, oyaage haikiyawata hadaganna)')]
story += table(['Dawasa', 'Pillar', 'App', 'Format', 'Idea'], [list(r) for r in CAL], [0.5, 0.8, 0.6, 1.1, 3.5], font_size=8)
story += tip('Batch production', [P('Sathiyakata eka session ekakdi videos 6–8k film karanna: talking heads walata eka setup ekak, screen recordings '
                                    'walata ekak, aththa kadeka B-roll walata ekak. Batch ekak widihata edit karanna. Dawasagane post karanna.', 'small')])

# ================================================================= 14
story += section('Platform playbook', 'Ekama message eka, hama platform ekakatama wena packaging.')
story += table(['Platform', 'Inna aya', 'Hondama formats', 'Diga', 'Post', 'Notes'], [
    ['<b>TikTok</b>', 'Tharuna sellers, side hustlers, taskers', 'Skits, POV, quick demos, trends', '15–35s', 'Dawasata 1–2', 'Thathpara 1n hook eka. Voice-over yatin trending sound. Comments walata videos walin reply karanna.'],
    ['<b>Instagram Reels</b>', 'Fashion, beauty, home businesses', 'Polished demos, before/after, carousels', '15–45s', 'Sathiyata 4–5', 'Tips walata carousels (save karanawa). Offers saha polls walata Stories.'],
    ['<b>Facebook</b>', 'Awurudu 30–55 kade ayiyala, pharmacies, wholesalers', 'Reels, diga demos, live Q&amp;A, group posts', '30–90s', 'Sathiyata 4–5', 'Kade ayiyala ta loku channel eka. Seller saha business groups wala post karanna (group rules palanna, mulinma value denna).'],
    ['<b>YouTube</b>', 'Ganna kalin research karana aya', 'Shorts + winadi 8–12 tutorials', 'Shorts 30–60s; diga winadi 8–12', 'Shorts sathiyata 3, diga masayata 2', 'Tutorials awurudu ganan search wala rank wenawa. Chapters + pehedili titles: “COD orders manage karana hati”.'],
    ['<b>WhatsApp</b>', 'Warm leads, inna customers la', 'Status videos, broadcast lists, Channel', '15–30s', 'Dawasagane Status', 'Kawadawath spam karanna epa. Ahapu aya ta witharai. Section 15 follow-up scripts use karanna.'],
    ['<b>LinkedIn</b>', 'Pharmacies, accountants, partners', 'Founder posts, case studies, carousels', 'Text + 30–60s video', 'Sathiyata 2', 'Partnerships saha B2B trust walata hondai.'],
], [0.9, 1.3, 1.3, 0.9, 0.8, 2.2], font_size=7.9)
story += [H2('Post karanna hondama welawal (test karala hadaganna)')]
story += bullets(['<b>Kade ayiyala:</b> kade arinna kalin ude (6–8), dawal nissaddha welawa (1–3), kade wahala passe (raa 9–11).',
                  '<b>Online sellers:</b> hawasa saha raa (8–12), orders walata reply karana welawa.',
                  '<b>Gewal saha taskers:</b> hawasa saha weekends.',
                  'Sathi dekakata passe oyaage analytics balala hondama welawal walata posts maru karanna.'])
story += [H2('Hashtag sets (3–6k mix karanna, kawadawath rata nam epa)')]
story += table(['Set', 'Hashtags'], [
    ['Brand', '#KadeHub #KadeHubPOS #KadeHubCOD #KadeHubTasks'],
    ['Kade ayiyala', '#ShopOwner #SmallBusiness #RetailShop #GroceryStore #PharmacyLife #POSsystem #InventoryManagement'],
    ['Online sellers', '#CashOnDelivery #OnlineSeller #OnlineBusiness #SmallBusinessOwner #InstagramShop #TikTokShop #ResellerLife'],
    ['Salli saha growth', '#BusinessTips #ProfitMargin #Entrepreneur #SideHustle #BusinessGrowth'],
    ['Tasks', '#OddJobs #Freelancer #EarnMoney #HireLocal #Handyman #CleaningServices'],
    ['Local bhasha', '#kade #vyaparaya #business  (native speaker kenek liyapu Sinhala saha Tamil akuru tags ekathu karanna)'],
], [1, 4], bold_first=True)

# ================================================================= 15
story += section('Sales strategy: views walin gewana customers la dakwa', 'Content eken kamaththa hadanawa. Me section eken eka salli karanawa.')
story += [H2('KadeHub funnel eka')]
story += table(['Stage', 'Target eka', 'Karanna ona de', 'Measure'], [
    ['<b>1. Attention</b>', 'Hari niche ekata penenna', 'Dawasagane short videos, niche hooks, group posts, ads.', 'Views, thathpara 3 hold rate'],
    ['<b>2. Interest</b>', 'Try karanna ona karanna', 'Demos, tutorials, proof stories, comment-to-get-link.', 'Profile visits, link clicks, comments'],
    ['<b>3. Conversation</b>', 'Prashna walata ikmanata uththara', 'WhatsApp (070 247 0064), DMs, call-backs, kade visits.', 'Patan gaththa leads'],
    ['<b>4. Free trial</b>', 'Eyala use karanna ganna', 'Palaweni paya 24 athuladi setup ekata udaw: products, palaweni sale eka hari order eka.', 'Trials started, trials activated (palaweni sale/order)'],
    ['<b>5. Paid</b>', 'Dawas 14ta kalin convert karanna', 'Follow-up messages, plan recommendation, payment udaw.', 'Trial-to-paid %'],
    ['<b>6. Grow</b>', 'Thiyagena wadi karanna', 'Plans upgrade, POS kade walata COD, referrals.', 'Churn, upgrades, referrals'],
], [1, 1.3, 2.5, 1.5])
story += tip('Wadagathma number eka', [P('<b>Activation:</b> palaweni dawas 2 athuladi palaweni aththa sale eka (POS) hari palaweni aththa order eka (COD) '
                                         'karana trial user kenek gewanna godak ida thiyenawa. Hama follow-up ekakma e palaweni sale ekata hari order ekata thallu karanna.', 'small')])
story += [H2('Winadi 5 kade demo eka (walk-in hari video call)')]
story += table(['Winadiya', 'Kiyanna', 'Karanna'], [
    ['0–1', '“Naya saha stock walata udaw wena deyak pennannada? Winadi 5i.” Ahanna: “Kade run karaddi amaruma de mokakda?”', 'Ahumkan denna. Eyala kiyana wachanama liyaganna.'],
    ['1–2', '“Oya hama dawasema karana wage sale ekak dannam.”', 'Search, scan, cash ganna. Receipt saha WhatsApp share pennanna.'],
    ['2–3', 'Winadi 0 kiyapu prashnayata uththara denna: naya, stock hari salli.', 'Credit page, low-stock list hari shift report.'],
    ['3–4', '“Internet giyoth…”', 'Wi-Fi off karala sale ekak dala, on karama synced.'],
    ['4–5', '“Okkoma ekka dawas 14 free. Dan oyaage kade setup karamuda?”', 'Eyalage phone eke ekata register karanna. Products import karanna hari best sellers 10 add karanna.'],
], [0.7, 2.8, 2.2], bold_first=True)
story += [H2('Trial users la ta WhatsApp follow-up sequence eka')]
story += table(['Kawadada', 'Message eka (oyaage style ekata hadaganna)'], [
    ['Dawasa 0', '“KadeHub ekata welcome! Oyaage kade ready. Products add karanna udaw ona da? Oyaage list eka ewwoth ikmanma widiya pennannam.”'],
    ['Dawasa 1', '“Podi tip ekak: ada palaweni sale eka dala receipt eka customer kenekuta WhatsApp karanna. Thathpara 10i yanne.”'],
    ['Dawasa 3', '“Low-stock alerts / landed cost try kalada? Meke thathpara 30 video ekak thiyenawa.” (short demo ekak yawanna)'],
    ['Dawasa 7', '“Oyaage trial eken bhagayak iwarai. Mokakhari therenne nathi deyak thiyenawada? Winadi 10 call ekak karanna puluwan.”'],
    ['Dawasa 11', '“Oyaage trial eka thawa dawas 3kin iwarai. Oya use karana dewal anuwa [plan] plan eka hondatama galapenawa. Bank transfer hari card walin gewana hati meka.”'],
    ['Dawasa 14', '“Ada oyaage trial eka iwarai. Oyaage products saha data araksha wela thiyenawa. Nawathinne nathuwa wikunanna plan ekak thoranna.”'],
    ['Dawasa 21', '(Gewala nathnam) “Thawama hithanawada? Nawaththanne mokakda kiyala kiyanna. Udaw karanna santhoshai.”'],
], [0.7, 5], bold_first=True)
story += [H2('Objection handling')]
story += table(['Objection', 'Uththaraya'], [
    ['“Godak ganan.”', '“Starter masayata LKR 2,999i: dawasakata LKR 100k witara. Expire wena eka box ekak hari gewanne nathi naya customer kenek eeta wada ganan. Awurudda gane gewuwoth 17%k witara ithuru.”'],
    ['“POS LKR 25,000 registration fee eka mokatada?”', '“Eka eka paarak, palaweni payment ekath ekka, oyaage kade setup karanna. Mulinma dawas 14 mulu system eka free try karala wadagath da kiyala balanna.” (Waiver ekak promise karanna kalin dan thiyena offers gana team eken ahanna.)'],
    ['“Mata computers danne naha.”', '“WhatsApp use karanna puluwan nam KadeHub use karannath puluwan. Sinhala walinuth thiyenawa. Dan oyath ekka setup karamu.”'],
    ['“Mage internet naraka.”', '“POS offline unath wikunala passe sync karanawa. Pennannam.”'],
    ['“Mama dan Excel / notebook use karanawa.”', '“Trial eka athare ewath thiyaganna. Dawas 14n passe wadiyen kiyala dunne mokakda kiyala compare karanna.”'],
    ['“Mage data araksha da?”', '“Hama business ekakatama penne eyalage data witharai. Staff ta oyaage costs, labaya nopena cashiers widihata inna puluwan.”'],
    ['“Gewana eka nawaththuwoth?”', '“Oyaage data thiyenawa. Ona welawaka plan ekak thorala nawathunu thanin patan ganna.”'],
    ['“Hithala kiyannam.”', '“Hari. Sure wenna oyata balanna ona mokakda?” Ita passe follow up karanna welawak fix karaganna.'],
], [1.4, 4])
story += [H2('Use karanna ona pricing anchors')]
story += bullets([
    'POS Starter LKR 2,999 / masayata ≈ <b>dawasakata LKR 100</b>. Pro ≈ dawasakata LKR 167. COD Pro LKR 3,500 ≈ <b>dawasakata LKR 117</b>.',
    'Eka prashnayaka gana ekka compare karanna: return wena eka COD order ekak, expire wena eka box ekak, gewanne nathi eka naya customer kenek, hama raatriyema oyaage eka payak.',
    'Awurudde gana “masa dekak free” widihata pennanna.',
    'Hama welema kiyanna: <b>dawas 14 free, card ona naha</b>. Tasks free.',
])
story += [H2('Growth ideas (KadeHub team eka approve karanna ona yojana)')]
story += [P('Mewa yojana witharai. KadeHub team eka confirm karanakal kisima discount ekak, reward ekak, commission ekak announce karanna epa.', 'small')]
story += table(['Idea', 'Wada karana hati', 'Ai'], [
    ['Referral reward', 'Inna customer kenek kadeyak refer karanawa; aluth kade eka gewuwama dennatama masayak free.', 'Kade ayiyala anith kade ayiyala wa trust karanawa.'],
    ['Creator / affiliate code', 'Hama creator kenektama code ekak hari link ekak; palaweni payment eken commission ekak.', 'Results walata gewanawa, creators la ta motivation.'],
    ['Partner network', 'Accountants, barcode-scanner saha printer wikunana aya, shop-supply distributors KadeHub recommend karanawa.', 'Eyala dan sathiyagane kade walata yanawa.'],
    ['Cross-sell', 'Online wikunana POS kade walata COD intro ekak; physical kadeyak thiyena COD sellers la ta POS intro ekak.', 'Eka account eka nisa lesi.'],
    ['Launch offer', 'Registration fee ekata hari palaweni masayata limited-time offer ekak.', 'Campaigns wala hadisi bawayak hadanawa.'],
    ['Community', 'Sathiyagane business tips ekka free WhatsApp Channel ekak hari Facebook group ekak.', 'Hama launch ekakatama warm audience ekak.'],
], [1.2, 2.8, 1.8], bold_first=True)

# ================================================================= 16
story += section('Paid ads starter kit', 'Free trial ekata yawana Facebook, Instagram, TikTok saha YouTube ads.')
story += [P('Ad copy Singlish walin liyanawa nam, ekama ad eka English walinuth test karanna. Audience eka anuwa hondata wada karanne mokakda kiyala data eken balanna.', 'small')]
story += table(['Angle', 'Primary text', 'Headline', 'Audience'], [
    ['Offline POS', 'Internet giyada? KadeHub POS thawama wikunala passe sync karanawa. Cash, card, QR, naya eka till ekakin. Dawas 14 free try karanna.', 'Internet giya. Sales giye naha.', 'Small business owners, retail, grocery, pharmacy interests'],
    ['Naya potha', 'Kauda kiyada naya kiyala hariyatama danaganna. Credit sales, partial payments, balances oyaage phone eke. Dawas 14 free, card ona naha.', 'Naya pothata vishramaya denna', 'Awurudu 28–60 kade ayiyala'],
    ['Pharmacy expiry', 'Ilanga dawas 30 athuladi expire wena hama batch ekakma, paduwak wenna kalin balanna. Pharmacies walata KadeHub POS.', 'Expired stock paduwa thawa naha', 'Pharmacists, pharmacy owners, healthcare retail'],
    ['COD labaya', 'Buying price, exchange rate, shipping, customs item ekakata hadala. Aththa labaya balanna. Free patan ganna.', 'Item ekakata aththa labaya danaganna', 'Online sellers, Facebook page admins, e-commerce interests'],
    ['WhatsApp eka tap', 'Orders, invoices, WhatsApp messages eka tap ekakin. Cash-on-delivery sellers la ta hadapu. Dawas 14 free.', 'Hama COD order ekakma control eke', 'Instagram saha TikTok shop owners'],
    ['Tasks', 'Ona job ekak free post karanna. Langa inna aya gen offers ganna, reviews compare karala hondama kena thoranna.', 'Langa inna aya lawa wada karaganna', 'Homeowners, parents, 25–55, local radius'],
], [0.9, 2.6, 1.5, 1.6], font_size=7.9)
story += [H2('Budget saha testing')]
story += bullets([
    'Podiyata patan ganna: videos 3 × audiences 2 dawas 5–7k test karala, dinapu ekata budget eka maru karanna.',
    'Bedima: <b>70%</b> proven ads, <b>20%</b> aluth creative tests, <b>10%</b> 50%+ balapu hari site ekata aapu aya retarget karanna.',
    'Trial sign-ups walata optimise karanna, nathnam sign-up tracking setup karala nathnam WhatsApp conversations walata.',
    'Dan hondata wada karana organic videos ads widihata use karanna. Polished graphics walata wada aththa screen recordings dinanawa.',
    'Sign-up ekaka cost eka wadi wenakota sathi 2–3kata sarayak creative aluth karanna.',
    'Users la ta penena ad copy hari targeting labels wala kawadawath rata nam danna epa.',
])

# ================================================================= 17
story += section('Filming saha editing guide', 'KadeHub camera eke lassanata pennana hati.')
story += [H2('Screen recording')]
story += bullets([
    '<b>Realistic sample data thiyena demo account ekak</b> use karanna (team eken illanna). Avasara nathuwa kawadawath aththa customer kenekuge data film karanna epa.',
    'Phone: portrait walin record karanna. Desktop: browser zoom eka 125–150% karala action eka watee 9:16 crop karanna.',
    'Notifications off karanna. Wena tabs hari bookmarks penne nathi clean browser ekak use karanna.',
    'Cursor eka hemin genayanna; wadagath hama number ekakadima thathpara 1k nawathinna.',
    'Wadagath kotasata zoom (1.5–2×) karanna: “Synced” toast eka, profit number eka, warning badge eka.',
    'Phone numbers, nam, bank details blur karanna.',
])
story += [H2('B-roll shot list')]
story += table(['Scene', 'Shots'], [
    ['Kade', 'Counter eke kade ayiya, barcode scan karanawa, bag ekak denawa, receipt print wenawa, shelves, stock boxes, naya notebook ekak, cash drawer eka.'],
    ['Pharmacy', 'Behet box shelves (labels close-up epa), box ekaka date eka check karanawa, counter eke tablet ekak.'],
    ['Online seller', 'Parcels pack karanawa, parcels wala labels, chats wala purawechcha phone ekak, ring light, product photos, delivery rider pick-up.'],
    ['Importer', 'Shipment ekak unbox karanawa, currency notes, calculator, spreadsheet ekka laptop eka.'],
    ['Tasks', 'Cleaning, tap ekak hadanawa, furniture assemble karanawa, laptop eke student kenek, athata athak.'],
    ['Mood', 'Raa kade wahanawa, ude kade arinawa, sahanayen inna owner, screen eke mascot sticker eka.'],
], [1, 4], bold_first=True)
story += [H2('Editing style')]
story += bullets([
    '<b>Captions hama welema on</b>, loku, mada, safe area eke (TikTok/Reels wala pahala 20% saha dakuna paththa magaharinna).',
    'Shorts wala thathpara 1–2kata sarayak cut karanna. Intros naha, mulinma logo naha: mulinma hook eka, anthimata logo eka.',
    'Voice-over: unusum, kathabaha wage, sadharana wegayata wada tikak ikmanata. English, Sinhala hari Tamil; code-mixing hondai.',
    'Music: voice eka yatin adu sound eken; platform-licensed tracks witharai.',
    'End card (thathpara 2–3): logo, app address (pos. / cod. / tasks.kadehub.com), “Dawas 14 free” hari “Join wenna free”.',
    'Thumbnails (YouTube): hangimak thiyena muhunak + wachana 3–4 + phone screen ekak. Udaharanayak: calculator ekka “AATHTHA LABAYA?”.',
])
story += [H2('Brand kit')]
swatches = [('Teal', '#00796B', TEAL), ('Dark teal', '#004D40', TEAL_D), ('Light teal', '#E0F2F1', TEAL_L),
            ('Amber', '#FFB703', AMBER), ('Navy', '#0F172A', NAVY), ('COD blue', '#2563EB', BLUE), ('Tasks amber', '#B45309', AMBER_D)]
sw = Table([[Table([['']], colWidths=[20 * mm], rowHeights=[11 * mm],
                   style=[('BACKGROUND', (0, 0), (-1, -1), c), ('BOX', (0, 0), (-1, -1), 0.5, LINE)]) for _, _, c in swatches],
            [Paragraph(f'<b>{n}</b><br/>{h}', style('swt', fontSize=7.5, leading=9.5, alignment=TA_CENTER, spaceAfter=0)) for n, h, _ in swatches]],
           colWidths=[CONTENT_W / len(swatches)] * len(swatches))
sw.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
story += [sw, gap(8)]
story += table(['Element', 'Rule eka'], [
    ['Font', '<b>Poppins</b> (headings bold 700–800, body 500–600). Sinhala akuru: Noto Sans Sinhala.'],
    ['Logo', 'Sudu hari light backgrounds wala teal “K” mark + “Kadehub” wordmark; photos hari dark backgrounds wala mono version eka. Adinna, colour maru karanna, effects danna epa.'],
    ['Product colours', 'POS = teal, COD = blue, Tasks = amber. End cards saha thumbnails wala hari colour eka use karanna.'],
    ['Buttons saha CTAs', 'Website eke “Choose an app” button eka wage amber background eka saha navy text.'],
    ['Mascot', 'Capybara: friendly, calm. Intros, stickers, end cards walata use karanna.'],
    ['Nama', '<b>KadeHub</b> kiyala liyanna (capital K saha H). Product nam: KadeHub POS, KadeHub COD, KadeHub Tasks.'],
], [1, 4], bold_first=True)

# ================================================================= 18
story += section('Karanna ona saha epa dewal, brand rules', 'Brand eka araksha karanna. Trust eka thiyaganna.')
dd = Table([[
    [P('KARANNA', style('do', fontName='Pop800', fontSize=13, textColor=TEAL, spaceAfter=4))] + bullets([
        'Aththa app eka wada karana hati pennanna.',
        'Hama CTA ekakama free trial eka kiyanna.',
        'Liyawili avasara ekka witharak aththa customer stories use karanna.',
        'Screen eke numbers realistic saha ekama widihata thiyanna.',
        'Hama comment ekakatama paya 24 athuladi reply karanna.',
        'Leads WhatsApp 070 247 0064 hari official.kadehub@gmail.com ekata yawanna.',
        'Post karanna kalin kadehub.com eke dan prices check karanna.',
        'Oyaage audience katha karana English, Sinhala hari Tamil use karanna.',
        'Mascot wa use karala tone eka friendly thiyanna.',
    ], style('dob', parent=S['bullet'], fontSize=9)),
    [P('EPA', style('dont', fontName='Pop800', fontSize=13, textColor=CORAL, spaceAfter=4))] + bullets([
        'Kisima bhashawakin, kisima thanaka rata nam kiyanna.',
        '“Kiyanna EPA claims” list eke features claim karanna (section 07).',
        'Testimonials, user counts hari results hadanna.',
        'Aththa customers la ge phone numbers, nam hari finances pennanna.',
        'Team eka approve nokarapu discounts, waivers hari commissions promise karanna.',
        'Kade ayiyala ta hinahenna. Eyalath ekka hinawenna, eyala ta newei.',
        'Competitor kenekuge logo copy karanna hari eyala gana naraka widihata kiyanna.',
        'POS hari COD gana “free forever” kiyanna.',
        'Licence nathi music hari images use karanna.',
    ], style('dontb', parent=S['bullet'], fontSize=9)),
]], colWidths=[CONTENT_W / 2 - 4, CONTENT_W / 2 - 4])
dd.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('BACKGROUND', (0, 0), (0, 0), TEAL_L),
                        ('BACKGROUND', (1, 0), (1, 0), CORAL_L), ('LEFTPADDING', (0, 0), (-1, -1), 10),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 10),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 10)]))
story += [dd, gap(12)]
story += [H2('Publish karanna kalin checklist eka')]
story += bullets(['Palaweni thathpara 1–3 athule hook ekak thiyenawada?', 'Eka niche ekai, eka idea ekai, eka CTA ekai da?', 'Captions on da, spelling hari da?',
                  'Rata nam naha, aththa customer data naha, approve nokarapu claims naha da?', 'Hari app address eka saha “dawas 14 free” ekka end card ekak thiyenawada?',
                  'Thumbnail/cover eka podi phone screen ekaka kiyawanna puluwanda?', 'Caption eke CTA ekai hashtags 3–6i thiyenawada?'], mark='□')

# ================================================================= 19
story += section('KPIs saha sathipatha review eka', 'Measure karana eka thamai hoda wenne.')
story += table(['Metric', 'Eken kiyanne', 'Hoda disawa'], [
    ['Thathpara 3 hold rate', 'Hook eka wada karanawada?', 'Wadi. Adu nam palaweni line ekai palaweni frame ekai maru karanna.'],
    ['Average watch time / completion', 'Video eka interesting da?', 'Wadi. Hemin yana kotas cut karanna.'],
    ['Saves saha shares', 'Prayojanawath da hari relatable da?', 'Wadi. Tips walata saves, skits walata shares.'],
    ['Profile visits saha link clicks', 'Minissu thawa balanna kamathi da?', 'Wadi. CTAs shakthimath karanna.'],
    ['WhatsApp / DM leads', 'Aththa ganna kamaththa', 'Wadi. Ikmanata reply karanna.'],
    ['Trials started', 'Sales pipeline eke udama', 'Hama sathiyakama wadi.'],
    ['Trials activated (palaweni sale / order)', 'Eyala gewaida?', 'Wadi. Palaweni paya 24 athuladi setup ekata udaw karanna.'],
    ['Trial-to-paid conversion', 'Product ekai follow-up ekai wada karanawada?', 'Wadi. Follow-ups hoda karanna.'],
    ['Trial ekakata saha gewana customer kenekuta cost', 'Ads labadayida?', 'Adu. Weak ads nawaththanna.'],
    ['Churn (gewala passe cancel kala)', 'Customers la santhosha da?', 'Adu. Ai kiyala ahala hadanna.'],
], [1.6, 1.8, 2.4], bold_first=True)
story += [H2('Sathipatha winadi 30 review eka')]
story += numbered([
    'Giya sathiye posts views, hold rate, saves, shares, link clicks ekka list karanna.',
    'Top 2 saha bottom 2 hoyanna. Hook eke, niche eke hari format eke wenas une mokakda?',
    'Content saha ads walin aapu leads, trials, activations, payments ganan karanna.',
    'Hama comment ekakma, DM prashnayakma kiyawanna. Aye aye ena hama prashnayakma aluth video idea ekak.',
    'Ilanga sathiya plan karanna: dinapu ewa aluth hooks ekka remakes 2k, aluth experiment 1k, ithuru ewa calendar eken.',
    'Insights KadeHub team ekka share karanna (feature requests, nithara ena objections, app eke therenne nathi thana).',
])

# ================================================================= 20
story += section('Appendix: CTAs, captions, glossary saha links', 'Copy karanna, paste karanna, publish karanna.')
story += [H2('CTA bank')]
story += bullets([
    'Oyaage dawas 14 free trial eka patan ganna. Card ona naha.',
    'Link eka bio eke: KadeHub dawas 14 free try karanna.',
    '“SHOP” kiyala comment karanna, mama link eka yawannam.',
    'Ilanga stock count ekata meka save karaganna.',
    'Thawama notebook use karana kade ayiya kenekuta meka yawanna.',
    'Free demo ekakata 070 247 0064 WhatsApp karanna.',
    'tasks.kadehub.com eke palaweni task eka free post karanna.',
    'Eka account ekai, business ekata ona hama tool ekama. kadehub.com',
])
story += [H2('Caption templates')]
story += table(['Type', 'Template'], [
    ['Prashnaya → wisanduma', '[Eka line ekakin prashnaya] → [KadeHub eka hadana hati eka line ekakin]. [App] dawas 14 free try karanna. Link eka bio eke.  [hashtags]'],
    ['Tip', 'Hama [niche] kenektama [karanna] ona dewal [ganana]. Save karaganna. 1) … 2) … 3) …  #[n] eka KadeHub automatically karanawa. [CTA]'],
    ['Story', '[Nama] kalin [parana widiya]. Dan KadeHub ekka [aluth widiya]. Wenasa? [eyalage wachanawalin result eka]. [CTA]'],
    ['Prashnaya (question)', 'Awankawa kiyanna: dan [wade] karanne kohomada? A) notebook B) Excel C) WhatsApp D) KadeHub. Pahala comment karanna.'],
    ['Offer', 'Dawas 14 free. Card naha. Okkoma unlock. KadeHub [App], [app address].'],
], [1.1, 4], bold_first=True)
story += [H2('Glossary (creators la ta lesi wachana walin)')]
story += table(['Wachanaya', 'Theruma'], [
    ['POS', 'Point of sale: customers la ta bill danna till eka hari counter screen eka.'],
    ['COD', 'Cash on delivery: parcel eka aapuwama customer gewanawa.'],
    ['Landed cost', 'Item ekak oya langata enakota mulu cost eka: buying price, exchange, shipping, customs saha anith wiyadam.'],
    ['Margin', 'Wikunana gana walin labaya kiyada kiyala percent walin.'],
    ['SKU', 'Stock eke eka item ekakata thiyena product code eka.'],
    ['Batch / expiry', 'Ekama welawe hadapu ekama product eke group ekak, thamange expiry date ekka.'],
    ['Credit sale (naya)', 'Customer passe gewana sale ekak.'],
    ['LANKAQR', 'KadeHub POS till eke “QR” kiyala penena local QR payment widiya.'],
    ['Purchase order (PO)', 'Stock walata supplier kenekuta yawana order eka.'],
    ['Shift', 'Salli ganan karala open karala close karana eka cashier kenekuge wada kalaya.'],
    ['Tasker', 'KadeHub Tasks eke jobs karana kena.'],
    ['Free trial', 'Gewanne nathuwa POS hari COD dawas 14k, ita passe plan ekak thoranna.'],
], [1.1, 4], bold_first=True)
story += [H2('Links saha contacts')]
story += table(['Mokakda', 'Koheda'], [
    ['KadeHub (hama app ekakma, sign in, account)', 'kadehub.com'],
    ['KadeHub POS', 'pos.kadehub.com'],
    ['KadeHub COD', 'cod.kadehub.com'],
    ['KadeHub Tasks', 'tasks.kadehub.com'],
    ['Kadeyaka thamange address eka', 'yourshop.kadehub.com'],
    ['WhatsApp', '070 247 0064'],
    ['Email', 'official.kadehub@gmail.com'],
], [2, 3], bold_first=True)
story += [gap(14)]
end = Table([[mascot('capybara-love.webp', 26 * mm),
              [P('KadeHub story eka kiyana ekata sthuthi!', style('ty', fontName='Pop700', fontSize=13, textColor=WHITE, spaceAfter=3)),
               P('Prashna, demo accounts hari aluth feature news: WhatsApp 070 247 0064 hari official.kadehub@gmail.com.',
                 style('ty2', fontSize=9.5, leading=13.5, textColor=TEAL_L, spaceAfter=0))]]],
            colWidths=[34 * mm, CONTENT_W - 34 * mm])
end.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), TEAL_D), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                         ('LEFTPADDING', (0, 0), (-1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 10),
                         ('BOTTOMPADDING', (0, 0), (-1, -1), 10), ('ROUNDEDCORNERS', [6, 6, 6, 6])]))
story += [end]

build(story, os.path.join(HERE, 'KadeHub-Content-Creator-Playbook-Singlish.pdf'))
