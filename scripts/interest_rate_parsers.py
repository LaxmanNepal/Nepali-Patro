"""Bank-specific parsers for official interest-rate pages.

The parser labels a rate only when the source text identifies its section.
Unknown layouts remain unclassified instead of being presented as facts.
"""
import re
PCT = re.compile(r"(?<![\d.])\d{1,2}(?:\.\d{1,4})?\s*%")

def pct(v): return f"{float(v.replace('%','').strip()):g}%"

def parse_sections(text, section_map):
    rates=[]; section=None
    for raw in text.splitlines():
        line=' '.join(raw.split()); upper=line.upper()
        if not line: continue
        for marker, name in section_map:
            if marker in upper: section=name; break
        if section:
            for m in PCT.findall(line):
                rates.append({'accountType':section,'label':line[:160],'rate':pct(m),'unit':'per-annum'})
    return rates

def nabil(text):
    return parse_sections(text,[('SAVINGS DEPOSITS','savings'),('FIXED DEPOSIT-NPR','fixed-deposit'),('SAVINGS DEPOSIT-FCY','fcy-savings'),('FIXED DEPOSIT-FCY','fcy-fixed-deposit'),('CALL DEPOSIT-FCY','call-deposit')])
def nmb(text):
    return parse_sections(text,[('SAVING DEPOSIT (LCY)','savings'),('FIXED DEPOSIT (NPR)','fixed-deposit'),('INTEREST RATE OF FOREIGN CURRENCY','fcy'),('INTEREST RATE ON LOAN','loan')])
def global_ime(text):
    return parse_sections(text,[('NPR SAVING DEPOSIT','savings'),('FIXED DEPOSIT','fixed-deposit'),('LOAN','loan')])
def nic_asia(text):
    return parse_sections(text,[('SAVING','savings'),('DEPOSIT','fixed-deposit'),('FIXED','fixed-deposit'),('FCY','fcy'),('LOAN','loan'),('BASE RATE','base-rate')])
def nepal_bank(text):
    return parse_sections(text,[('SAVING DEPOSIT','savings'),('FIXED DEPOSIT','fixed-deposit'),('TERM DEPOSIT','fixed-deposit'),('CALL DEPOSIT','call-deposit'),('LOAN','loan')])
def rbb(text):
    return parse_sections(text,[('SAVING','savings'),('FIXED DEPOSIT','fixed-deposit'),('TERM DEPOSIT','fixed-deposit'),('LOAN','loan'),('BASE RATE','base-rate')])
def sanima(text):
    return parse_sections(text,[('SAVING','savings'),('FIXED DEPOSIT','fixed-deposit'),('TERM DEPOSIT','fixed-deposit'),('REMITTANCE','remittance'),('FCY','fcy'),('LOAN','loan')])
def kumari(text):
    return parse_sections(text,[('SAVING','savings'),('FIXED DEPOSIT','fixed-deposit'),('TERM DEPOSIT','fixed-deposit'),('REMITTANCE','remittance'),('FCY','fcy'),('LOAN','loan')])
def prabhu(text):
    return parse_sections(text,[('SAVING','savings'),('FIXED DEPOSIT','fixed-deposit'),('TERM DEPOSIT','fixed-deposit'),('REMITTANCE','remittance'),('FCY','fcy'),('LOAN','loan')])
def siddhartha(text):
    return parse_sections(text,[('SAVING','savings'),('FIXED DEPOSIT','fixed-deposit'),('TERM DEPOSIT','fixed-deposit'),('REMITTANCE','remittance'),('FCY','fcy'),('LOAN','loan')])
def everest(text):
    return parse_sections(text,[('SAVING','savings'),('FIXED DEPOSIT','fixed-deposit'),('TERM DEPOSIT','fixed-deposit'),('REMITTANCE','remittance'),('FCY','fcy'),('LOAN','loan')])
def standard_chartered(text):
    return parse_sections(text,[('SAVINGS','savings'),('FIXED DEPOSIT','fixed-deposit'),('TIME DEPOSIT','fixed-deposit'),('FCY','fcy'),('LOAN','loan')])

PARSERS={
 'nabil-bank':nabil,'nic-asia-bank':nic_asia,'global-ime-bank':global_ime,
 'nepal-bank':nepal_bank,'nmb-bank':nmb,'rastriya-banijya-bank':rbb,
 'sanima-bank':sanima,'kumari-bank':kumari,'prabhu-bank':prabhu,
 'siddhartha-bank':siddhartha,'everest-bank':everest,
 'standard-chartered-bank-nepal':standard_chartered,
}
