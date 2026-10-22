"""Builds docs/marketing/KadeHub-Content-Creator-Playbook.pdf (English edition).

Run from anywhere:  python docs/marketing/build_playbook.py
Layout lives in playbook_kit.py; the Singlish edition is build_playbook_singlish.py.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playbook_kit import *  # noqa: E402,F401,F403
from playbook_kit import HERE  # noqa: E402

# ================================================================= CONTENT
story = [Spacer(1, 1), NextPageTemplate('body'), PageBreak()]

# ---- TOC
toc = TableOfContents()
toc.dotsMinLevel = 0
toc.levelStyles = [style('toc0', fontName='Seg', fontSize=10.5, leading=15, leftIndent=0, firstLineIndent=0, spaceAfter=1.5)]
story += [P('Contents', style('ct', fontName='Pop800', fontSize=24, leading=30, textColor=TEAL_D, spaceAfter=4)),
          P('Click any line to jump to that section. The PDF also has bookmarks in the side panel.', 'toc_note'),
          gap(8), toc]

# ================================================================= 01 HOW TO USE
story += section('How to use this playbook', 'Start here. Ten minutes to read, a lifetime of content ideas.')
story += [P('This playbook is your brief. It explains what KadeHub is, who it is for, what to say, and what to film. '
            'Every feature in here exists in the product today. If something is not in this book, ask the KadeHub '
            'team before you say it on camera.', 'lead')]
story += table(['If you have…', 'Read this', 'Then do this'], [
    ['10 minutes', '02 KadeHub in 60 seconds, 07 Features to market first', 'Pick 3 hooks from section 11 and film one screen-recording.'],
    ['1 hour', 'Add 04–06 Product deep dives and 08 Niches', 'Shoot 2 scripts from section 12 for your strongest niche.'],
    ['1 day', 'Everything, plus a 20-minute play in a demo account', 'Plan your first 30 days with the calendar in section 13.'],
    ['A sales call or a shop visit', '15 Sales strategy', 'Use the 5-minute demo script and the WhatsApp follow-ups.'],
], [1, 2, 2.4], bold_first=True)
story += [H2('The 5 golden rules')]
story += numbered([
    '<b>Show the app, not slides.</b> Screen recordings of a real sale, a real order or a real report beat any graphic.',
    '<b>Lead with the pain, then the fix.</b> “Still writing debts in a book?” works better than “KadeHub has a credit module”.',
    '<b>One video, one idea.</b> One feature, one niche, one call to action.',
    '<b>Speak their language.</b> English, Sinhala or Tamil, the way shop owners and sellers really talk.',
    '<b>Always end with the free trial.</b> 14 days free on POS and COD, no card needed. Tasks is free.',
])
story += warn('Brand rule: never name a country', [P(
    'KadeHub is positioned as a platform for growing businesses everywhere. Do not say or write any country name '
    '(in any language) in videos, captions, thumbnails or hashtags. Say “local shops”, “your town”, “businesses like '
    'yours”. Talking about LKR prices, LANKAQR and the Sinhala and Tamil languages is fine.', 'small')])

# ================================================================= 02 IN 60 SECONDS
story += section('KadeHub in 60 seconds', 'What it is, in words a shop owner understands.')
story += [P('One account. Every tool your business needs.', 'quote'),
          P('KadeHub is a set of simple business apps that share one login. Use one, or all of them together.', style('c', parent=S['lead'], alignment=TA_CENTER)), gap(4)]
story += table(['App', 'Address', 'In one line', 'Best for', 'Price'], [
    ['<b>KadeHub POS</b>', 'pos.kadehub.com', 'Point of sale, inventory and CRM for local shops. Sell, count stock, track credit, see reports.',
     'Grocery stores, pharmacies, hardware and retail shops', 'From LKR 2,999 / month. 14-day free trial.'],
    ['<b>KadeHub COD</b>', 'cod.kadehub.com', 'Cash-on-delivery orders, landed costs and invoices. Know your real profit per item.',
     'Online sellers, importers and social-media shops', 'From LKR 3,500 / month. 14-day free trial.'],
    ['<b>KadeHub Tasks</b>', 'tasks.kadehub.com', 'Post a task, get offers from local taskers. Or earn by doing jobs.',
     'Busy households, small businesses and skilled freelancers', 'Free to use.'],
], [1.1, 1.3, 2.6, 2, 1.5])
story += [H2('The elevator pitch (say this in 15 seconds)')]
story += box(None, [P('“KadeHub gives small businesses simple apps that work on any phone or computer. <b>KadeHub POS</b> runs your '
                     'shop counter, stock and credit book. <b>KadeHub COD</b> runs your cash-on-delivery orders and shows your real profit. '
                     '<b>KadeHub Tasks</b> helps you find people nearby to get jobs done. One account, nothing to install, and a 14-day free trial.”',
                     style('ep', parent=S['body'], fontSize=10.5, leading=15.5))])
story += [H2('Why it is different')]
story += table(['Promise', 'What it means for the customer'], [
    ['One login', 'Sign in once and move between POS, COD and Tasks without signing in again.'],
    ['Nothing to install', 'Works in the browser on desktop, tablet and phone.'],
    ['Your language', 'English and Sinhala across the apps. KadeHub COD is fully in Tamil too, including invoices and catalogs.'],
    ['Keeps selling offline', 'KadeHub POS saves sales when the internet drops and syncs them when you are back online.'],
    ['Local payments', 'Cash, card, QR (LANKAQR) and credit at one till. Prices in LKR.'],
    ['Pay for what you use', 'Each app has its own plan and free trial. Add another app when you need it.'],
    ['Your own shop address', 'POS shops get their own web address, like yourshop.kadehub.com.'],
    ['Your data stays yours', 'Every business sees only its own data, in every app.'],
], [1, 3.4], bold_first=True)
story += [CondPageBreak(60 * mm), H2('Meet the mascot')]
mrow = Table([[mascot('capybara-happy.webp', 30 * mm),
               [P('KadeHub’s friendly <b>capybara</b> appears across the apps with tips and greetings: “Hi there! Welcome to KadeHub.” '
                  'Use it in thumbnails, intros, stickers and end cards. A calm, friendly capybara fits the brand voice: '
                  'business made simple, no stress.'),
                P('Poses available in <font face="Pop600">frontend/public/mascot</font>: happy, love, curious, celebrate, plus scenes '
                  'for work, grow, relax and sleep. Ask the team for full-resolution files.', 'small')]]],
             colWidths=[36 * mm, CONTENT_W - 36 * mm])
mrow.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
story += [mrow]

# ================================================================= 03 PROBLEM
story += section('The problems we solve', 'Content starts with pain. These are the real headaches of our customers.')
story += [P('Every great KadeHub video starts with a moment the viewer has lived through. Use these as the opening scene, '
            'then show the app fixing it.', 'lead')]
story += [H2('Shop owners (KadeHub POS)')]
story += table(['The pain (in their words)', 'What it costs them', 'The KadeHub fix'], [
    ['“The cash in the drawer never matches at night.”', 'Stress, arguments with staff, money that quietly goes missing.', 'Open and close shifts with opening and closing cash, then see a shift report.'],
    ['“I only find out something is finished when a customer asks for it.”', 'Lost sales and customers who go to the next shop.', 'Live stock levels with low-stock alerts.'],
    ['“The internet went off and the queue stopped.”', 'Lost sales at the busiest time.', 'Keeps selling offline. Sales sync when you are back online.'],
    ['“We threw away a box of expired medicine again.”', 'Pure loss, and a risk for pharmacies.', 'Batch and expiry tracking with “expiring soon” and “expired” lists.'],
    ['“Half my customers buy on credit and the book is a mess.”', 'Money you will never collect.', 'Credit sales tied to the customer, with outstanding, partial and paid status.'],
    ['“I order from suppliers by phone and forget what I ordered.”', 'Over-stocking, under-stocking, disputes.', 'Purchase orders. Receiving an order adds the stock automatically.'],
    ['“I do not know which products actually make money.”', 'Decisions by guesswork.', 'Top products, revenue by category, peak selling hours, stock value and potential profit.'],
], [2, 1.7, 2.2])
story += [H2('Online and cash-on-delivery sellers (KadeHub COD)')]
story += table(['The pain', 'What it costs them', 'The KadeHub fix'], [
    ['“My orders are spread across WhatsApp, Messenger and a notebook.”', 'Missed orders, double sending, angry customers.', 'One order pipeline: pending, confirmed, ongoing, delivered, returned, cancelled.'],
    ['“I sell a lot but I do not know if I make a profit.”', 'Selling at a loss without knowing.', 'Landed cost per item (buying price, exchange rate, shipping, customs) and profit per unit.'],
    ['“The same customer keeps returning orders.”', 'Delivery fees wasted on returns.', 'Customer trust badge: delivered and returned counts for the same phone number.'],
    ['“Making invoices one by one takes forever.”', 'Hours lost every week.', 'Automatic numbered invoices with your logo, ready to print or share as PDF.'],
    ['“Typing every order message on WhatsApp is tiring.”', 'Slow replies and typos.', 'One tap opens WhatsApp with the order message written for you.'],
    ['“My product photos and prices are all over the place.”', 'Weak, unprofessional look.', 'Catalog generator: a neat PDF or JPG catalog in your brand colour.'],
    ['“Business money and my own money are mixed up.”', 'No idea what you really earn.', 'Owner-only personal expense log, monthly budget and “net remaining cash”.'],
], [2, 1.7, 2.2])
story += [H2('Households and freelancers (KadeHub Tasks)')]
story += table(['The pain', 'The KadeHub fix'], [
    ['“I need a plumber or a cleaner and I do not know who to trust.”', 'Post a task for free, compare offers, see ratings and completed jobs.'],
    ['“I don’t want my number all over the internet.”', 'Phone numbers and emails stay hidden in public until you pick someone.'],
    ['“I have skills and free time but no customers.”', 'Build a tasker profile, browse tasks near you, make offers and collect reviews.'],
], [2, 3])

# ================================================================= 04 PRODUCT DEEP DIVES: POS
story += section('Product deep dive: KadeHub POS', 'pos.kadehub.com — “A fast counter, a tidy stockroom.”')
story += [P('<b>Positioning:</b> “Ring up sales in seconds, keep every product counted, and see how the day went before you lock up.” '
            '<b>Landing headline:</b> “Smart retail, simplified.”', 'lead')]
story += [H2('Features, benefits and what to film')]
story += table(['Feature', 'Benefit (say this)', 'Show this on screen'], [
    ['<b>Fast checkout</b>', 'Ring up a sale in seconds.', 'Search a product (F2 jumps to search), tap items into the cart, take payment, receipt pops up.'],
    ['<b>Barcode scanning</b>', 'Beep, beep, done. No typing.', 'A USB barcode scanner adding items to the cart in scan mode.'],
    ['<b>Cash, card, QR, credit</b>', 'Every way to pay at one till.', 'The four payment buttons. Pay one sale by QR, the next on credit.'],
    ['<b>Keeps selling offline</b>', 'Internet down? Keep selling.', 'Turn Wi-Fi off, make a sale (“Offline: Sale queued”), turn it on, “Synced 1 offline sale”.'],
    ['<b>Receipts + WhatsApp</b>', 'Send the bill to the customer’s phone.', 'Print the customer receipt, then tap WhatsApp share.'],
    ['<b>Live stock + low-stock alerts</b>', 'Never run out of best sellers.', 'Inventory list with in-stock, low-stock and out-of-stock badges.'],
    ['<b>CSV product import</b>', 'Set up a whole shop in minutes.', 'Upload a CSV of up to 500 products; the list fills up.'],
    ['<b>Batch and expiry</b>', 'Sell before it expires, not after.', 'The Expiring soon (30 days) tab with days-left labels.'],
    ['<b>Customers and loyalty</b>', 'Turn walk-ins into regulars.', 'Customer profile: purchase history and loyalty points (1 point per LKR 100).'],
    ['<b>Credit book</b>', 'Know exactly who owes you what.', 'Credit page: outstanding total, then record a partial payment.'],
    ['<b>Discounts</b>', 'Run promotions without a calculator.', 'Create “Weekend 10% Off” with a minimum purchase and dates.'],
    ['<b>Suppliers + purchase orders</b>', 'Order smarter, receive in one click.', 'Create a PO, click Receive, watch stock go up.'],
    ['<b>Expenses</b>', 'See profit, not just sales.', 'Log rent and electricity by category; category summary.'],
    ['<b>Staff and shifts</b>', 'Cash that matches, every shift.', 'Open shift with opening cash, close it, open the shift report.'],
    ['<b>Audit log + roles</b>', 'Know who did what.', 'Admin vs cashier access; audit log filtered by date.'],
    ['<b>Reports</b>', 'Know what sells and when.', 'Top products, revenue trend, sales by hour (“peak selling times”), stock value.'],
    ['<b>Your own shop address</b>', 'Look professional from day one.', 'Sign-up: type a shop name, see “yourshop.kadehub.com is available”.'],
    ['<b>English and Sinhala</b>', 'Your staff can use it in their language.', 'Tap the EN / සිං switch; the whole screen changes.'],
], [1.45, 1.6, 2.9])
story += [H2('POS plans')]
story += table(['Plan', 'Monthly', 'Yearly', 'Staff', 'What is included'], [
    ['Starter', 'LKR 2,999', 'LKR 29,990', 'Up to 3', 'POS checkout, inventory, basic reports. Email support.'],
    ['Pro  (Most popular)', 'LKR 4,999', 'LKR 49,990', 'Up to 10', 'Starter + customers and loyalty, suppliers, expenses. Priority support.'],
    ['Enterprise', 'LKR 9,999', 'LKR 99,990', 'Unlimited', 'Everything: + analytics, staff and shifts, credit, discounts, batches and expiry. Dedicated support.'],
], [1.3, 1, 1, 0.8, 3.3], bold_first=True)
story += bullets([
    '<b>14-day free trial with every module unlocked.</b> No payment needed to start.',
    'Yearly billing saves about 17% (two months free).',
    'A one-time registration fee of LKR 25,000 applies with the first paid subscription. Mention it honestly when asked; see objection handling in section 15.',
    'Payment by bank transfer (upload the slip) or online card payment.',
])
story += tip('Selling tip: the plan ladder', [P(
    'Most features shop owners get excited about in a demo (credit book, batches and expiry, shifts, analytics) are on '
    '<b>Enterprise</b>. During the trial they get everything. In content, show the full experience, then in sales calls '
    'match the plan to what they actually used during the trial.', 'small')])

# ---- COD
story += section('Product deep dive: KadeHub COD', 'cod.kadehub.com — “Every cash-on-delivery order, under control.”')
story += [P('“Know what each item really costs you, move orders from pending to delivered, and send invoices to customers in a tap.” '
            'Built around how cash-on-delivery sellers actually work: <b>buy, list, take orders, deliver, collect.</b>', 'lead')]
story += table(['Feature', 'Benefit (say this)', 'Show this on screen'], [
    ['<b>Set up in under 5 minutes</b>', 'Pick what you sell and you are ready.', 'The 3-step wizard: choose one of 12 business types (fashion, beauty, electronics, food…) and a brand colour.'],
    ['<b>Landed cost calculator</b>', 'See the real cost of every item.', 'Enter a buying price in USD or CNY, exchange rate, shipping and customs; profit and margin appear.'],
    ['<b>6-stage order pipeline</b>', 'Every order in one place.', 'Status cards with counts and totals; move an order from pending to delivered.'],
    ['<b>Stock follows orders</b>', 'Stock is always right.', 'Mark delivered: stock goes down. Mark returned: stock comes back.'],
    ['<b>Automatic invoices</b>', 'Professional invoices in one tap.', 'An A4 invoice (INV-2026-0001) with logo and brand colour.'],
    ['<b>WhatsApp sharing</b>', 'Keep customers in the loop.', 'Tap WhatsApp: the chat opens with the order message already written.'],
    ['<b>Customer trust badge</b>', 'Spot customers who return orders.', 'The warning “This customer has returned 2 or more orders.”'],
    ['<b>Shipping labels</b>', 'Pack faster.', 'Print a labels page (8 per A4 sheet, up to 80 orders).'],
    ['<b>Catalog generator</b>', 'Look like a big brand.', 'Generate a PDF or JPG catalog with prices and “Only 2 left” badges, share it.'],
    ['<b>Credit and reminders</b>', 'Collect what wholesale buyers owe.', 'Balances per customer, overdue bucket, WhatsApp payment reminder.'],
    ['<b>Expenses</b>', 'Log costs in seconds.', 'Keypad entry with quick amount chips and duplicate warning.'],
    ['<b>Reports and profit</b>', 'Know your real profit.', 'Revenue, cost of goods, expenses, net profit for any date range.'],
    ['<b>Personal and cash view</b>', 'Know what you really keep.', 'Owner-only “Net remaining cash” and tips like “Pay yourself first”.'],
    ['<b>Search and filters</b>', 'Find any order fast.', 'Search by invoice, customer or phone; filter by date and status.'],
    ['<b>Three languages</b>', 'Invoices in your customer’s language.', 'Switch to Sinhala or Tamil; invoices and catalogs follow.'],
    ['<b>Staff access</b>', 'Staff take orders without seeing your profits.', 'Cashier role: no costs, profit, expenses or reports.'],
], [1.45, 1.6, 2.9])
story += [H2('COD plans')]
story += table(['Plan', 'Monthly', 'Items', 'Orders / month', 'Highlights'], [
    ['Free (trial plan)', 'LKR 0', '20', '30', '14-day trial, printable invoices, basic dashboard.'],
    ['Pro  (Most popular)', 'LKR 3,500', '300', '500', 'Expenses and reports, Premium (bulk status changes, per-item units, trend charts), priority support.'],
    ['Business', 'LKR 9,500', 'Unlimited', 'Unlimited', 'For high-volume sellers. Everything in Pro.'],
], [1.4, 0.9, 0.8, 1, 3.3], bold_first=True)
story += bullets(['Every new business starts with a <b>14-day free trial</b>, no card needed.',
                  'Monthly or yearly. Pay by bank transfer or online card (OnePay).',
                  'Data stays: “Your items, orders and settings stay exactly as you left them.”'])

# ---- TASKS
story += section('Product deep dive: KadeHub Tasks', 'tasks.kadehub.com — “Get anything done by people near you.”')
story += [P('A local marketplace. People post jobs; taskers send offers; the poster picks one. '
            '<b>Free to post. Free to join.</b> You pay the tasker directly once the job is done.', 'lead')]
story += table(['Feature', 'Benefit (say this)', 'Show this on screen'], [
    ['<b>Post for free</b>', 'Describe it, set a budget, done.', 'The 3-step post wizard: title, details, photos, budget (from LKR 500), date.'],
    ['<b>Offers come to you</b>', 'Compare prices side by side.', 'A task with several offers showing price, rating and message.'],
    ['<b>One-click accept</b>', 'The agreed price is locked in.', 'Accept an offer; the others close automatically.'],
    ['<b>Public Q&amp;A</b>', 'Everyone sees the answers.', 'Tasker asks a question, poster replies.'],
    ['<b>Contact details protected</b>', 'Your number stays private.', 'A phone number in public text replaced by “[contact hidden]”.'],
    ['<b>Private chat</b>', 'Talk details once you choose.', 'Private messages between poster and assigned tasker.'],
    ['<b>Real reviews only</b>', 'Ratings reflect real jobs.', 'Both sides leave 1–5 stars after the job.'],
    ['<b>Tasker profile</b>', 'Earn on your own schedule.', 'Profile with skills, completed jobs, reviews and “Phone verified” badge.'],
    ['<b>Remote or in person</b>', 'Local jobs or online work.', 'Filters: in person, remote, by district, by budget.'],
    ['<b>17 categories</b>', 'Help with almost anything.', 'Cleaning, moving, handyman, plumbing, tutoring, design, data entry and more.'],
], [1.45, 1.6, 2.9])
story += info('Why Tasks matters to the whole brand', [P(
    'Tasks is free, so it is the easiest “yes” in KadeHub. Use it to grow the KadeHub account base and brand awareness, '
    'then introduce POS and COD to business owners who sign up. Shop owners can also use Tasks to hire help for deliveries, '
    'shelf stacking, signage and design.', 'small')])

# ================================================================= 05 MONEY FEATURES
story += section('The features to market first', 'Ranked by how fast they turn a viewer into a free-trial sign-up.')
story += [P('Not every feature sells equally. These are the “money features”: simple to show in 15 seconds, '
            'tied to a pain people feel every day, and different from a notebook or Excel.', 'lead')]
story += table(['#', 'Feature', 'App', 'Why it sells', 'Best video format'], [
    ['1', 'Keeps selling offline', 'POS', 'The fear of losing sales when the internet drops is universal. Very visual: Wi-Fi off, sale still works.', 'Side-by-side “other system vs KadeHub”, 15s.'],
    ['2', 'Landed cost and real profit per item', 'COD', 'Most online sellers do not know their real margin. A big “aha” moment.', 'Calculator walk-through with a real product, 30s.'],
    ['3', 'Credit book (debts)', 'POS + COD', 'Every shop has a credit book problem. Instantly relatable.', 'Notebook vs app comedy skit, 20s.'],
    ['4', 'WhatsApp order message and invoice in one tap', 'COD', 'Sellers live on WhatsApp. Saves time on every single order.', 'Speed challenge: typing vs one tap, 15s.'],
    ['5', 'Batch and expiry alerts', 'POS', 'Pharmacies and groceries lose real money to expiry.', 'POV pharmacy owner, 20s.'],
    ['6', 'Stock follows orders / low-stock alerts', 'POS + COD', 'Stops overselling and lost sales.', 'Screen recording with zoom-ins, 20s.'],
    ['7', 'Shift cash reconciliation', 'POS', 'Ends the nightly “where did the money go?” argument.', 'Night-closing story, 30s.'],
    ['8', 'Return-risk customer badge', 'COD', 'Saves wasted delivery fees. Sellers love it.', 'Storytime: “this customer returned 3 orders…”, 20s.'],
    ['9', 'Catalog generator', 'COD', 'Makes small sellers look like big brands. Shareable result.', 'Before/after reveal, 15s.'],
    ['10', 'One account for every app + free trial', 'All', 'Low risk, easy start.', 'End card on every video.'],
], [0.3, 1.6, 0.8, 2.6, 1.7])
story += tip('Feature combo that wins demos', [P(
    '<b>POS:</b> sale while offline → receipt on WhatsApp → low-stock alert → credit sale → end-of-day report. '
    '<b>COD:</b> landed cost → new order → WhatsApp message → mark delivered (stock drops) → profit report. '
    'Each combo fits in 60 seconds of screen recording.', 'small')])
story += warn('Claims you must NOT make (not in the product today)', bullets([
    'SMS messages or SMS receipts (WhatsApp sharing yes, SMS no).',
    'Scanning barcodes with the phone camera (POS supports USB/keyboard barcode scanners).',
    'Tamil in KadeHub POS or Tasks (Tamil is fully supported in KadeHub COD only).',
    'Automatic discounts at the till (discounts are created in the Discounts page; cashiers add a discount amount manually).',
    'Multi-branch / multi-store management from one dashboard.',
    'Courier integration or automatic tracking (COD stores a tracking number you type in).',
    'A downloadable mobile app from an app store (KadeHub runs in the browser: “nothing to install”).',
    'Fake numbers like “10,000 shops use KadeHub” or invented testimonials.',
], 'small'))

# ================================================================= 07 NICHES
story += section('Niches and target audiences', 'Who to talk to, what hurts, and the angle that makes them stop scrolling.')
story += [P('Pick <b>one niche per video</b>. A video for “pharmacy owners” beats a video for “businesses”. '
            'Priority shows where to start: A = start now, B = second wave, C = test later.', 'lead')]
NICHES = [
    ['A', 'Grocery stores and mini-marts', 'POS', 'Credit book chaos, cash not matching, stock running out, internet drops.', 'Credit book, offline sales, low stock, shifts.', 'Facebook, TikTok', '“Your kade’s credit book is costing you money.”'],
    ['A', 'Social-media sellers (Facebook, Instagram, TikTok shops)', 'COD', 'Orders scattered in chats, no idea of profit, returns.', 'Order pipeline, WhatsApp share, return badge, profit report.', 'TikTok, Instagram, FB groups', '“You sold 200 orders. Did you make a profit?”'],
    ['A', 'Importers (buy abroad, sell locally)', 'COD', 'Exchange rates, shipping and customs make real cost unclear.', 'Landed cost calculator, margin per item.', 'YouTube, Facebook', '“Your price is wrong because you forgot customs.”'],
    ['A', 'Pharmacies', 'POS', 'Expired stock losses, batch tracking, fast checkout.', 'Batch and expiry, barcode, stock.', 'Facebook, LinkedIn, WhatsApp', '“How much expired medicine did you throw away this year?”'],
    ['B', 'Fashion and beauty sellers', 'COD', 'Many items, sizes, many small orders, need a nice catalog.', 'Business-type presets, catalog generator, invoices with logo.', 'Instagram, TikTok', '“Make your small shop look like a big brand.”'],
    ['B', 'Hardware, bookshops, stationery, phone accessory shops', 'POS', 'Thousands of small items, suppliers, credit to builders and schools.', 'CSV import, barcode, purchase orders, credit.', 'Facebook, YouTube', '“3,000 small items. Zero idea what is in stock?”'],
    ['B', 'Wholesale sellers on credit', 'COD', 'Retailers pay late; reminders feel awkward.', 'Credit balances, due buckets, WhatsApp reminder.', 'WhatsApp, Facebook', '“Stop chasing payments. Send a polite reminder in one tap.”'],
    ['B', 'Home-based food, cake and gift businesses', 'COD', 'Orders by message, costs not counted, no invoices.', 'Food business type, orders, expenses, profit.', 'Instagram, TikTok', '“Your cake business is a real business. Run it like one.”'],
    ['B', 'Households needing help', 'Tasks', 'Hard to find trusted cleaners, movers, repair people.', 'Free posting, offers, reviews, hidden contacts.', 'Facebook, TikTok', '“Need a plumber by Saturday? Let them come to you.”'],
    ['B', 'Students, freelancers and skilled workers', 'Tasks', 'Want extra income on their own schedule.', 'Tasker profile, browse tasks, reviews.', 'TikTok, Instagram', '“Weekend side hustle: get paid for skills you already have.”'],
    ['C', 'Accountants and business consultants (partners)', 'POS + COD', 'Clients bring messy books.', 'Reports, expenses, profit, audit log.', 'LinkedIn', '“Get clean numbers from your clients without chasing them.”'],
    ['C', 'Small businesses needing occasional help', 'Tasks', 'Short jobs: deliveries, signage, shelf stacking, design.', 'Post a task, compare offers.', 'Facebook, LinkedIn', '“Hire help for one afternoon, not one year.”'],
]
story += table(['Pri.', 'Niche', 'App', 'Main pains', 'Features that fix it', 'Platforms', 'Hook angle'], NICHES,
               [0.35, 1.3, 0.55, 1.6, 1.5, 0.9, 1.6], font_size=7.8)
story += [H2('Content-creator meta-niches (where your audience already is)')]
story += table(['Meta-niche', 'Content style', 'How KadeHub fits'], [
    ['Small business tips', 'Quick tips, “3 mistakes”, checklists', 'KadeHub is the tool behind the tip.'],
    ['Online selling and side hustles', 'Storytime, “how I run my shop”, behind the scenes', 'COD as the back office of an online shop; Tasks for side income.'],
    ['Money and personal finance', 'Budgeting, “where does my money go?”', 'COD’s personal and cash view; profit vs sales.'],
    ['Day-in-the-life / POV', 'Vlog of a shop owner or seller', 'The app appears naturally during the day.'],
    ['Tech made simple', 'App reviews and tutorials', 'Screen-recorded walk-throughs, “set up in 5 minutes”.'],
    ['Comedy and relatable skits', 'Shop owner vs customer, boss vs cashier', 'The “credit book” and “cash doesn’t match” jokes.'],
], [1.4, 1.8, 2.6], bold_first=True)
story += [H2('Who it is NOT for (yet)')]
story += bullets(['Restaurants that need table service, kitchen tickets or menu modifiers.',
                  'Large chains that need many branches managed from one dashboard.',
                  'Businesses that need a native app from an app store.'], 'bullet')
story += [P('Do not target these audiences in ads. Wrong-fit customers churn and leave bad reviews.', 'small')]

# ---- objections per niche
story += [H2('Top objections by niche and how to answer them')]
story += table(['Niche', 'They say…', 'You say…'], [
    ['Grocery', '“I’m fine with my book.”', '“Your book can’t tell you who owes you money for 60 days, or warn you when sugar is running out. Try it 14 days free and keep the book too.”'],
    ['Grocery', '“The internet is bad here.”', '“KadeHub POS keeps selling offline and syncs later. Turn your Wi-Fi off in the demo and see.”'],
    ['Pharmacy', '“I need batch numbers.”', '“Every batch has a number, manufactured and expiry dates, and an expiring-soon list.”'],
    ['Online sellers', '“I just use WhatsApp.”', '“Keep using WhatsApp. KadeHub writes the order message for you and keeps every order in one list.”'],
    ['Importers', '“I already know my cost.”', '“Does it include the exchange rate, shipping and customs per unit? KadeHub works it out on every item.”'],
    ['Taskers', '“Is it safe?”', '“Contact details are hidden until you’re chosen, and only people who worked together can review each other.”'],
], [0.9, 1.4, 3.6], bold_first=True)

# ================================================================= 08 PERSONAS
story += section('Customer personas', 'Write and film for one person at a time.')
PERSONAS = [
    ('Saman, 46 — grocery kade owner', 'POS', [
        '<b>Shop:</b> neighbourhood grocery, 1 helper, open 6 am to 10 pm. Sells on credit to regulars.',
        '<b>A day:</b> opens the shop, takes deliveries from 4 suppliers, writes credit in a notebook, counts cash at night and it rarely matches.',
        '<b>Wants:</b> to know who owes what, and to stop running out of best sellers.',
        '<b>Fears:</b> “computers are complicated”, the internet going down, monthly fees.',
        '<b>On:</b> Facebook, YouTube, WhatsApp groups. Watches videos in Sinhala.',
        '<b>Message that works:</b> “Your credit book and cash drawer, sorted on one screen. Works even when the internet doesn’t.”']),
    ('Dilani, 38 — pharmacy owner', 'POS', [
        '<b>Shop:</b> busy pharmacy with 2 assistants.',
        '<b>A day:</b> serves customers fast, checks expiry dates by hand, orders from distributors.',
        '<b>Wants:</b> zero expired stock, quick billing with barcodes, staff accountability.',
        '<b>On:</b> Facebook, LinkedIn, professional WhatsApp groups.',
        '<b>Message that works:</b> “See every batch that expires in the next 30 days before it becomes a loss.”']),
    ('Fathima, 27 — Instagram fashion seller', 'COD', [
        '<b>Business:</b> sells dresses and accessories on Instagram and TikTok, cash on delivery, 15–40 orders a week.',
        '<b>A day:</b> answers DMs, writes order details, packs parcels, chases returns.',
        '<b>Wants:</b> to look professional, to stop losing orders in chats, to know real profit.',
        '<b>On:</b> Instagram, TikTok, Facebook seller groups. Watches reels at night.',
        '<b>Message that works:</b> “Your shop on Instagram, your back office on KadeHub. Orders, invoices and profit in one place.”']),
    ('Kasun, 31 — gadget importer', 'COD', [
        '<b>Business:</b> imports phone accessories, sells online and to small shops on credit.',
        '<b>A day:</b> tracks exchange rates, shipping and customs in a spreadsheet; chases wholesale payments.',
        '<b>Wants:</b> exact landed cost and margin per item, and reminders for unpaid balances.',
        '<b>On:</b> YouTube, Facebook, TikTok.',
        '<b>Message that works:</b> “Buy in USD or CNY, add shipping and customs once, see your real profit per unit.”']),
    ('Nirosha, 35 — busy parent (Tasks poster)', 'Tasks', [
        '<b>Needs:</b> a cleaner before a family event, a handyman for a leaking tap, a tutor for her child.',
        '<b>Wants:</b> trustworthy people, fair prices, privacy.',
        '<b>Message that works:</b> “Post it free. Get offers. Pick the one with the best reviews.”']),
    ('Ravi, 22 — student and tasker', 'Tasks', [
        '<b>Skills:</b> design, computer help, moving furniture on weekends.',
        '<b>Wants:</b> extra money on his own schedule and a reputation that grows.',
        '<b>Message that works:</b> “Turn your free weekend into paid work near you.”']),
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
story += [P('Personas are illustrative, not real customers. When you get real customers, film their story with permission.', 'small')]

# ================================================================= 09 MESSAGING
story += section('Messaging framework', 'One voice across every video, caption and ad.')
story += [H2('Positioning statement')]
story += box(None, [P('For <b>shop owners and online sellers</b> who are tired of notebooks, scattered chats and guessing their profit, '
                     '<b>KadeHub</b> is a set of simple business apps with one login that run your counter, your cash-on-delivery orders '
                     'and the jobs around your business. Unlike complicated or foreign software, KadeHub works in your language, with '
                     'local payments, keeps selling offline, and starts with a free trial.', style('ps', parent=S['body'], fontSize=10.3, leading=15))])
story += [H2('Taglines (approved from the product)')]
story += table(['Use for', 'Tagline'], [
    ['Brand / KadeHub hub', '“One account. Every tool your business needs.”'],
    ['Brand alternative', '“Three apps. One KadeHub.”'],
    ['KadeHub POS', '“Smart retail, simplified.”  /  “A fast counter, a tidy stockroom.”'],
    ['KadeHub COD', '“Every cash-on-delivery order, under control.”'],
    ['KadeHub Tasks', '“Get anything done by people near you.”'],
    ['Closing line', '“Start with the app you need today.”'],
], [1.3, 3.7], bold_first=True)
story += [H2('New taglines to test')]
story += bullets(['“Your shop, sorted.”', '“Stop guessing. Start knowing.”', '“From notebook to KadeHub.”',
                  '“Sell more. Stress less.”', '“Every rupee, counted.”', '“Your back office, in your pocket.”',
                  '“Know your real profit.” (COD)', '“The internet went off. Your sales didn’t.” (POS)'])
story += [H2('Three value pillars')]
story += table(['Pillar', 'Message', 'Proof in the product'], [
    ['<b>Simple</b>', 'Anyone can use it, in their language, on any device.', 'Browser-based, English and Sinhala (+ Tamil in COD), set up in minutes, CSV import.'],
    ['<b>In control</b>', 'Know your stock, your money and your profit at a glance.', 'Low-stock alerts, credit book, shift reports, landed cost, profit reports.'],
    ['<b>Made for local business</b>', 'Built around how local shops and sellers really work.', 'LKR, LANKAQR, cash-on-delivery, WhatsApp sharing, offline sales.'],
], [1, 2.2, 3], bold_first=False)
story += [H2('Tone of voice')]
story += table(['We are', 'We are not'], [
    ['Friendly, like a helpful neighbour', 'Corporate or salesy'],
    ['Simple: short words, short sentences', 'Technical: no “cloud”, “SaaS”, “multi-tenant”, “JWT”'],
    ['Confident and honest', 'Exaggerating or making fake claims'],
    ['Respectful of small businesses', 'Mocking people who use notebooks (joke with them, not at them)'],
    ['Local and warm (code-mixing is fine)', 'Naming countries or politics'],
], [1, 1])
story += [H2('Words to use and words to avoid')]
story += table(['Use', 'Avoid'], [
    ['shop, kade, counter, till, stock, credit book, orders, profit', 'ERP, SaaS, multi-tenant, cloud-native, enterprise solution'],
    ['“free trial, no card needed”', '“free forever” (POS and COD are paid after 14 days)'],
    ['“works on your phone, nothing to install”', '“download our app”'],
    ['“keeps selling offline”', '“works 100% offline” (it syncs when back online)'],
    ['“see your real profit”', '“guaranteed more sales”, “double your income”'],
], [1, 1])

# ================================================================= 10 HOOKS
story += section('Hook library', '70+ scroll-stopping first lines. Under 3 seconds each.')
story += [P('The hook is the first 1–3 seconds: spoken line + on-screen text + a strong first visual. '
            'Pair every hook with a visual that matches it (a notebook, a cash drawer, a pile of parcels, a phone full of chats). '
            'Swap words to fit your niche.', 'lead')]
n = 1
groups = [
    ('Pain hooks', TEAL, TEAL_L, [
        'Still writing customer debts in a notebook?',
        'Your cash drawer didn’t match again last night, right?',
        'The internet went off and your queue stopped. Again.',
        'How much expired stock did you throw away this month?',
        'Your orders are in WhatsApp, Messenger and a notebook. That’s the problem.',
        'You found out a product was finished when the customer asked for it.',
        'You sold 200 orders this month. Do you know your profit?',
        'That customer returned their third order. You paid the delivery again.',
        'Typing the same order message 40 times a day? Stop.',
        'You’re working 14 hours in your shop and still don’t know where the money goes.',
    ]),
    ('Curiosity hooks', BLUE, BLUE_L, [
        'This shop owner turned off the Wi-Fi… and kept selling.',
        'I found out why my shop was losing money. It was this.',
        'The one screen every shop owner should check before closing.',
        'This tiny badge saved a seller thousands in delivery fees.',
        'Watch what happens when I mark this order as delivered.',
        'Most online sellers don’t know this number. Do you?',
        'I made a professional catalog for my shop in 30 seconds.',
        'What a 22-year-old earned last weekend doing small jobs nearby.',
    ]),
    ('Money and numbers hooks', AMBER_D, AMBER_L, [
        'KadeHub POS costs about LKR 100 a day. One expired box costs more.',
        'Your item costs LKR 1,200, not 900. Here’s why.',
        'This is how much your credit book is really costing you.',
        'Buying in dollars, selling in rupees? Do this math first.',
        'Three numbers every shop owner must know every night.',
        'Sales are not profit. Let me show you the difference in 20 seconds.',
        'One returned order wipes out the profit of three. Here’s how to stop it.',
    ]),
    ('Comparison and before/after hooks', TEAL, TEAL_L, [
        'Notebook vs KadeHub. Let’s race.',
        'Typing an invoice vs one tap. Guess who wins.',
        'My shop before KadeHub… and after.',
        'Excel sheet vs a real order pipeline.',
        'How a big supermarket checks stock vs how you can do it today.',
        'Same shop, same day: with and without low-stock alerts.',
    ]),
    ('POV and storytelling hooks', BLUE, BLUE_L, [
        'POV: you’re a pharmacy owner and this alert pops up.',
        'POV: it’s 10 pm and the cash finally matches.',
        'POV: you run an online shop from your bedroom.',
        'Day in the life of a kade owner who stopped using a notebook.',
        'Storytime: the customer who owed me money for 4 months.',
        'POV: your helper is at the till and you’re at home. You still know every sale.',
        'I asked a shop owner what stresses them most. The answer…',
    ]),
    ('Challenge, tutorial and list hooks', AMBER_D, AMBER_L, [
        'Set up your whole shop in 5 minutes. Timer starts now.',
        '3 signs your shop needs a POS system.',
        '5 mistakes online sellers make with cash on delivery.',
        'How to send an invoice on WhatsApp in one tap.',
        'How to know your real profit per item (save this).',
        'The 30-second end-of-day routine for shop owners.',
        '3 free things you can do today to stop losing stock.',
        'Watch me turn 20 products into a catalog.',
    ]),
    ('Myth-busting hooks', TEAL, TEAL_L, [
        '“POS systems are only for supermarkets.” Wrong.',
        '“I need a computer for this.” You don’t. Your phone works.',
        '“Shop software is too expensive.” Let’s do the math.',
        '“My staff can’t use apps.” It’s in Sinhala.',
        '“If the internet goes down, I can’t sell.” Not anymore.',
        '“Cash on delivery can’t be organised.” Watch this.',
    ]),
    ('Direct call-out hooks', BLUE, BLUE_L, [
        'Grocery shop owners, stop scrolling.',
        'If you sell on Instagram with cash on delivery, this is for you.',
        'Pharmacy owners, this one feature is for you.',
        'Importers: stop pricing your items wrong.',
        'Need a cleaner, a plumber or a mover this week?',
        'Good with your hands? People nearby will pay you.',
        'Running a home business? Watch this before your next order.',
    ]),
    ('Sinhala / Singlish hooks (polish with a native speaker)', TEAL, TEAL_L, [
        'Thawama naya potha liyanawada?  (Still writing the credit book?)',
        'Rathriyata salli ganan hariyanne nadda?  (Cash doesn’t match at night?)',
        'Internet giyath bill danna bariwenawada?  (Can’t bill when the internet goes?)',
        'Expire wela badu visi karanawada?  (Throwing away expired stock?)',
        'COD order okkoma WhatsApp eke hoyanawada?  (Searching every COD order on WhatsApp?)',
        'Oyage ethta labaya kiyada danne nadda?  (Don’t know your real profit?)',
    ]),
    ('Tamil / Tanglish hooks for KadeHub COD and Tasks (polish with a native speaker)', BLUE, BLUE_L, [
        'Innum order ellam WhatsApp-la theduringala?  (Still searching orders on WhatsApp?)',
        'Ungal unmaiyana laabam evvalavu theriyuma?  (Do you know your real profit?)',
        'Invoice Tamil-la, oru tap-la!  (Invoice in Tamil, in one tap!)',
        'Kadan kanakku innum notebook-la-va?  (Credit accounts still in a notebook?)',
    ]),
]
for title, col, bgc, hooks in groups:
    flow, n = hook_list(title, hooks, col, bgc, n)
    story += flow
story += tip('Hook formula', [P('<b>[Call-out or pain] + [specific detail] + [promise of a fix].</b>  Example: “Pharmacy owners (call-out), '
                                 'that box of expired medicine (detail) didn’t have to happen (promise).” Keep the first word on screen within 0.5 s.', 'small')])

# ================================================================= 11 SCRIPTS
story += section('Ready-to-shoot video scripts', '12 short videos (15–60s) and 2 YouTube outlines. Film, edit, post.')
story += [P('Format: vertical 9:16, 1080×1920. Screen recordings come from a demo account with realistic sample data '
            '(ask the KadeHub team for one). Captions on every video. Times are a guide.', 'lead')]
SCRIPTS = [
    ('The internet went off. The sales didn’t.', 'POS · 20s · Reels / TikTok / Shorts · Grocery, any shop',
     'The internet just went off in my shop… watch this.',
     [['0–3s', 'Shop counter. Owner taps the Wi-Fi icon off on the phone. Close-up of “Offline”.', 'The internet just went off in my shop… watch this.', 'Internet OFF'],
      ['3–9s', 'Screen recording: add 3 items to cart, take cash payment. “Offline: Sale queued”.', 'Customer’s waiting. I keep selling like nothing happened.', 'Still selling'],
      ['9–15s', 'Wi-Fi back on. Toast: “Synced 1 offline sale(s)”. Sale appears in reports.', 'Internet’s back, and KadeHub syncs every sale by itself.', 'Auto-synced'],
      ['15–20s', 'Owner smiles at camera, logo end card.', 'KadeHub POS. Free for 14 days. Link in bio.', 'pos.kadehub.com · 14 days free']],
     'Start your 14-day free trial at pos.kadehub.com. No card needed.', 'Film the phone in hand for authenticity, then cut to a clean screen recording.'),
    ('Notebook vs KadeHub: the credit book race', 'POS · 25s · TikTok / Reels · Grocery, hardware',
     'Who owes me money? Notebook vs KadeHub. Go.',
     [['0–3s', 'Split screen: left a worn credit notebook, right a phone with KadeHub. Timer graphic.', 'Who owes me money? Notebook vs KadeHub. Go.', 'NOTEBOOK vs KADEHUB'],
      ['3–12s', 'Left: flipping pages, crossing out lines. Right: Credit page with total outstanding and the list.', '…', 'Timer running'],
      ['12–18s', 'Right: tap a customer, record a partial payment, status changes to partial.', 'Two seconds. And I can record a payment right here.', 'Paid: partial'],
      ['18–25s', 'Left: still flipping. Owner closes the notebook, laughs.', 'Retire the notebook. Try KadeHub free for 14 days.', 'Try free · pos.kadehub.com']],
     'Comment “BOOK” and we’ll send you the link.', 'Comedy works: exaggerate the notebook struggle, but keep it kind.'),
    ('Your item costs more than you think', 'COD · 35s · Reels / TikTok / YouTube Shorts · Importers, online sellers',
     'You’re selling this for LKR 1,500. But it costs you more than you think.',
     [['0–3s', 'Hold a product to camera; price tag sticker “LKR 1,500”.', 'You’re selling this for 1,500. But it costs you more than you think.', 'Real cost = ?'],
      ['3–14s', 'Screen: add item. Buying price in USD, exchange rate, shipping, customs, other cost.', 'Buying price in dollars, exchange rate, shipping, customs, packing…', 'USD → LKR + shipping + customs'],
      ['14–24s', 'Zoom on landed cost, profit per unit and margin.', 'KadeHub COD works out the landed cost and your real profit on every item.', 'Profit per unit: shown'],
      ['24–35s', 'Talking head with product.', 'Price with confidence. Start free for 14 days on KadeHub COD.', 'cod.kadehub.com']],
     'Start your free 14-day trial at cod.kadehub.com.', 'Use a real-looking example; numbers must add up on screen.'),
    ('One tap to WhatsApp', 'COD · 15s · TikTok / Reels · Social-media sellers',
     'Typing every order message on WhatsApp? Stop.',
     [['0–3s', 'Fast typing on phone keyboard, sped up, frustrated face.', 'Typing every order message on WhatsApp? Stop.', 'STOP typing'],
      ['3–10s', 'Screen: open an order, tap WhatsApp; chat opens with the full message written. Send.', 'One tap. The message is already written. The invoice PDF too.', '1 tap'],
      ['10–15s', 'Customer reply bubble “Thank you!”. End card.', 'KadeHub COD. Free for 14 days.', 'cod.kadehub.com']],
     'Link in bio: try KadeHub COD free.', None),
    ('POV: pharmacy owner and the expiry alert', 'POS · 25s · Reels / Facebook · Pharmacies',
     'POV: you’re a pharmacy owner and this list pops up.',
     [['0–3s', 'Pharmacist behind counter, looks at a tablet, surprised.', 'POV: you’re a pharmacy owner and this list pops up.', 'Expiring in 30 days'],
      ['3–13s', 'Screen: Batches → Expiring soon tab, batch numbers with “12 days left”.', 'Every batch, every expiry date, and what’s about to expire.', 'Batch + expiry tracking'],
      ['13–20s', 'Pharmacist moves those boxes to the front shelf / discount.', 'Sell it before it expires, not after.', 'No more expired losses'],
      ['20–25s', 'End card.', 'KadeHub POS for pharmacies. 14 days free.', 'pos.kadehub.com']],
     'Pharmacy owners: try it free for 14 days.', 'Do not show real patient or prescription information.'),
    ('The 10 pm cash count', 'POS · 30s · Facebook / Reels · Shops with staff',
     'It’s 10 pm and the cash doesn’t match. Again.',
     [['0–4s', 'Dim shop, owner counting notes, sighs.', 'It’s 10 pm and the cash doesn’t match. Again.', 'Again?!'],
      ['4–14s', 'Screen: Staff → Shifts: open shift with opening cash; later close with closing cash and notes.', 'With KadeHub, every shift opens and closes with a cash count.', 'Open shift · Close shift'],
      ['14–24s', 'Shift report and cashier performance.', 'You see the shift report and every cashier’s sales.', 'Shift report'],
      ['24–30s', 'Owner turns off lights, relaxed. End card.', 'Close the shop. Not your eyes on the cash. Try KadeHub POS free.', '14 days free']],
     'Try KadeHub POS free for 14 days.', 'Staff and shifts are on the Enterprise plan; the trial includes everything.'),
    ('This badge saved my delivery fees', 'COD · 20s · TikTok · Online sellers',
     'This customer has returned 3 orders. Would you send a fourth?',
     [['0–3s', 'Screen: new order with phone number; red warning badge appears.', 'This customer has returned 3 orders. Would you send a fourth?', 'Return risk!'],
      ['3–12s', 'Zoom on delivered vs returned counts for that phone.', 'KadeHub COD checks every phone number against your past orders.', 'Delivered vs returned'],
      ['12–20s', 'Seller calls customer to confirm first. End card.', 'Confirm first, save your delivery money. Free for 14 days.', 'cod.kadehub.com']],
     'Comment “COD” for the link.', 'Blur all real phone numbers.'),
    ('From messy chats to a catalog in 30 seconds', 'COD · 20s · Instagram · Fashion and beauty',
     'I made a catalog for my whole shop in 30 seconds.',
     [['0–3s', 'Scrolling a chaotic photo gallery of products.', 'I made a catalog for my whole shop in 30 seconds.', '30-second catalog'],
      ['3–14s', 'Screen: Catalog → pick card size, accent colour, show prices, “Only 2 left” badges. Download PDF.', 'Pick a style, show prices and stock, download.', 'PDF or JPG'],
      ['14–20s', 'Swipe through the finished catalog pages; share to a customer.', 'Now my small shop looks like a big brand.', 'Look like a big brand']],
     'Try KadeHub COD free for 14 days.', 'Use the brand colour of the demo shop; make the reveal satisfying.'),
    ('Set up your shop in 5 minutes', 'POS · 45–60s · YouTube Shorts / TikTok · Any shop',
     'Timer’s on. Let’s set up a whole shop in 5 minutes.',
     [['0–4s', 'Big on-screen timer starts.', 'Timer’s on. Let’s set up a whole shop in 5 minutes.', '5:00'],
      ['4–15s', 'Sign-up: shop name; “yourshop.kadehub.com is available”.', 'Shop name, and I get my own shop address.', 'yourshop.kadehub.com'],
      ['15–30s', 'Products → Import CSV with sample file; product list fills.', 'Import my products from a sheet. Hundreds at once.', 'CSV import'],
      ['30–45s', 'POS: first sale, receipt.', 'And my first sale. Done.', 'First sale'],
      ['45–60s', 'Timer stops early. End card.', 'Under 5 minutes. Your turn, free for 14 days.', 'pos.kadehub.com']],
     'Start free, no card needed.', 'Speed up the boring parts 2–4×; keep the reveals at normal speed.'),
    ('Sales are not profit', 'COD · 30s · Reels / TikTok · Sellers, home businesses',
     'You made 300,000 in sales. But how much did you keep?',
     [['0–4s', 'Talking head, big number on screen.', 'You made 300,000 in sales. But how much did you keep?', 'Sales ≠ Profit'],
      ['4–18s', 'Screen: Reports → revenue, cost of goods, expenses, net profit for this month.', 'Take away what the items cost you, your ads, delivery and rent…', 'Revenue − costs − expenses'],
      ['18–26s', 'Personal and Cash tab: “Net remaining cash”.', 'And this is what you actually keep.', 'What you keep'],
      ['26–30s', 'End card.', 'Know your real profit. KadeHub COD.', 'cod.kadehub.com']],
     'Save this and try it free.', 'Use round demo numbers; never show a real customer’s finances without permission.'),
    ('Need it done this weekend?', 'Tasks · 20s · Facebook / TikTok · Households',
     'Need a cleaner this weekend? Let them come to you.',
     [['0–3s', 'Messy room / leaking tap close-up.', 'Need a cleaner this weekend? Let them come to you.', 'Post it free'],
      ['3–12s', 'Screen: post a task, set budget, date; offers arrive with ratings.', 'Post it free. Taskers nearby send you offers.', 'Compare offers'],
      ['12–20s', 'Accept one, private chat opens. Clean room reveal.', 'Pick the best one, chat privately, get it done.', 'tasks.kadehub.com']],
     'Post your first task free at tasks.kadehub.com.', None),
    ('Get paid for skills you already have', 'Tasks · 20s · TikTok / Reels · Students, freelancers',
     'You can fix a laptop? People nearby will pay you for that.',
     [['0–3s', 'Young person fixing a laptop / assembling furniture.', 'You can fix a laptop? People nearby will pay you for that.', 'Earn nearby'],
      ['3–13s', 'Screen: browse tasks by category and district; send an offer with price and message.', 'Browse jobs near you, send your price, build your reviews.', 'Make an offer'],
      ['13–20s', 'Profile with completed jobs and stars. End card.', 'Join KadeHub Tasks. It’s free.', 'tasks.kadehub.com']],
     'Create your free tasker profile.', 'Show remote jobs too (design, writing, data entry).'),
]
for i, (t, meta, hook, shots, cta, note) in enumerate(SCRIPTS, 1):
    story += script(i, t, meta, hook, shots, cta, note)

story += [CondPageBreak(120 * mm), H2('Long-form YouTube outline 1: “How to run a small shop with KadeHub POS” (8–12 min)')]
story += table(['Chapter', 'What to cover', 'Show'], [
    ['0:00 Hook', '“If you still use a notebook for credit and stock, this video will save you hours every week.”', 'Notebook vs dashboard B-roll'],
    ['0:30 Who it is for', 'Grocery, pharmacy, hardware, retail. One account, works on phone and computer.', 'Hub page, pos.kadehub.com'],
    ['1:30 Sign up', 'Shop name, your own shop address, 14-day free trial with everything unlocked.', 'Register screen'],
    ['2:30 Add products', 'Manual add (barcode, cost, price, reorder level) and CSV import.', 'Products page'],
    ['4:00 Make sales', 'Search, barcode scan, cash / card / QR / credit, receipt, WhatsApp share, offline demo.', 'POS screen'],
    ['6:00 Stock and suppliers', 'Low-stock alerts, purchase order, receive stock, batches and expiry.', 'Inventory, Suppliers, Batches'],
    ['7:30 Customers and credit', 'Loyalty points, credit sales, recording payments.', 'Customers, Credit'],
    ['8:30 End of day', 'Shift close, reports: top products, peak hours, stock value.', 'Staff, Reports'],
    ['10:00 Plans and trial', 'Starter, Pro, Enterprise; trial; how to pay.', 'Pricing'],
    ['10:45 CTA', 'Start free; link in description; WhatsApp for help.', 'End screen'],
], [1, 3, 1.4], bold_first=True)
story += [H2('Long-form YouTube outline 2: “Cash-on-delivery business: the full system” (8–12 min)')]
story += table(['Chapter', 'What to cover', 'Show'], [
    ['0:00 Hook', '“Most COD sellers don’t know their real profit. By the end of this video you will.”', 'Parcels + phone B-roll'],
    ['0:30 Set up', 'Business type, brand colour, logo, “I buy stock from abroad” toggle.', 'Register wizard, Settings'],
    ['2:00 Items and landed cost', 'Buying price in USD/CNY, exchange rate, shipping, customs; profit and margin.', 'Items'],
    ['3:30 Orders', 'Create an order, phone check, return-risk badge, invoice number, WhatsApp message.', 'Orders'],
    ['5:00 Pipeline', 'Pending → confirmed → ongoing → delivered; returns restore stock; labels.', 'Orders list, print labels'],
    ['6:30 Credit customers', 'Wholesale on credit, due dates, reminders.', 'Credit'],
    ['7:30 Expenses and reports', 'Fast expense entry, net profit, personal and cash view.', 'Expenses, Reports, Dashboard'],
    ['9:00 Catalog', 'Generate and share a catalog.', 'Catalog'],
    ['10:00 Plans', 'Free trial, Pro, Business; languages (English, Sinhala, Tamil).', 'Billing'],
    ['10:45 CTA', 'Start free at cod.kadehub.com.', 'End screen'],
], [1, 3, 1.4], bold_first=True)

# ================================================================= 12 PILLARS + CALENDAR
story += section('Content pillars and 30-day calendar', 'A balanced mix keeps the audience growing and buying.')
story += table(['Pillar', 'Share of posts', 'Goal', 'Examples'], [
    ['<b>Educate</b> (tips for owners and sellers)', '30%', 'Build trust and saves', '“3 numbers to check every night”, “how to price imported items”'],
    ['<b>Demo</b> (feature in action)', '30%', 'Show the product', 'Offline sale, landed cost, WhatsApp one tap'],
    ['<b>Relate</b> (skits, POV, memes)', '20%', 'Reach and shares', 'Notebook vs KadeHub, the 10 pm cash count'],
    ['<b>Proof</b> (customer stories, results)', '10%', 'Convert doubters', 'Real customer walk-through (with permission)'],
    ['<b>Offer</b> (direct CTA)', '10%', 'Sign-ups', '“14 days free, here’s how to start”'],
], [1.8, 0.8, 1.1, 2.6])
CAL = [
    ('1', 'Relate', 'POS', 'Reel', 'Notebook vs KadeHub credit race (Script 02)'),
    ('2', 'Educate', 'COD', 'Carousel', '“5 mistakes COD sellers make”'),
    ('3', 'Demo', 'POS', 'Reel', 'Internet went off, sales didn’t (Script 01)'),
    ('4', 'Demo', 'COD', 'Reel', 'Real cost of an imported item (Script 03)'),
    ('5', 'Educate', 'POS', 'Talking head', '“3 numbers every shop owner must check at night”'),
    ('6', 'Relate', 'Tasks', 'Reel', 'Need it done this weekend? (Script 11)'),
    ('7', 'Offer', 'Hub', 'Story + post', 'One account, three apps, free trial'),
    ('8', 'Demo', 'COD', 'Reel', 'One tap to WhatsApp (Script 04)'),
    ('9', 'Demo', 'POS', 'Reel', 'Pharmacy expiry alert (Script 05)'),
    ('10', 'Educate', 'COD', 'Talking head', 'Sales are not profit (Script 10)'),
    ('11', 'Relate', 'POS', 'Skit', 'The 10 pm cash count (Script 06)'),
    ('12', 'Demo', 'COD', 'Reel', 'Catalog in 30 seconds (Script 08)'),
    ('13', 'Educate', 'Tasks', 'Reel', 'Get paid for your skills (Script 12)'),
    ('14', 'Offer', 'POS', 'Live / long video', 'YouTube outline 1, live Q&amp;A'),
    ('15', 'Demo', 'POS', 'Reel', 'Set up a shop in 5 minutes (Script 09)'),
    ('16', 'Demo', 'COD', 'Reel', 'Return-risk badge (Script 07)'),
    ('17', 'Educate', 'POS', 'Carousel', '“How to stop running out of best sellers”'),
    ('18', 'Relate', 'COD', 'POV', 'POV: you run an online shop from your bedroom'),
    ('19', 'Proof', 'POS', 'Interview', 'Real shop owner, 60s walk-through'),
    ('20', 'Demo', 'POS', 'Reel', 'Receipt to WhatsApp + loyalty points'),
    ('21', 'Offer', 'COD', 'Story + post', '14 days free, no card'),
    ('22', 'Educate', 'COD', 'Carousel', '“How to chase payments politely” (credit reminders)'),
    ('23', 'Demo', 'POS', 'Reel', 'Purchase order, receive stock in one click'),
    ('24', 'Relate', 'POS', 'Myth-bust', '“POS is only for supermarkets.” Wrong.'),
    ('25', 'Demo', 'COD', 'Reel', 'Shipping labels for 40 orders in one print'),
    ('26', 'Proof', 'COD', 'Interview', 'Real seller: “how I know my profit now”'),
    ('27', 'Educate', 'Hub', 'Reel', 'Works on your phone, nothing to install'),
    ('28', 'Demo', 'COD', 'Long video', 'YouTube outline 2'),
    ('29', 'Relate', 'Tasks', 'Skit', 'Trying to find a plumber the old way vs Tasks'),
    ('30', 'Offer', 'All', 'Recap reel', 'Best of the month + free-trial CTA'),
]
story += [H2('30-day calendar (1 post a day, adjust to your capacity)')]
story += table(['Day', 'Pillar', 'App', 'Format', 'Idea'], [list(r) for r in CAL], [0.4, 0.8, 0.6, 1.1, 3.6], font_size=8)
story += tip('Batch production', [P('Film 6–8 videos in one session per week: one setup for talking heads, one for screen '
                                    'recordings, one for B-roll at a real shop. Edit in a batch. Post daily.', 'small')])

# ================================================================= 13 PLATFORMS
story += section('Platform playbook', 'Same message, different packaging on every platform.')
story += table(['Platform', 'Who is there', 'Best formats', 'Length', 'Post', 'Notes'], [
    ['<b>TikTok</b>', 'Young sellers, side hustlers, taskers', 'Skits, POV, quick demos, trends', '15–35s', '1–2 / day', 'Hook in 1s. Trending sound under voice-over. Reply to comments with videos.'],
    ['<b>Instagram Reels</b>', 'Fashion, beauty, home businesses', 'Polished demos, before/after, carousels', '15–45s', '4–5 / week', 'Carousels for tips (saveable). Stories for offers and polls.'],
    ['<b>Facebook</b>', 'Shop owners 30–55, pharmacies, wholesalers', 'Reels, longer demos, live Q&amp;A, group posts', '30–90s', '4–5 / week', 'The biggest channel for shop owners. Post in seller and business groups (follow group rules, give value first).'],
    ['<b>YouTube</b>', 'People researching before they buy', 'Shorts + 8–12 min tutorials', 'Shorts 30–60s; long 8–12 min', 'Shorts 3 / week, long 2 / month', 'Tutorials rank in search for years. Chapters + clear titles: “How to manage COD orders”.'],
    ['<b>WhatsApp</b>', 'Warm leads, existing customers', 'Status videos, broadcast lists, Channel', '15–30s', 'Status daily', 'Never spam. Only people who asked. Use the follow-up scripts in section 15.'],
    ['<b>LinkedIn</b>', 'Pharmacies, accountants, partners', 'Founder posts, case studies, carousels', 'Text + 30–60s video', '2 / week', 'Good for partnerships and B2B trust.'],
], [0.9, 1.3, 1.3, 0.9, 0.8, 2.2], font_size=7.9)
story += [H2('Best posting times (test and adjust)')]
story += bullets(['<b>Shop owners:</b> early morning before opening (6–8 am), lunch lull (1–3 pm), after closing (9–11 pm).',
                  '<b>Online sellers:</b> evenings and late night (8 pm–12 am), when they answer orders.',
                  '<b>Households and taskers:</b> evenings and weekends.',
                  'Check your own analytics after two weeks and move posts to your best hours.'])
story += [H2('Hashtag sets (mix 3–6, never a country name)')]
story += table(['Set', 'Hashtags'], [
    ['Brand', '#KadeHub #KadeHubPOS #KadeHubCOD #KadeHubTasks'],
    ['Shop owners', '#ShopOwner #SmallBusiness #RetailShop #GroceryStore #PharmacyLife #POSsystem #InventoryManagement'],
    ['Online sellers', '#CashOnDelivery #OnlineSeller #OnlineBusiness #SmallBusinessOwner #InstagramShop #TikTokShop #ResellerLife'],
    ['Money and growth', '#BusinessTips #ProfitMargin #Entrepreneur #SideHustle #BusinessGrowth'],
    ['Tasks', '#OddJobs #Freelancer #EarnMoney #HireLocal #Handyman #CleaningServices'],
    ['Local language', '#kade #vyaparaya #business  (add Sinhala and Tamil script tags written by a native speaker)'],
], [1, 4], bold_first=True)

# ================================================================= 14 SALES
story += section('Sales strategy: from views to paying customers', 'Content creates interest. This section turns interest into money.')
story += [H2('The KadeHub funnel')]
story += table(['Stage', 'Goal', 'What to do', 'Measure'], [
    ['<b>1. Attention</b>', 'Get seen by the right niche', 'Daily short videos, niche hooks, group posts, ads.', 'Views, 3-second hold rate'],
    ['<b>2. Interest</b>', 'Make them want to try', 'Demos, tutorials, proof stories, comment-to-get-link.', 'Profile visits, link clicks, comments'],
    ['<b>3. Conversation</b>', 'Answer questions fast', 'WhatsApp (070 247 0064), DMs, call-backs, shop visits.', 'Leads started'],
    ['<b>4. Free trial</b>', 'Get them using it', 'Help set up in the first 24 hours: products, first sale or first order.', 'Trials started, trials activated (first sale/order)'],
    ['<b>5. Paid</b>', 'Convert before day 14', 'Follow-up messages, plan recommendation, payment help.', 'Trial-to-paid %'],
    ['<b>6. Grow</b>', 'Keep and expand', 'Upgrade plans, add COD to POS shops, referrals.', 'Churn, upgrades, referrals'],
], [1, 1.3, 2.5, 1.5])
story += tip('The most important number', [P('<b>Activation:</b> a trial user who makes their first real sale (POS) or first real order (COD) in '
                                              'the first 2 days is far more likely to pay. Every follow-up should push toward that first sale or order.', 'small')])
story += [H2('The 5-minute shop demo (walk-in or video call)')]
story += table(['Minute', 'Say', 'Do'], [
    ['0–1', '“Can I show you something that helps with credit and stock? Just 5 minutes.” Ask: “What’s the hardest part of running the shop?”', 'Listen. Write down their exact words.'],
    ['1–2', '“Let me make a sale like you do every day.”', 'Search, scan, take cash. Show receipt and WhatsApp share.'],
    ['2–3', 'Address their pain from minute 0: credit, stock or cash.', 'Credit page, low-stock list or shift report.'],
    ['3–4', '“And if the internet goes off…”', 'Turn Wi-Fi off, make a sale, turn it on, synced.'],
    ['4–5', '“It’s free for 14 days with everything. Shall we set up your shop now?”', 'Register together on their phone. Import products or add 10 best sellers.'],
], [0.6, 2.8, 2.2], bold_first=True)
story += [H2('WhatsApp follow-up sequence for trial users')]
story += table(['When', 'Message (adapt to your voice)'], [
    ['Day 0', '“Welcome to KadeHub! Your shop is ready. Want me to help add your products? Send me your list and I’ll show you the quickest way.”'],
    ['Day 1', '“Quick tip: make your first sale today and send the receipt to a customer on WhatsApp. It takes 10 seconds.”'],
    ['Day 3', '“Did you try the low-stock alerts / landed cost? Here’s a 30-second video showing how.” (send a short demo)'],
    ['Day 7', '“You’re halfway through your trial. Anything confusing so far? I can do a 10-minute call.”'],
    ['Day 11', '“Your trial ends in 3 days. Based on what you’re using, the [plan] plan fits you best. Here’s how to pay by bank transfer or card.”'],
    ['Day 14', '“Your trial ends today. Your products and data stay safe. Choose a plan to keep selling without a break.”'],
    ['Day 21', '(If not paid) “Still thinking about it? Tell me what’s stopping you. Happy to help.”'],
], [0.6, 5], bold_first=True)
story += [H2('Objection handling')]
story += table(['Objection', 'Answer'], [
    ['“Too expensive.”', '“Starter is LKR 2,999 a month: about LKR 100 a day. One expired box or one unpaid credit customer costs more. Yearly saves about 17%.”'],
    ['“What’s the LKR 25,000 registration fee for POS?”', '“It’s one-time, with your first payment, and covers getting your shop set up. Try the full system free for 14 days first so you know it’s worth it.” (Ask the team about current offers before promising any waiver.)'],
    ['“I don’t know computers.”', '“If you can use WhatsApp, you can use KadeHub. It’s in Sinhala too. I’ll set it up with you now.”'],
    ['“My internet is bad.”', '“POS keeps selling offline and syncs later. Let me show you.”'],
    ['“I already use Excel / a notebook.”', '“Keep them during the trial. Compare after 14 days which one told you more.”'],
    ['“Is my data safe?”', '“Every business sees only its own data. Staff can be cashiers who don’t see your costs and profit.”'],
    ['“What if I stop paying?”', '“Your data stays. Choose a plan any time to continue where you left off.”'],
    ['“I’ll think about it.”', '“Sure. What would you need to see to be sure?” Then book a time to follow up.'],
], [1.4, 4])
story += [H2('Pricing anchors to use')]
story += bullets([
    'POS Starter LKR 2,999 / month ≈ <b>LKR 100 a day</b>. Pro ≈ LKR 167 a day. COD Pro LKR 3,500 ≈ <b>LKR 117 a day</b>.',
    'Compare with the cost of one problem: one returned COD order, one expired box, one unpaid credit customer, one hour of your time every night.',
    'Show the yearly price as “two months free”.',
    'Always mention: <b>free for 14 days, no card needed</b>. Tasks is free.',
])
story += [H2('Growth ideas (proposals for the KadeHub team to approve)')]
story += [P('These are suggestions only. Do not announce any discount, reward or commission until the KadeHub team confirms it.', 'small')]
story += table(['Idea', 'How it works', 'Why'], [
    ['Referral reward', 'Existing customer refers a shop; both get a free month after the new shop pays.', 'Shop owners trust other shop owners.'],
    ['Creator / affiliate code', 'Each creator gets a code or link; commission on first payment.', 'Pays for results, motivates creators.'],
    ['Partner network', 'Accountants, barcode-scanner and printer sellers, and shop-supply distributors recommend KadeHub.', 'They already visit shops every week.'],
    ['Cross-sell', 'Shops on POS that also sell online get a COD intro; COD sellers with a physical shop get a POS intro.', 'One account makes it easy.'],
    ['Launch offer', 'Limited-time offer on the registration fee or first month.', 'Creates urgency in campaigns.'],
    ['Community', 'A free WhatsApp Channel or Facebook group with weekly business tips.', 'Warm audience for every launch.'],
], [1.2, 2.8, 1.8], bold_first=True)

# ================================================================= 15 ADS
story += section('Paid ads starter kit', 'Facebook, Instagram, TikTok and YouTube ads that point to the free trial.')
story += table(['Angle', 'Primary text', 'Headline', 'Audience'], [
    ['Offline POS', 'Internet down? KadeHub POS keeps selling and syncs later. Cash, card, QR and credit at one till. Try it free for 14 days.', 'The internet went off. Your sales didn’t.', 'Small business owners, retail, grocery and pharmacy interests'],
    ['Credit book', 'Know exactly who owes you money. Credit sales, partial payments and balances, on your phone. 14 days free, no card.', 'Retire the credit notebook', 'Shop owners 28–60'],
    ['Pharmacy expiry', 'See every batch that expires in the next 30 days, before it becomes a loss. KadeHub POS for pharmacies.', 'No more expired stock losses', 'Pharmacists, pharmacy owners, healthcare retail'],
    ['COD profit', 'Buying price, exchange rate, shipping and customs worked out per item. See your real profit. Start free.', 'Know your real profit per item', 'Online sellers, Facebook page admins, e-commerce interests'],
    ['WhatsApp one tap', 'Orders, invoices and WhatsApp messages in one tap. Built for cash-on-delivery sellers. 14 days free.', 'Every COD order, under control', 'Instagram and TikTok shop owners'],
    ['Tasks', 'Post any job for free. Get offers from people nearby, compare reviews, pick the best.', 'Get it done by people near you', 'Homeowners, parents, 25–55, local radius'],
], [0.9, 2.6, 1.5, 1.6], font_size=7.9)
story += [H2('Budget and testing')]
story += bullets([
    'Start small: test 3 videos × 2 audiences for 5–7 days, then move budget to the winner.',
    'Split: <b>70%</b> proven ads, <b>20%</b> new creative tests, <b>10%</b> retargeting people who watched 50%+ or visited the site.',
    'Optimise for trial sign-ups, or for WhatsApp conversations if sign-up tracking is not set up yet.',
    'Use organic videos that already perform well as ads. Real screen recordings beat polished graphics.',
    'Refresh creative every 2–3 weeks when cost per sign-up rises.',
    'Never put a country name in ad copy or targeting labels visible to users.',
])

# ================================================================= 16 FILMING
story += section('Filming and editing guide', 'How to make KadeHub look great on camera.')
story += [H2('Screen recording')]
story += bullets([
    'Use a <b>demo account with realistic sample data</b> (ask the team). Never film a real customer’s data without permission.',
    'Phone: record in portrait. Desktop: set browser zoom to 125–150% and crop to 9:16 around the action.',
    'Turn off notifications. Use a clean browser with no other tabs or bookmarks visible.',
    'Move the cursor slowly; pause 1 second on every important number.',
    'Zoom in (1.5–2×) on the part that matters: the “Synced” toast, the profit number, the warning badge.',
    'Blur phone numbers, names and bank details.',
])
story += [H2('B-roll shot list')]
story += table(['Scene', 'Shots'], [
    ['Shop', 'Shopkeeper at counter, scanning a barcode, handing a bag, receipt printing, shelves, stock boxes, a credit notebook, cash drawer.'],
    ['Pharmacy', 'Shelves of medicine boxes (no labels close-up), checking a date on a box, tablet at counter.'],
    ['Online seller', 'Packing parcels, labels on parcels, phone full of chats, ring light, product photos, delivery rider pick-up.'],
    ['Importer', 'Unboxing a shipment, currency notes, calculator, laptop with spreadsheet.'],
    ['Tasks', 'Cleaning, fixing a tap, assembling furniture, a student on a laptop, a handshake.'],
    ['Mood', 'Late-night shop closing, morning shop opening, relaxed owner, mascot sticker on the screen.'],
], [1, 4], bold_first=True)
story += [H2('Editing style')]
story += bullets([
    '<b>Captions always on</b>, large, centred, in the safe area (avoid the bottom 20% and right edge on TikTok/Reels).',
    'Cut every 1–2 seconds in shorts. No intros, no logo at the start: hook first, logo at the end.',
    'Voice-over: warm, conversational, a little faster than normal. English, Sinhala or Tamil; code-mixing is fine.',
    'Music: low under the voice; use platform-licensed tracks only.',
    'End card (2–3 s): logo, app address (pos. / cod. / tasks.kadehub.com), “14 days free” or “Free to join”.',
    'Thumbnails (YouTube): a face with emotion + 3–4 words + a phone screen. Example: “REAL PROFIT?” with a calculator.',
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
story += table(['Element', 'Rule'], [
    ['Font', '<b>Poppins</b> (headings bold 700–800, body 500–600). Sinhala text: Noto Sans Sinhala.'],
    ['Logo', 'Teal “K” mark + “Kadehub” wordmark on white or light backgrounds; mono version on photos or dark backgrounds. Do not stretch, recolour or add effects.'],
    ['Product colours', 'POS = teal, COD = blue, Tasks = amber. Use the right colour on end cards and thumbnails.'],
    ['Buttons and CTAs', 'Amber background with navy text, like the website’s “Choose an app” button.'],
    ['Mascot', 'The capybara: friendly, calm. Use it for intros, stickers and end cards.'],
    ['Name', 'Write <b>KadeHub</b> (capital K and H). Product names: KadeHub POS, KadeHub COD, KadeHub Tasks.'],
], [1, 4], bold_first=True)

# ================================================================= 17 DOS AND DONTS
story += section('Do’s, don’ts and brand rules', 'Protect the brand. Keep the trust.')
dd = Table([[
    [P('DO', style('do', fontName='Pop800', fontSize=13, textColor=TEAL, spaceAfter=4))] + bullets([
        'Show the real app working.',
        'Mention the free trial in every CTA.',
        'Use real customer stories only with written permission.',
        'Keep numbers on screen realistic and consistent.',
        'Reply to every comment within 24 hours.',
        'Send leads to WhatsApp 070 247 0064 or official.kadehub@gmail.com.',
        'Check current prices on kadehub.com before posting.',
        'Use English, Sinhala or Tamil, whatever your audience speaks.',
        'Credit the mascot and keep the tone friendly.',
    ], style('dob', parent=S['bullet'], fontSize=9)),
    [P('DON’T', style('dont', fontName='Pop800', fontSize=13, textColor=CORAL, spaceAfter=4))] + bullets([
        'Name any country, in any language, anywhere.',
        'Claim features from the “must NOT claim” list (section 07).',
        'Invent testimonials, user counts or results.',
        'Show real customers’ phone numbers, names or finances.',
        'Promise discounts, waivers or commissions not approved by the team.',
        'Mock shop owners. Laugh with them, not at them.',
        'Copy a competitor’s logo or name them negatively.',
        'Say “free forever” about POS or COD.',
        'Use unlicensed music or images.',
    ], style('dontb', parent=S['bullet'], fontSize=9)),
]], colWidths=[CONTENT_W / 2 - 4, CONTENT_W / 2 - 4], spaceBefore=0)
dd.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('BACKGROUND', (0, 0), (0, 0), TEAL_L),
                        ('BACKGROUND', (1, 0), (1, 0), CORAL_L), ('LEFTPADDING', (0, 0), (-1, -1), 10),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 10),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 10)]))
story += [dd, gap(12)]
story += [H2('Pre-publish checklist')]
story += bullets(['Hook in the first 1–3 seconds?', 'One niche, one idea, one CTA?', 'Captions on and spelled right?',
                  'No country name, no real customer data, no unapproved claims?', 'End card with the right app address and “14 days free”?',
                  'Thumbnail/cover readable on a small phone screen?', 'Caption includes CTA and 3–6 hashtags?'], mark='□')

# ================================================================= 18 KPIs
story += section('KPIs and weekly review', 'What gets measured gets better.')
story += table(['Metric', 'What it tells you', 'Healthy direction'], [
    ['3-second hold rate', 'Is the hook working?', 'Higher. If low, change the first line and first frame.'],
    ['Average watch time / completion', 'Is the video interesting?', 'Higher. Cut slow parts.'],
    ['Saves and shares', 'Is it useful or relatable?', 'Higher. Tips get saves, skits get shares.'],
    ['Profile visits and link clicks', 'Do people want more?', 'Higher. Strengthen CTAs.'],
    ['WhatsApp / DM leads', 'Real buying interest', 'Higher. Reply fast.'],
    ['Trials started', 'Top of the sales pipeline', 'Higher every week.'],
    ['Trials activated (first sale / order)', 'Will they pay?', 'Higher. Help with set-up in the first 24 hours.'],
    ['Trial-to-paid conversion', 'Is the product and follow-up working?', 'Higher. Improve follow-ups.'],
    ['Cost per trial and per paying customer', 'Are ads profitable?', 'Lower. Kill weak ads.'],
    ['Churn (cancelled after paying)', 'Are customers happy?', 'Lower. Ask why and fix.'],
], [1.6, 1.8, 2.4], bold_first=True)
story += [H2('Weekly 30-minute review')]
story += numbered([
    'List last week’s posts with views, hold rate, saves, shares and link clicks.',
    'Find the top 2 and bottom 2. What was different in the hook, niche or format?',
    'Count leads, trials, activations and payments from content and from ads.',
    'Read every comment and DM question. Each repeated question is a new video idea.',
    'Plan next week: 2 remakes of winners with new hooks, 1 new experiment, and the rest from the calendar.',
    'Share insights with the KadeHub team (feature requests, common objections, confusing parts of the app).',
])

# ================================================================= 19 APPENDIX
story += section('Appendix: CTAs, captions, glossary and links', 'Copy, paste, publish.')
story += [H2('CTA bank')]
story += bullets([
    'Start your 14-day free trial. No card needed.',
    'Link in bio: try KadeHub free for 14 days.',
    'Comment “SHOP” and I’ll send you the link.',
    'Save this for your next stock count.',
    'Send this to a shop owner who still uses a notebook.',
    'WhatsApp us on 070 247 0064 for a free demo.',
    'Post your first task free at tasks.kadehub.com.',
    'One account, every tool your business needs. kadehub.com',
])
story += [H2('Caption templates')]
story += table(['Type', 'Template'], [
    ['Pain → fix', '[Pain in one line] → [How KadeHub fixes it in one line]. Try [app] free for 14 days. Link in bio.  [hashtags]'],
    ['Tip', '[Number] things every [niche] should [do]. Save this. 1) … 2) … 3) …  KadeHub does #[n] for you automatically. [CTA]'],
    ['Story', '[Name] used to [old way]. Now [new way] with KadeHub. The difference? [result in their words]. [CTA]'],
    ['Question', 'Be honest: how do you [task] right now? A) notebook B) Excel C) WhatsApp D) KadeHub. Comment below.'],
    ['Offer', 'Free for 14 days. No card. Everything unlocked. [App] by KadeHub, [app address].'],
], [0.9, 4.1], bold_first=True)
story += [H2('Glossary (plain words for creators)')]
story += table(['Term', 'Meaning'], [
    ['POS', 'Point of sale: the till or counter screen where you bill customers.'],
    ['COD', 'Cash on delivery: the customer pays when the parcel arrives.'],
    ['Landed cost', 'The full cost of an item when it reaches you: buying price, exchange, shipping, customs and other costs.'],
    ['Margin', 'How much of the selling price is profit, in percent.'],
    ['SKU', 'A product code for one item in your stock.'],
    ['Batch / expiry', 'A group of the same product made at the same time, with its own expiry date.'],
    ['Credit sale', 'A sale where the customer pays later.'],
    ['LANKAQR', 'A local QR payment method shown as “QR” at the KadeHub POS till.'],
    ['Purchase order (PO)', 'An order you send to a supplier for stock.'],
    ['Shift', 'One cashier’s working period, opened and closed with a cash count.'],
    ['Tasker', 'A person who does jobs on KadeHub Tasks.'],
    ['Free trial', '14 days of POS or COD with no payment, then choose a plan.'],
], [1.1, 4], bold_first=True)
story += [H2('Links and contacts')]
story += table(['What', 'Where'], [
    ['KadeHub (all apps, sign in, account)', 'kadehub.com'],
    ['KadeHub POS', 'pos.kadehub.com'],
    ['KadeHub COD', 'cod.kadehub.com'],
    ['KadeHub Tasks', 'tasks.kadehub.com'],
    ['A shop’s own address', 'yourshop.kadehub.com'],
    ['WhatsApp', '070 247 0064'],
    ['Email', 'official.kadehub@gmail.com'],
], [2, 3], bold_first=True)
story += [gap(14)]
end = Table([[mascot('capybara-love.webp', 26 * mm),
              [P('Thank you for telling the KadeHub story.', style('ty', fontName='Pop700', fontSize=13, textColor=WHITE, spaceAfter=3)),
               P('Questions, demo accounts or new feature news: WhatsApp 070 247 0064 or official.kadehub@gmail.com.',
                 style('ty2', fontSize=9.5, leading=13.5, textColor=TEAL_L, spaceAfter=0))]]],
            colWidths=[34 * mm, CONTENT_W - 34 * mm])
end.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), TEAL_D), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                         ('LEFTPADDING', (0, 0), (-1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 10),
                         ('BOTTOMPADDING', (0, 0), (-1, -1), 10), ('ROUNDEDCORNERS', [6, 6, 6, 6])]))
story += [end]

# ---------------------------------------------------------------- build
build(story, os.path.join(HERE, 'KadeHub-Content-Creator-Playbook.pdf'))
