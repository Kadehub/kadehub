"""Shared layout for the KadeHub playbook PDFs (build_playbook.py, build_playbook_singlish.py).

Needs: reportlab, fonttools (+brotli) and Pillow. Uses the brand font Poppins
from frontend/public/fonts and Segoe UI from the Windows font folder.
"""
import datetime
import os
import tempfile

from fontTools.ttLib import TTFont as FTFont
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, CondPageBreak, Frame, Image as RLImage, KeepTogether,
                                NextPageTemplate, PageBreak, PageTemplate, Paragraph, Spacer, Table,
                                TableStyle)
from reportlab.platypus.tableofcontents import TableOfContents

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PUBLIC = os.path.join(ROOT, 'frontend', 'public')
TMP = tempfile.mkdtemp(prefix='kh_playbook_')
WINFONTS = os.path.join(os.environ.get('WINDIR', 'C:/Windows'), 'Fonts')

# ---------------------------------------------------------------- fonts
for w in ('400', '600', '700', '800'):
    f = FTFont(os.path.join(PUBLIC, 'fonts', f'poppins-{w}-latin.woff2'))
    f.flavor = None
    path = os.path.join(TMP, f'Poppins-{w}.ttf')
    f.save(path)
    pdfmetrics.registerFont(TTFont(f'Pop{w}', path))
for name, file in (('Seg', 'segoeui.ttf'), ('SegB', 'segoeuib.ttf'), ('SegI', 'segoeuii.ttf'),
                   ('SegSB', 'seguisb.ttf'), ('SegBI', 'segoeuiz.ttf')):
    pdfmetrics.registerFont(TTFont(name, os.path.join(WINFONTS, file)))
pdfmetrics.registerFontFamily('Seg', normal='Seg', bold='SegB', italic='SegI', boldItalic='SegBI')

# ---------------------------------------------------------------- brand colours (frontend/tailwind.config.js)
NAVY = colors.HexColor('#0F172A')
INK = colors.HexColor('#475569')
MUTED = colors.HexColor('#64748B')
LINE = colors.HexColor('#E2E8F0')
BG = colors.HexColor('#F1F5F9')
TEAL = colors.HexColor('#00796B')
TEAL_D = colors.HexColor('#004D40')
TEAL_L = colors.HexColor('#E0F2F1')
AMBER = colors.HexColor('#FFB703')
AMBER_D = colors.HexColor('#B45309')
AMBER_L = colors.HexColor('#FFF8E1')
BLUE = colors.HexColor('#2563EB')
BLUE_L = colors.HexColor('#EFF6FF')
CORAL = colors.HexColor('#C92A2A')
CORAL_L = colors.HexColor('#FFF0F0')
WHITE = colors.white

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

# ---------------------------------------------------------------- styles
def style(name, **kw):
    base = dict(fontName='Seg', fontSize=9.6, leading=14, textColor=NAVY, spaceAfter=5)
    base.update(kw)
    return ParagraphStyle(name, **base)

S = {
    'body': style('body'),
    'small': style('small', fontSize=8.4, leading=11.5, textColor=INK, spaceAfter=2),
    'cell': style('cell', fontSize=8.4, leading=11.2, spaceAfter=0),
    'cellb': style('cellb', fontName='SegB', fontSize=8.4, leading=11.2, spaceAfter=0),
    'cellh': style('cellh', fontName='Pop600', fontSize=8.2, leading=11, textColor=WHITE, spaceAfter=0),
    'h2': style('h2', fontName='Pop700', fontSize=13.5, leading=18, textColor=TEAL_D, spaceBefore=10, spaceAfter=5),
    'h3': style('h3', fontName='Pop600', fontSize=10.8, leading=14.5, textColor=NAVY, spaceBefore=7, spaceAfter=3),
    'lead': style('lead', fontSize=11, leading=16.5, textColor=INK, spaceAfter=8),
    'bullet': style('bullet', leftIndent=12, bulletIndent=2, spaceAfter=2.5),
    'quote': style('quote', fontName='Pop600', fontSize=14, leading=20, textColor=TEAL_D, alignment=TA_CENTER, spaceAfter=4),
    'box_t': style('box_t', fontName='Pop700', fontSize=10, leading=13, spaceAfter=3),
    'hook': style('hook', fontName='SegSB', fontSize=9.4, leading=12.6, spaceAfter=0),
    'toc_note': style('toc_note', fontSize=9, textColor=MUTED),
}

def P(text, st='body'):
    return Paragraph(text, S[st] if isinstance(st, str) else st)

def bullets(items, st='bullet', mark='•'):
    st = S[st] if isinstance(st, str) else st
    return [Paragraph(t, st, bulletText=mark) for t in items]

def numbered(items):
    return [Paragraph(t, S['bullet'], bulletText=f'{i}.') for i, t in enumerate(items, 1)]

def H2(text):
    return P(text, 'h2')

def H3(text):
    return P(text, 'h3')

def gap(h=6):
    return Spacer(1, h)

# ---------------------------------------------------------------- building blocks
class Section(Table):
    """Coloured section banner; registered in the TOC and PDF outline."""

SECTION_NO = [0]

def section(title, kicker):
    SECTION_NO[0] += 1
    n = SECTION_NO[0]
    num = Paragraph(f'{n:02d}', style('sn', fontName='Pop800', fontSize=26, leading=30, textColor=AMBER, spaceAfter=0))
    txt = [Paragraph(title, style('st', fontName='Pop700', fontSize=19, leading=24, textColor=WHITE, spaceAfter=2)),
           Paragraph(kicker, style('sk', fontSize=9.6, leading=13, textColor=TEAL_L, spaceAfter=0))]
    t = Section([[num, txt]], colWidths=[20 * mm, CONTENT_W - 20 * mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), TEAL_D),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 11), ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))
    t._toc = (0, f'{n:02d}  {title}', f'sec{n}')
    return [PageBreak(), t, gap(10)]

def box(title, content, bg=TEAL_L, edge=TEAL, title_color=None):
    flow = []
    if title:
        flow.append(Paragraph(title, style('bt', parent=S['box_t'], textColor=title_color or edge)))
    flow += content if isinstance(content, list) else [content]
    t = Table([[flow]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg),
        ('LINEBEFORE', (0, 0), (0, -1), 3.5, edge),
        ('LEFTPADDING', (0, 0), (-1, -1), 11), ('RIGHTPADDING', (0, 0), (-1, -1), 11),
        ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    return [t, gap(8)]

def tip(title, content):
    return box(title, content, AMBER_L, AMBER_D)

def warn(title, content):
    return box(title, content, CORAL_L, CORAL)

def info(title, content):
    return box(title, content, BLUE_L, BLUE)

def table(headers, rows, widths, head_bg=TEAL, zebra=True, bold_first=False, font_size=None):
    cs = S['cell'] if not font_size else style('cx', parent=S['cell'], fontSize=font_size, leading=font_size + 3)
    csb = S['cellb'] if not font_size else style('cxb', parent=S['cellb'], fontSize=font_size, leading=font_size + 3)
    data = [[Paragraph(h, S['cellh']) for h in headers]]
    for r in rows:
        data.append([c if not isinstance(c, str) else Paragraph(c, csb if (bold_first and i == 0) else cs)
                     for i, c in enumerate(r)])
    total = sum(widths)
    t = Table(data, colWidths=[CONTENT_W * w / total for w in widths], repeatRows=1)
    st = [
        ('BACKGROUND', (0, 0), (-1, 0), head_bg),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, LINE),
        ('LEFTPADDING', (0, 0), (-1, -1), 5), ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4.5),
    ]
    if zebra:
        for i in range(1, len(data)):
            if i % 2 == 0:
                st.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#F8FAFC')))
    t.setStyle(TableStyle(st))
    return [t, gap(8)]

def hook_list(title, hooks, color=TEAL, bg=TEAL_L, start=1):
    rows = []
    for i, h in enumerate(hooks, start):
        rows.append([Paragraph(f'{i}', style('hn', fontName='Pop700', fontSize=9, textColor=color, alignment=TA_CENTER, spaceAfter=0)),
                     Paragraph(h, S['hook'])])
    t = Table(rows, colWidths=[9 * mm, CONTENT_W - 9 * mm])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, LINE),
        ('BACKGROUND', (0, 0), (0, -1), bg),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    head = Paragraph(title, style('hlt', fontName='Pop600', fontSize=10.5, leading=14, textColor=color, spaceBefore=6, spaceAfter=3))
    return [head, t, gap(6)], start + len(hooks)

def script(no, title, meta, hook, shots, cta, note=None):
    """A ready-to-shoot short-video script card."""
    head = Table([[Paragraph(f'SCRIPT {no:02d}', style('sh1', fontName='Pop700', fontSize=8, textColor=AMBER, spaceAfter=0)),
                   Paragraph(meta, style('sh2', fontSize=8, textColor=TEAL_L, alignment=2, spaceAfter=0))],
                  [Paragraph(title, style('sh3', fontName='Pop700', fontSize=12, leading=15, textColor=WHITE, spaceAfter=0)), '']],
                 colWidths=[CONTENT_W * 0.45, CONTENT_W * 0.55])
    head.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY), ('SPAN', (0, 1), (1, 1)),
        ('LEFTPADDING', (0, 0), (-1, -1), 9), ('RIGHTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, 0), 7), ('BOTTOMPADDING', (0, 1), (-1, 1), 8),
    ]))
    hk = Table([[Paragraph('HOOK (0–3s)', style('hk1', fontName='Pop700', fontSize=7.8, textColor=AMBER_D, spaceAfter=0)),
                 Paragraph(f'“{hook}”', style('hk2', fontName='SegB', fontSize=10.5, leading=14, spaceAfter=0))]],
               colWidths=[24 * mm, CONTENT_W - 24 * mm])
    hk.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), AMBER_L), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                            ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
                            ('LEFTPADDING', (0, 0), (-1, -1), 9)]))
    body, _ = None, None
    rows = [[Paragraph(h, S['cellh']) for h in ('Time', 'On screen (shot)', 'Voice-over / talking', 'Text on screen')]]
    for s in shots:
        rows.append([Paragraph(s[0], S['cellb'])] + [Paragraph(x, S['cell']) for x in s[1:]])
    body = Table(rows, colWidths=[CONTENT_W * w for w in (0.09, 0.32, 0.36, 0.23)], repeatRows=1)
    body.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), TEAL), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, LINE),
        ('LEFTPADDING', (0, 0), (-1, -1), 5), ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4.5),
    ]))
    foot_txt = f'<b>CTA:</b> {cta}' + (f'<br/><font color="#64748B"><b>Tip:</b> {note}</font>' if note else '')
    foot = Table([[Paragraph(foot_txt, style('ft', fontSize=8.8, leading=12.5, spaceAfter=0))]], colWidths=[CONTENT_W])
    foot.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), TEAL_L), ('LEFTPADDING', (0, 0), (-1, -1), 9),
                              ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]))
    return [CondPageBreak(95 * mm), KeepTogether([head, hk]), body, foot, gap(14)]

def mascot(name, width):
    src = os.path.join(PUBLIC, 'mascot', name)
    dst = os.path.join(TMP, os.path.splitext(name)[0] + '.png')
    im = Image.open(src).convert('RGBA')
    im.save(dst)
    return RLImage(dst, width=width, height=width * im.height / im.width)

# ---------------------------------------------------------------- document template
class Doc(BaseDocTemplate):
    def __init__(self, path):
        super().__init__(path, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=20 * mm,
                         bottomMargin=18 * mm, title=TEXT['doc_title'],
                         author='KadeHub', subject='Marketing playbook for video and content creators')
        body = Frame(MARGIN, 18 * mm, CONTENT_W, PAGE_H - 38 * mm, id='body', leftPadding=0, rightPadding=0,
                     topPadding=0, bottomPadding=0)
        cover = Frame(0, 0, PAGE_W, PAGE_H, id='cover')
        self.addPageTemplates([PageTemplate('cover', [cover], onPage=draw_cover),
                               PageTemplate('body', [body], onPage=draw_page)])

    def afterFlowable(self, f):
        if hasattr(f, '_toc'):
            level, text, key = f._toc
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, level=level, closed=False)
            self.notify('TOCEntry', (level, text, self.page, key))

TODAY = datetime.date.today()

# Cover, header and footer copy; each build script overrides what it needs.
TEXT = {
    'doc_title': 'KadeHub Content Creator & Marketing Playbook',
    'tagline': 'POS  ·  COD  ·  TASKS   —   one account, every tool your business needs',
    'title': ('Content Creator &', 'Marketing Playbook'),
    'subtitle': ('Everything a video creator needs to understand KadeHub,',
                 'find the right audience, and make content that sells.'),
    'inside': 'INSIDE',
    'inside_lines': ('Product deep dives  ·  Niches and personas  ·  70+ hooks',
                     '14 ready-to-shoot scripts  ·  30-day content calendar',
                     'Sales playbook  ·  Ad kit  ·  Filming guide  ·  KPIs'),
    'edition': f'Edition {TODAY.strftime("%B %Y")}  ·  kadehub.com',
    'header': 'Content Creator & Marketing Playbook',
    'footer': 'For KadeHub creators and partners. Check live prices on kadehub.com before quoting.',
}

def draw_cover(c, doc):
    c.saveState()
    c.setFillColor(WHITE)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    # lower brand band
    c.setFillColor(TEAL_D)
    c.rect(0, 0, PAGE_W, PAGE_H * 0.56, stroke=0, fill=1)
    c.setFillColor(TEAL)
    p = c.beginPath()
    p.moveTo(0, PAGE_H * 0.56); p.lineTo(PAGE_W, PAGE_H * 0.50); p.lineTo(PAGE_W, PAGE_H * 0.56); p.close()
    c.drawPath(p, stroke=0, fill=1)
    c.setFillColor(AMBER)
    c.rect(MARGIN, PAGE_H * 0.445, 34 * mm, 2.2 * mm, stroke=0, fill=1)
    # logo
    c.drawImage(os.path.join(PUBLIC, 'logo-primary.png'), MARGIN - 8 * mm, PAGE_H - 92 * mm, width=118 * mm,
                height=60 * mm, mask='auto', preserveAspectRatio=True, anchor='sw')
    c.setFont('Pop600', 10)
    c.setFillColor(INK)
    c.drawString(MARGIN, PAGE_H - 100 * mm, TEXT['tagline'])
    # title
    c.setFillColor(WHITE)
    c.setFont('Pop800', 34)
    c.drawString(MARGIN, PAGE_H * 0.375, TEXT['title'][0])
    c.drawString(MARGIN, PAGE_H * 0.375 - 42, TEXT['title'][1])
    c.setFont('Seg', 12.5)
    c.setFillColor(TEAL_L)
    y = PAGE_H * 0.375 - 76
    for line in TEXT['subtitle']:
        c.drawString(MARGIN, y, line)
        y -= 18
    # mascot
    m = os.path.join(TMP, 'cover_mascot.png')
    Image.open(os.path.join(PUBLIC, 'mascot', 'capybara-celebrate.webp')).convert('RGBA').save(m)
    c.drawImage(m, PAGE_W - MARGIN - 62 * mm, 36 * mm, width=62 * mm, height=62 * mm, mask='auto',
                preserveAspectRatio=True)
    c.setFont('Pop600', 9)
    c.setFillColor(AMBER)
    c.drawString(MARGIN, 30 * mm, TEXT['inside'])
    c.setFont('Seg', 9.5)
    c.setFillColor(WHITE)
    for i, line in enumerate(TEXT['inside_lines']):
        c.drawString(MARGIN, 24 * mm - i * 13, line)
    c.setFont('Seg', 8.5)
    c.setFillColor(TEAL_L)
    c.drawRightString(PAGE_W - MARGIN, 12 * mm, TEXT['edition'])
    c.restoreState()

def draw_page(c, doc):
    c.saveState()
    c.setFillColor(TEAL)
    c.rect(0, PAGE_H - 6, PAGE_W, 6, stroke=0, fill=1)
    c.setFont('Pop600', 8)
    c.setFillColor(TEAL_D)
    c.drawString(MARGIN, PAGE_H - 13 * mm, 'KADEHUB')
    c.setFont('Seg', 8)
    c.setFillColor(MUTED)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 13 * mm, TEXT['header'])
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(MARGIN, 12.5 * mm, PAGE_W - MARGIN, 12.5 * mm)
    c.drawString(MARGIN, 8 * mm, TEXT['footer'])
    c.setFont('Pop600', 8.5)
    c.setFillColor(NAVY)
    c.drawRightString(PAGE_W - MARGIN, 8 * mm, str(doc.page))
    c.restoreState()


def build(story, out):
    Doc(out).multiBuild(story)
    print('Wrote', out)
